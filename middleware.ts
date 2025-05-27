import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Security headers for HIPAA compliance
const securityHeaders = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',
  // Enforce HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Needed for Next.js
    "style-src 'self' 'unsafe-inline'", // Needed for Tailwind
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  // Permissions Policy (formerly Feature Policy)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()'
  ].join(', ')
}

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // API endpoints
  '/api/': { requests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  '/api/lab-reports': { requests: 10, windowMs: 60 * 1000 }, // 10 uploads per minute
  '/api/biomarkers': { requests: 50, windowMs: 60 * 1000 }, // 50 requests per minute
  // Authentication endpoints
  '/api/auth/': { requests: 5, windowMs: 15 * 60 * 1000 }, // 5 auth attempts per 15 minutes
}

function getRateLimitKey(ip: string, pathname: string): string {
  return `${ip}:${pathname}`
}

function isRateLimited(ip: string, pathname: string): boolean {
  // Find the most specific rate limit rule
  let config = RATE_LIMIT_CONFIG['/api/'] // Default
  
  for (const [path, pathConfig] of Object.entries(RATE_LIMIT_CONFIG)) {
    if (pathname.startsWith(path) && path.length > Object.keys(config).length) {
      config = pathConfig
    }
  }

  const key = getRateLimitKey(ip, pathname)
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    })
    return false
  }

  if (entry.count >= config.requests) {
    return true // Rate limited
  }

  entry.count++
  return false
}

function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Clean up rate limit store every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000)

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown'

  // Apply security headers to all responses
  const response = NextResponse.next()
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    if (isRateLimited(ip, pathname)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '900', // 15 minutes
            ...Object.fromEntries(Object.entries(securityHeaders))
          }
        }
      )
    }

    // Add rate limit headers
    const key = getRateLimitKey(ip, pathname)
    const entry = rateLimitStore.get(key)
    if (entry) {
      response.headers.set('X-RateLimit-Remaining', 
        String(Math.max(0, RATE_LIMIT_CONFIG['/api/'].requests - entry.count)))
      response.headers.set('X-RateLimit-Reset', 
        String(Math.ceil(entry.resetTime / 1000)))
    }
  }

  // Block access to sensitive files
  const sensitivePatterns = [
    /\.env/,
    /\.git/,
    /\.sql$/,
    /backup/i,
    /dump/i,
    /config\.json$/
  ]

  if (sensitivePatterns.some(pattern => pattern.test(pathname))) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Log suspicious activity
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /exec\(/i,  // Code injection
    /eval\(/i   // Code injection
  ]

  const queryString = request.nextUrl.search
  const userAgent = request.headers.get('user-agent') || ''
  
  if (suspiciousPatterns.some(pattern => 
    pattern.test(pathname) || 
    pattern.test(queryString) || 
    pattern.test(userAgent)
  )) {
    // Log security incident (in production, send to SIEM)
    console.warn('SECURITY ALERT:', {
      ip,
      pathname,
      queryString,
      userAgent,
      timestamp: new Date().toISOString(),
      type: 'SUSPICIOUS_REQUEST'
    })
    
    return new NextResponse('Bad Request', { status: 400 })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 