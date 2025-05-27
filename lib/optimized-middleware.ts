import { NextRequest, NextResponse } from 'next/server'
import { optimizedAuditLogger } from './optimized-audit-system'

// Enhanced security headers with CSP
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
}

// Enhanced rate limiting with different tiers
const RATE_LIMIT_CONFIG = {
  // API endpoints
  '/api/users': { requests: 30, windowMs: 15 * 60 * 1000, tier: 'medium' },
  '/api/sleep-data': { requests: 60, windowMs: 15 * 60 * 1000, tier: 'high' },
  '/api/lab-reports': { requests: 10, windowMs: 60 * 60 * 1000, tier: 'low' },
  '/api/biomarkers': { requests: 40, windowMs: 15 * 60 * 1000, tier: 'medium' },
  '/api/health-alerts': { requests: 50, windowMs: 15 * 60 * 1000, tier: 'medium' },
  '/api/audit': { requests: 20, windowMs: 15 * 60 * 1000, tier: 'low' },
  '/api/': { requests: 100, windowMs: 15 * 60 * 1000, tier: 'default' }
}

// Enhanced rate limit store with Redis-like functionality
interface RateLimitEntry {
  count: number
  resetTime: number
  violations: number
  lastViolation?: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const suspiciousIPs = new Set<string>()

// Performance monitoring
interface PerformanceMetrics {
  requestCount: number
  averageResponseTime: number
  errorRate: number
  lastReset: number
}

const performanceMetrics: PerformanceMetrics = {
  requestCount: 0,
  averageResponseTime: 0,
  errorRate: 0,
  lastReset: Date.now()
}

// Enhanced rate limiting with violation tracking
function getRateLimitKey(ip: string, pathname: string): string {
  const route = Object.keys(RATE_LIMIT_CONFIG)
    .sort((a, b) => b.length - a.length) // Sort by length to match most specific first
    .find(route => pathname.startsWith(route)) || '/api/'
  return `${ip}:${route}`
}

function isRateLimited(ip: string, pathname: string): { limited: boolean; config?: any; entry?: RateLimitEntry } {
  const key = getRateLimitKey(ip, pathname)
  const route = Object.keys(RATE_LIMIT_CONFIG)
    .sort((a, b) => b.length - a.length)
    .find(route => pathname.startsWith(route)) || '/api/'
  const config = RATE_LIMIT_CONFIG[route as keyof typeof RATE_LIMIT_CONFIG]
  
  const now = Date.now()
  let entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime: now + config.windowMs, violations: 0 }
    rateLimitStore.set(key, entry)
    return { limited: false, config, entry }
  }

  if (entry.count >= config.requests) {
    entry.violations++
    entry.lastViolation = now
    
    // Mark IP as suspicious after multiple violations
    if (entry.violations >= 3) {
      suspiciousIPs.add(ip)
      
      // Only log rate limit violations at specific thresholds to reduce spam
      if (entry.violations === 3 || entry.violations === 10 || entry.violations % 25 === 0) {
        optimizedAuditLogger.logSecurityEvent('rate_limit_violations', {
          ip,
          violations: entry.violations,
          route,
          config: config.tier,
          threshold_reached: entry.violations
        }, undefined, 'high')
      }
    }
    
    return { limited: true, config, entry }
  }

  entry.count++
  return { limited: false, config, entry }
}

// Enhanced security pattern detection
const SECURITY_PATTERNS = {
  // Directory traversal
  directoryTraversal: /\.\.[\/\\]/g,
  
  // XSS attempts
  xssAttempts: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /expression\s*\(/gi
  ],
  
  // SQL injection (more specific patterns)
  sqlInjection: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|SET|WHERE)\b)/gi,
    /(--\s*[^\r\n]*|\/\*.*?\*\/)/g, // SQL comments but more specific
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
    /(\'\s*(OR|AND)\s*\')/gi,
    /(\bunion\b.*\bselect\b)/gi // Union-based injection
  ],
  
  // Command injection (more specific patterns to avoid false positives)
  commandInjection: [
    /(\|\||&&|;;|\$\(|\`)/g, // Avoid single & which is normal in query strings
    /(exec|eval|system|shell_exec)/gi,
    /(\|\s*\w+|\w+\s*\|)/g // Pipe with commands
  ],
  
  // Path manipulation
  pathManipulation: [
    /\.\.[\/\\]/g,
    /[\/\\]etc[\/\\]passwd/gi,
    /[\/\\]windows[\/\\]system32/gi
  ],
  
  // Suspicious user agents
  suspiciousUserAgents: [
    /sqlmap/gi,
    /nikto/gi,
    /nessus/gi,
    /burp/gi,
    /nmap/gi,
    /masscan/gi
  ]
}

function detectSecurityThreats(request: NextRequest): { threats: string[]; riskLevel: 'low' | 'medium' | 'high' | 'critical' } {
  const threats: string[] = []
  const pathname = request.nextUrl.pathname
  const queryString = request.nextUrl.search
  const userAgent = request.headers.get('user-agent') || ''
  
  // Skip security checks for audit endpoints to avoid false positives
  if (pathname.includes('/api/audit/')) {
    console.log('🔒 Skipping security checks for audit endpoint:', pathname)
    return { threats: [], riskLevel: 'low' }
  }
  
  // Check directory traversal
  if (SECURITY_PATTERNS.directoryTraversal.test(pathname) || 
      SECURITY_PATTERNS.directoryTraversal.test(queryString)) {
    threats.push('directory_traversal')
  }
  
  // Check XSS attempts
  for (const pattern of SECURITY_PATTERNS.xssAttempts) {
    if (pattern.test(pathname) || pattern.test(queryString) || pattern.test(userAgent)) {
      threats.push('xss_attempt')
      break
    }
  }
  
  // Check SQL injection
  for (const pattern of SECURITY_PATTERNS.sqlInjection) {
    if (pattern.test(pathname) || pattern.test(queryString)) {
      threats.push('sql_injection')
      break
    }
  }
  
  // Check command injection
  for (const pattern of SECURITY_PATTERNS.commandInjection) {
    if (pattern.test(pathname) || pattern.test(queryString)) {
      threats.push('command_injection')
      break
    }
  }
  
  // Check path manipulation
  for (const pattern of SECURITY_PATTERNS.pathManipulation) {
    if (pattern.test(pathname)) {
      threats.push('path_manipulation')
      break
    }
  }
  
  // Check suspicious user agents
  for (const pattern of SECURITY_PATTERNS.suspiciousUserAgents) {
    if (pattern.test(userAgent)) {
      threats.push('suspicious_user_agent')
      break
    }
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  if (threats.length >= 3) riskLevel = 'critical'
  else if (threats.includes('sql_injection') || threats.includes('command_injection')) riskLevel = 'critical'
  else if (threats.includes('xss_attempt') || threats.includes('directory_traversal')) riskLevel = 'high'
  else if (threats.length > 0) riskLevel = 'medium'
  
  return { threats, riskLevel }
}

// Sensitive file protection
const SENSITIVE_PATTERNS = [
  /\.env/i,
  /\.git/i,
  /\.sql$/i,
  /backup/i,
  /dump/i,
  /config\.json$/i,
  /\.key$/i,
  /\.pem$/i,
  /\.p12$/i,
  /password/i,
  /secret/i,
  /private/i
]

function isSensitiveFile(pathname: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(pathname))
}

// Performance monitoring
function updatePerformanceMetrics(responseTime: number, isError: boolean): void {
  const now = Date.now()
  
  // Reset metrics every hour
  if (now - performanceMetrics.lastReset > 60 * 60 * 1000) {
    performanceMetrics.requestCount = 0
    performanceMetrics.averageResponseTime = 0
    performanceMetrics.errorRate = 0
    performanceMetrics.lastReset = now
  }
  
  performanceMetrics.requestCount++
  
  // Update average response time
  performanceMetrics.averageResponseTime = 
    (performanceMetrics.averageResponseTime * (performanceMetrics.requestCount - 1) + responseTime) / 
    performanceMetrics.requestCount
  
  // Update error rate
  if (isError) {
    performanceMetrics.errorRate = 
      (performanceMetrics.errorRate * (performanceMetrics.requestCount - 1) + 1) / 
      performanceMetrics.requestCount
  } else {
    performanceMetrics.errorRate = 
      (performanceMetrics.errorRate * (performanceMetrics.requestCount - 1)) / 
      performanceMetrics.requestCount
  }
}

// Cleanup old entries
function cleanupStores(): void {
  const now = Date.now()
  
  // Cleanup rate limit store
  Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
    if (now > entry.resetTime && entry.violations === 0) {
      rateLimitStore.delete(key)
    }
  })
  
  // Cleanup suspicious IPs after 24 hours
  // Note: In production, this should be more sophisticated
  if (suspiciousIPs.size > 1000) {
    suspiciousIPs.clear()
  }
}

// Run cleanup every 10 minutes (Edge Runtime compatible)
if (typeof globalThis !== 'undefined' && typeof setInterval !== 'undefined') {
  setInterval(cleanupStores, 10 * 60 * 1000)
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Main middleware function
export async function optimizedMiddleware(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const pathname = request.nextUrl.pathname
  const method = request.method
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             request.headers.get('cf-connecting-ip') || 
             '127.0.0.1'

  // Generate unique request ID
  const requestId = generateRequestId()
  
  // Skip middleware for static files and health checks to reduce noise
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/favicon') || 
      pathname.includes('.') ||
      pathname === '/health' ||
      pathname === '/api/health') {
    return NextResponse.next()
  }

  // Determine if this request should be logged (reduce noise)
  const shouldLog = shouldLogRequest(pathname, method)
  
  try {
    // Rate limiting check
    const rateLimitResult = isRateLimited(ip, pathname)
    if (rateLimitResult.limited) {
      const retryAfter = Math.ceil((rateLimitResult.entry!.resetTime - Date.now()) / 1000)
      
      // Only log rate limit exceeded events at specific intervals to reduce spam
      if (shouldLog && rateLimitResult.entry!.violations >= 3) {
        // Only log every 5th rate limit exceeded event after 3 violations
        if (rateLimitResult.entry!.violations % 5 === 0) {
          await optimizedAuditLogger.logSecurityEvent('rate_limit_exceeded', {
            ip,
            pathname,
            method,
            violations: rateLimitResult.entry!.violations,
            tier: rateLimitResult.config!.tier,
            retryAfter,
            consecutive_blocks: Math.floor(rateLimitResult.entry!.violations / 5)
          }, request, 'medium')
        }
      }

      return new NextResponse(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retryAfter,
          requestId
        }),
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-Request-ID': requestId,
            ...securityHeaders
          }
        }
      )
    }

    // Security threat detection
    const securityResult = detectSecurityThreats(request)
    if (securityResult.threats.length > 0) {
      // Always log security threats regardless of shouldLog
      await optimizedAuditLogger.logSecurityEvent('security_threat_detected', {
        threats: securityResult.threats,
        riskLevel: securityResult.riskLevel,
        ip,
        pathname,
        method,
        userAgent: request.headers.get('user-agent'),
        queryString: request.nextUrl.search
      }, request, securityResult.riskLevel)

      return new NextResponse(
        JSON.stringify({ 
          error: 'Security violation detected',
          requestId
        }),
        { 
          status: 403,
          headers: {
            'X-Request-ID': requestId,
            ...securityHeaders
          }
        }
      )
    }

    // Check for sensitive file access
    if (isSensitiveFile(pathname)) {
      // Always log sensitive file access attempts
      await optimizedAuditLogger.logSecurityEvent('sensitive_file_access', {
        pathname,
        ip,
        userAgent: request.headers.get('user-agent')
      }, request, 'high')

      return new NextResponse(
        JSON.stringify({ 
          error: 'Access denied',
          requestId
        }),
        { 
          status: 403,
          headers: {
            'X-Request-ID': requestId,
            ...securityHeaders
          }
        }
      )
    }

    // Process the request
    const response = NextResponse.next()
    
    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    // Add request ID
    response.headers.set('X-Request-ID', requestId)

    // Performance monitoring
    const responseTime = Date.now() - startTime
    const isError = false
    updatePerformanceMetrics(responseTime, isError)

    // Log API request only if shouldLog is true
    if (shouldLog && pathname.startsWith('/api/')) {
      // Use setTimeout to make logging non-blocking
      setTimeout(async () => {
        try {
          // Capture request body for POST/PUT/PATCH requests
          let requestBody = undefined
          if (['POST', 'PUT', 'PATCH'].includes(method)) {
            try {
              // Clone the request to read the body without consuming it
              const clonedRequest = request.clone()
              const bodyText = await clonedRequest.text()
              if (bodyText) {
                requestBody = JSON.parse(bodyText)
              }
            } catch (error) {
              console.warn('Failed to capture request body:', error)
              requestBody = { error: 'Failed to parse request body' }
            }
          }

          await optimizedAuditLogger.logAPIRequest(
            request,
            response,
            startTime,
            requestBody, // Include request body for write operations
            {
              request_id: requestId,
              response_time: responseTime,
              rate_limit_tier: rateLimitResult.config?.tier,
              performance_score: responseTime < 1000 ? 100 : Math.max(0, 100 - (responseTime / 100)),
              middleware_logged: true,
              comprehensive_logging: ['POST', 'PUT', 'PATCH'].includes(method)
            }
          )
        } catch (error) {
          console.error('❌ Failed to log API request:', error)
        }
      }, 0)
    }

    return response

  } catch (error) {
    const responseTime = Date.now() - startTime
    updatePerformanceMetrics(responseTime, true)

    // Always log errors regardless of shouldLog
    await optimizedAuditLogger.logSecurityEvent('middleware_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      pathname,
      method,
      ip,
      responseTime
    }, request, 'high')

    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        requestId
      }),
      { 
        status: 500,
        headers: {
          'X-Request-ID': requestId,
          ...securityHeaders
        }
      }
    )
  }
}

// Determine if a request should be logged to reduce noise
function shouldLogRequest(pathname: string, method: string): boolean {
  // Never log security event endpoints to prevent infinite loops
  if (pathname.includes('/api/audit/security-event')) {
    return false
  }

  // For HIPAA compliance, we need to log ALL API requests
  // Only skip non-API requests to reduce noise
  if (pathname.startsWith('/api/')) {
    return true // Log ALL API requests for HIPAA compliance
  }

  // Don't log static files, health checks, etc.
  return false
}

// Export configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}

// Export performance metrics for monitoring
export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...performanceMetrics }
}

// Export rate limit status for debugging
export function getRateLimitStatus(ip: string): { [route: string]: RateLimitEntry | undefined } {
  const status: { [route: string]: RateLimitEntry | undefined } = {}
  
  for (const route of Object.keys(RATE_LIMIT_CONFIG)) {
    const key = `${ip}:${route}`
    status[route] = rateLimitStore.get(key)
  }
  
  return status
} 