import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export interface SecurityContext {
  userId?: string
  ipAddress: string
  userAgent: string
  requestId: string
  timestamp: Date
}

export interface APISecurityOptions {
  requireAuth?: boolean
  allowedMethods?: string[]
  rateLimitKey?: string
  validateInput?: z.ZodSchema
  auditEventType?: string
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
}

// Input sanitization patterns
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
  /javascript:/gi, // JavaScript protocol
  /on\w+\s*=/gi, // Event handlers
  /expression\s*\(/gi, // CSS expressions
  /vbscript:/gi, // VBScript protocol
  /data:text\/html/gi, // Data URLs with HTML
  /&#x?[0-9a-f]+;?/gi, // HTML entities that could be used for XSS
]

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
  /(--|\/\*|\*\/|;)/g,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
  /(\b(OR|AND)\b\s+['"]\w+['"]?\s*=\s*['"]\w+['"]?)/gi,
]

export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    let sanitized = input

    // Remove dangerous patterns
    DANGEROUS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '')
    })

    // Check for SQL injection attempts
    SQL_INJECTION_PATTERNS.forEach(pattern => {
      if (pattern.test(sanitized)) {
        throw new Error('Potentially malicious input detected')
      }
    })

    return sanitized.trim()
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }

  if (input && typeof input === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeInput(key)] = sanitizeInput(value)
    }
    return sanitized
  }

  return input
}

export function createSecurityContext(request: NextRequest): SecurityContext {
  return {
    ipAddress: request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    requestId: crypto.randomUUID(),
    timestamp: new Date()
  }
}

export function withAPISecurity(
  handler: (request: NextRequest, context: SecurityContext, ...args: any[]) => Promise<NextResponse>,
  options: APISecurityOptions = {}
) {
  return async function(request: NextRequest, ...args: any[]): Promise<NextResponse> {
    const startTime = Date.now()
    const context = createSecurityContext(request)

    try {
      // Skip authentication checks since there's no auth system
      // Security checks would go here in a real system

      if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
        console.warn('Method not allowed:', { method: request.method, allowed: options.allowedMethods })
        return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
      }

      // Input validation and sanitization
      let body: any = null
      if (request.method !== 'GET' && request.method !== 'DELETE') {
        try {
          const rawBody = await request.text()
          if (rawBody) {
            body = JSON.parse(rawBody)
            body = sanitizeInput(body)

            // Validate with Zod schema if provided
            if (options.validateInput) {
              const validation = options.validateInput.safeParse(body)
              if (!validation.success) {
                await logSecurityEvent(context, 'input_validation_failed', {
                  errors: validation.error.errors
                })
                
                console.warn('Input validation failed:', { errors: validation.error.errors })
                
                return NextResponse.json(
                  { 
                    error: 'Invalid input data',
                    details: validation.error.errors
                  },
                  { status: 400 }
                )
              }
              body = validation.data
            }
          }
        } catch (error) {
          await logSecurityEvent(context, 'malformed_request', {
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          
          console.warn('Malformed request body:', { error: error instanceof Error ? error.message : 'Unknown error' })
          
          return NextResponse.json(
            { error: 'Malformed request body' },
            { status: 400 }
          )
        }
      }

      // Create new request with sanitized body
      const sanitizedRequest = body 
        ? new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(body)
          })
        : request

      // Execute the handler
      const response = await handler(sanitizedRequest, context, ...args)

      // Log successful request
      if (options.auditEventType) {
        console.log('API request successful:', {
          eventType: options.auditEventType,
          method: request.method,
          endpoint: new URL(request.url).pathname,
          responseCode: response.status,
          responseTime: Date.now() - startTime
        })
      }

      return response

    } catch (error) {
      // Log error
      await logSecurityEvent(context, 'api_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })

      // Log failed request
      if (options.auditEventType) {
        console.error('API request failed:', {
          eventType: options.auditEventType,
          method: request.method,
          endpoint: new URL(request.url).pathname,
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime: Date.now() - startTime
        })
      }

      return NextResponse.json(
        { 
          error: 'Internal server error',
          requestId: context.requestId
        },
        { status: 500 }
      )
    }
  }
}

async function logSecurityEvent(
  context: SecurityContext,
  eventType: string,
  details: Record<string, any>
): Promise<void> {
  console.warn('SECURITY EVENT:', {
    type: eventType,
    requestId: context.requestId,
    ip: context.ipAddress,
    userAgent: context.userAgent,
    timestamp: context.timestamp.toISOString(),
    details
  })

  // In production, send to SIEM system
  // await sendToSIEM({ eventType, context, details })
}

// Validation schemas for common API inputs
export const commonSchemas = {
  userId: z.string().uuid('Invalid user ID format'),
  
  sleepData: z.object({
    user_id: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    total_sleep_hours: z.number().min(0).max(24),
    time_in_bed: z.number().min(0).max(24),
    rem_percentage: z.number().min(0).max(100).optional()
  }),

  labReport: z.object({
    user_id: z.string().uuid(),
    name: z.string().min(1).max(255),
    file_type: z.enum(['pdf', 'jpg', 'jpeg', 'png'])
  }),

  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20)
  })
}

// CORS configuration for healthcare applications
export const healthcareCORS = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com' 
    : 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400' // 24 hours
}

export function addCORSHeaders(response: NextResponse): NextResponse {
  Object.entries(healthcareCORS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
} 