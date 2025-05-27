import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { optimizedAuditLogger } from './optimized-audit-system'

// Enhanced API response interface
export interface OptimizedAPIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  metadata?: {
    requestId: string
    timestamp: string
    responseTime: number
    cached?: boolean
    version?: string
  }
  pagination?: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// API handler configuration
export interface APIHandlerConfig {
  // Security
  requireAuth?: boolean
  allowedMethods?: string[]
  rateLimit?: {
    requests: number
    windowMs: number
  }
  
  // Validation
  querySchema?: z.ZodSchema
  bodySchema?: z.ZodSchema
  paramsSchema?: z.ZodSchema
  
  // Caching
  cache?: {
    enabled: boolean
    ttl: number // Time to live in milliseconds
    key?: (request: NextRequest) => string
  }
  
  // Audit logging
  auditConfig?: {
    eventType: string
    resourceType: string
    riskLevel?: 'low' | 'medium' | 'high' | 'critical'
    logRequestBody?: boolean
    logResponseBody?: boolean
  }
  
  // Performance
  timeout?: number
  maxRequestSize?: number
}

// Enhanced context for API handlers
export interface APIContext {
  requestId: string
  startTime: number
  userId?: string
  ip: string
  userAgent: string
  method: string
  pathname: string
  query: Record<string, any>
  params?: Record<string, any>
  body?: any
  cache: Map<string, any>
}

// Cache implementation
class APICache {
  private cache = new Map<string, { data: any; expiry: number }>()
  private maxSize = 1000

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  set(key: string, data: any, ttl: number): void {
    // Clean up if cache is too large
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

const apiCache = new APICache()

// Input sanitization
function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
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

// Generate cache key
function generateCacheKey(request: NextRequest, customKey?: (req: NextRequest) => string): string {
  if (customKey) {
    return customKey(request)
  }
  
  const url = request.nextUrl
  const method = request.method
  const query = url.searchParams.toString()
  
  return `${method}:${url.pathname}${query ? `?${query}` : ''}`
}

// Extract user ID from request
function extractUserId(request: NextRequest, context: APIContext): string | null {
  // Try query parameters
  if (context.query.user_id) return context.query.user_id
  
  // Try path parameters
  const pathSegments = context.pathname.split('/').filter(Boolean)
  if (pathSegments.includes('users') && pathSegments.length >= 3) {
    const userIndex = pathSegments.indexOf('users')
    const potentialUserId = pathSegments[userIndex + 1]
    if (potentialUserId && !potentialUserId.includes('.')) {
      return potentialUserId
    }
  }
  
  // Try request body
  if (context.body?.user_id) return context.body.user_id
  
  return null
}

// Main API wrapper function
export function withOptimizedAPI<T = any>(
  handler: (request: NextRequest, context: APIContext) => Promise<OptimizedAPIResponse<T>>,
  config: APIHandlerConfig = {}
) {
  return async function(request: NextRequest, routeParams?: any): Promise<NextResponse> {
    const startTime = Date.now()
    const requestId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create context
    const context: APIContext = {
      requestId,
      startTime,
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      method: request.method,
      pathname: request.nextUrl.pathname,
      query: Object.fromEntries(request.nextUrl.searchParams),
      cache: new Map()
    }

    let response: NextResponse
    let responseData: OptimizedAPIResponse<T> | null = null
    let error: Error | null = null

    try {
      // 1. METHOD VALIDATION
      if (config.allowedMethods && !config.allowedMethods.includes(request.method)) {
        throw new Error(`Method ${request.method} not allowed`)
      }

      // 2. REQUEST SIZE VALIDATION
      if (config.maxRequestSize) {
        const contentLength = request.headers.get('content-length')
        if (contentLength && parseInt(contentLength) > config.maxRequestSize) {
          throw new Error('Request too large')
        }
      }

      // 3. PARSE AND VALIDATE REQUEST DATA
      
      // Parse route parameters
      if (routeParams?.params) {
        context.params = await routeParams.params
      }

      // Parse and validate query parameters
      if (config.querySchema) {
        const queryValidation = config.querySchema.safeParse(context.query)
        if (!queryValidation.success) {
          throw new Error(`Invalid query parameters: ${queryValidation.error.message}`)
        }
        context.query = queryValidation.data
      }

      // Parse and validate request body
      if (request.method !== 'GET' && request.method !== 'DELETE') {
        try {
          const rawBody = await request.text()
          if (rawBody) {
            context.body = JSON.parse(rawBody)
            context.body = sanitizeInput(context.body)

            if (config.bodySchema) {
              const bodyValidation = config.bodySchema.safeParse(context.body)
              if (!bodyValidation.success) {
                throw new Error(`Invalid request body: ${bodyValidation.error.message}`)
              }
              context.body = bodyValidation.data
            }
          }
        } catch (parseError) {
          if (parseError instanceof SyntaxError) {
            throw new Error('Invalid JSON in request body')
          }
          throw parseError
        }
      }

      // Validate path parameters
      if (config.paramsSchema && context.params) {
        const paramsValidation = config.paramsSchema.safeParse(context.params)
        if (!paramsValidation.success) {
          throw new Error(`Invalid path parameters: ${paramsValidation.error.message}`)
        }
        context.params = paramsValidation.data
      }

      // Extract user ID
      context.userId = extractUserId(request, context)

      // 4. CACHING
      let cacheKey: string | null = null
      let cachedResponse: any = null
      
      if (config.cache?.enabled && request.method === 'GET') {
        cacheKey = generateCacheKey(request, config.cache.key)
        cachedResponse = apiCache.get(cacheKey)
        
        if (cachedResponse) {
          responseData = {
            ...cachedResponse,
            metadata: {
              ...cachedResponse.metadata,
              cached: true,
              responseTime: Date.now() - startTime
            }
          }
          
          response = NextResponse.json(responseData, { status: 200 })
          
          // Log cache hit
          await optimizedAuditLogger.logAPIRequest(
            request,
            response,
            startTime,
            context.body,
            {
              request_id: requestId,
              cache_hit: true,
              user_id: context.userId
            }
          )
          
          return response
        }
      }

      // 5. EXECUTE HANDLER WITH TIMEOUT
      let handlerPromise = handler(request, context)
      
      if (config.timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), config.timeout)
        })
        handlerPromise = Promise.race([handlerPromise, timeoutPromise])
      }

      responseData = await handlerPromise

      // 6. ENHANCE RESPONSE METADATA
      const responseTime = Date.now() - startTime
      responseData.metadata = {
        requestId,
        timestamp: new Date().toISOString(),
        responseTime,
        cached: false,
        version: '1.0',
        ...responseData.metadata
      }

      // 7. CACHE SUCCESSFUL RESPONSES
      if (config.cache?.enabled && 
          request.method === 'GET' && 
          responseData.success && 
          cacheKey) {
        apiCache.set(cacheKey, responseData, config.cache.ttl)
      }

      // 8. CREATE HTTP RESPONSE
      const status = responseData.success ? 200 : 400
      response = NextResponse.json(responseData, { status })

    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error')
      const responseTime = Date.now() - startTime
      
      responseData = {
        success: false,
        error: error.message,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          responseTime
        }
      }

      // Determine error status code
      let status = 500
      if (error.message.includes('not allowed')) status = 405
      else if (error.message.includes('Invalid')) status = 400
      else if (error.message.includes('timeout')) status = 408
      else if (error.message.includes('too large')) status = 413
      else if (error.message.includes('not found')) status = 404
      else if (error.message.includes('unauthorized')) status = 401
      else if (error.message.includes('forbidden')) status = 403

      response = NextResponse.json(responseData, { status })
    }

    // 9. AUDIT LOGGING
    try {
      if (config.auditConfig) {
        const auditDetails: Record<string, any> = {
          request_id: requestId,
          operation_type: config.auditConfig.eventType,
          response_time: responseData?.metadata?.responseTime || 0,
          cache_hit: responseData?.metadata?.cached || false,
          user_id: context.userId
        }

        // Add request body if configured
        if (config.auditConfig.logRequestBody && context.body) {
          auditDetails.request_body = context.body
          auditDetails.request_body_size = JSON.stringify(context.body).length
        }

        // Add response body if configured and successful
        if (config.auditConfig.logResponseBody && responseData?.success && responseData.data) {
          auditDetails.response_data_size = JSON.stringify(responseData.data).length
          auditDetails.record_count = Array.isArray(responseData.data) ? responseData.data.length : 1
        }

        // Add error details if failed
        if (error) {
          auditDetails.error_details = error.message
          auditDetails.error_code = response.status.toString()
        }

        await optimizedAuditLogger.logAPIRequest(
          request,
          response,
          startTime,
          context.body,
          auditDetails
        )
      } else {
        // Default audit logging
        await optimizedAuditLogger.logAPIRequest(
          request,
          response,
          startTime,
          context.body,
          {
            request_id: requestId,
            user_id: context.userId,
            cache_hit: responseData?.metadata?.cached || false
          }
        )
      }
    } catch (auditError) {
      console.error('❌ Audit logging failed:', auditError)
    }

    // 10. ADD RESPONSE HEADERS
    response.headers.set('X-Request-ID', requestId)
    response.headers.set('X-Response-Time', `${responseData?.metadata?.responseTime || 0}ms`)
    response.headers.set('X-Cache-Status', responseData?.metadata?.cached ? 'HIT' : 'MISS')
    
    return response
  }
}

// Specialized wrappers for common patterns

// Data access wrapper (GET operations)
export function withDataAccess<T = any>(
  handler: (request: NextRequest, context: APIContext) => Promise<T>,
  config: Omit<APIHandlerConfig, 'allowedMethods' | 'auditConfig'> & {
    resourceType: string
    cacheTTL?: number
  }
) {
  return withOptimizedAPI<T>(
    async (request, context) => {
      try {
        const data = await handler(request, context)
        return {
          success: true,
          data,
          message: 'Data retrieved successfully'
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to retrieve data'
        }
      }
    },
    {
      ...config,
      allowedMethods: ['GET'],
      cache: config.cacheTTL ? {
        enabled: true,
        ttl: config.cacheTTL
      } : undefined,
      auditConfig: {
        eventType: 'data_access',
        resourceType: config.resourceType,
        riskLevel: 'low',
        logRequestBody: false,
        logResponseBody: false
      }
    }
  )
}

// Data modification wrapper (POST/PUT/PATCH operations)
export function withDataModification<T = any>(
  handler: (request: NextRequest, context: APIContext) => Promise<T>,
  config: Omit<APIHandlerConfig, 'allowedMethods' | 'auditConfig'> & {
    resourceType: string
    operation: 'create' | 'update'
  }
) {
  return withOptimizedAPI<T>(
    async (request, context) => {
      try {
        const data = await handler(request, context)
        
        // Clear related cache entries
        // In a real implementation, you'd have more sophisticated cache invalidation
        apiCache.clear()
        
        return {
          success: true,
          data,
          message: `${config.operation === 'create' ? 'Created' : 'Updated'} successfully`
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : `Failed to ${config.operation}`
        }
      }
    },
    {
      ...config,
      allowedMethods: config.operation === 'create' ? ['POST'] : ['PUT', 'PATCH'],
      auditConfig: {
        eventType: 'data_modification',
        resourceType: config.resourceType,
        riskLevel: 'medium',
        logRequestBody: true,
        logResponseBody: true
      }
    }
  )
}

// Data deletion wrapper (DELETE operations)
export function withDataDeletion<T = any>(
  handler: (request: NextRequest, context: APIContext) => Promise<T>,
  config: Omit<APIHandlerConfig, 'allowedMethods' | 'auditConfig'> & {
    resourceType: string
  }
) {
  return withOptimizedAPI<T>(
    async (request, context) => {
      try {
        const data = await handler(request, context)
        
        // Clear related cache entries
        apiCache.clear()
        
        return {
          success: true,
          data,
          message: 'Deleted successfully'
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete'
        }
      }
    },
    {
      ...config,
      allowedMethods: ['DELETE'],
      auditConfig: {
        eventType: 'data_deletion',
        resourceType: config.resourceType,
        riskLevel: 'high',
        logRequestBody: false,
        logResponseBody: true
      }
    }
  )
}

// Export cache utilities for monitoring
export const cacheUtils = {
  getSize: () => apiCache.size(),
  clear: () => apiCache.clear(),
  delete: (key: string) => apiCache.delete(key)
}