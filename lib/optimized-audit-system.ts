import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Optimized audit event interface with all required fields
export interface OptimizedAuditEvent {
  event_type: AuditEventType
  user_id: string
  resource_type: string
  resource_id?: string | null
  action: string
  ip_address: string
  user_agent: string
  success: boolean
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  details: AuditDetails
  timestamp?: string
}

export type AuditEventType = 
  | 'data_access' 
  | 'data_modification' 
  | 'data_deletion' 
  | 'login_attempt'
  | 'logout' 
  | 'failed_access' 
  | 'export_data' 
  | 'print_data'
  | 'biomarker_extraction' 
  | 'lab_report_upload' 
  | 'health_alert_generated'
  | 'api_request'
  | 'security_event'
  | 'system_access'

export interface AuditDetails {
  // API Request Details
  api_endpoint?: string
  http_method?: string
  response_status?: number
  duration_ms?: number
  query_parameters?: Record<string, any>
  request_headers?: Record<string, string>
  
  // Request Body Information
  request_body?: any
  request_body_size?: number
  request_body_hash?: string
  parsing_error?: boolean
  
  // Operation Details
  operation_type?: string
  affected_fields?: string[]
  record_count?: number
  data_size?: number
  
  // Security Details
  session_id?: string
  request_id?: string
  encryption_used?: boolean
  authentication_method?: string
  
  // Error Information
  error_details?: any
  error_code?: string
  stack_trace?: string
  
  // Performance Metrics
  database_query_time?: number
  cache_hit?: boolean
  memory_usage?: number
  
  // Business Logic Details
  [key: string]: any
}

// Batch logging for performance optimization
class AuditBatchProcessor {
  private batch: OptimizedAuditEvent[] = []
  private batchSize = 20 // Reduced from 50 to process smaller batches more frequently
  private flushInterval = 10000 // Increased to 10 seconds to reduce frequency
  private timer: NodeJS.Timeout | null = null
  private lastFlush = 0
  private minFlushInterval = 5000 // Minimum 5 seconds between flushes
  
  // Global cache for duplicate detection across batches
  private recentEvents = new Map<string, number>()
  private eventCacheExpiry = 60000 // 1 minute cache for duplicate detection
  
  // Rate limiting for specific event types
  private securityEventLimiter = new Map<string, number>()
  private securityEventLimit = 5 // Max 5 security events per minute per type
  private securityEventWindow = 60000 // 1 minute window

  constructor() {
    this.startBatchTimer()
    this.startCleanupTimer()
  }

  add(event: OptimizedAuditEvent): void {
    const now = Date.now()
    
    // Enhanced duplicate detection with global cache
    const eventKey = this.generateEventKey(event)
    const lastEventTime = this.recentEvents.get(eventKey)
    
    // Check for duplicates in the last minute (global cache)
    if (lastEventTime && (now - lastEventTime) < 30000) {
      console.log('🔄 Skipping duplicate audit event:', eventKey)
      return
    }
    
    // Special rate limiting for security events
    if (event.event_type === 'security_event') {
      const securityKey = `${event.action}_${event.user_id}`
      const lastSecurityEvent = this.securityEventLimiter.get(securityKey) || 0
      
      // Reset counter if window has passed
      if (now - lastSecurityEvent > this.securityEventWindow) {
        this.securityEventLimiter.set(securityKey, 1)
      } else {
        const currentCount = this.securityEventLimiter.get(securityKey) || 0
        if (currentCount >= this.securityEventLimit) {
          console.log('🚫 Rate limiting security event:', securityKey)
          return
        }
        this.securityEventLimiter.set(securityKey, currentCount + 1)
      }
    }

    // Update global cache
    this.recentEvents.set(eventKey, now)

    this.batch.push({
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    })

    // Only flush if we have enough events AND enough time has passed
    if (this.batch.length >= this.batchSize && (now - this.lastFlush) > this.minFlushInterval) {
      this.flush()
    }
  }

  private generateEventKey(event: OptimizedAuditEvent): string {
    // More specific key generation for better duplicate detection
    if (event.event_type === 'security_event') {
      return `${event.user_id}_${event.action}_${event.resource_type}_${event.details?.ip || ''}`
    }
    return `${event.user_id}_${event.action}_${event.resource_type}`
  }

  private startCleanupTimer(): void {
    // Clean up old entries every 2 minutes
    setInterval(() => {
      const now = Date.now()
      
      // Clean up recent events cache
      Array.from(this.recentEvents.entries()).forEach(([key, timestamp]) => {
        if (now - timestamp > this.eventCacheExpiry) {
          this.recentEvents.delete(key)
        }
      })
      
      // Clean up security event limiter
      Array.from(this.securityEventLimiter.entries()).forEach(([key, timestamp]) => {
        if (now - timestamp > this.securityEventWindow) {
          this.securityEventLimiter.delete(key)
        }
      })
      
      console.log(`🧹 Cleaned up audit cache: ${this.recentEvents.size} recent events, ${this.securityEventLimiter.size} security limiters`)
    }, 120000) // Every 2 minutes
  }

  private startBatchTimer(): void {
    this.timer = setInterval(() => {
      if (this.batch.length > 0 && (Date.now() - this.lastFlush) > this.minFlushInterval) {
        this.flush()
      }
    }, this.flushInterval)
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return

    const now = Date.now()
    if (now - this.lastFlush < this.minFlushInterval) {
      console.log('⏳ Skipping flush - too soon since last flush')
      return
    }

    const eventsToProcess = [...this.batch]
    this.batch = []
    this.lastFlush = now

    try {
      // Add unique IDs to events
      const eventsWithIds = eventsToProcess.map(event => ({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...event
      }))

      const { error } = await supabase
        .from('audit_logs')
        .insert(eventsWithIds)

      if (error) {
        console.error('❌ Batch audit logging failed:', error)
        // Only re-add critical events to prevent infinite loops
        const criticalEvents = eventsToProcess.filter(event => 
          event.risk_level === 'critical' || !event.success
        )
        if (criticalEvents.length > 0) {
          this.batch.unshift(...criticalEvents)
        }
      } else {
        console.log(`✅ Batch audit logged: ${eventsWithIds.length} events`)
      }
    } catch (error) {
      console.error('❌ Audit batch processing error:', error)
      // Only re-add critical events to prevent infinite loops
      const criticalEvents = eventsToProcess.filter(event => 
        event.risk_level === 'critical' || !event.success
      )
      if (criticalEvents.length > 0) {
        this.batch.unshift(...criticalEvents)
      }
    }
  }

  async forceFlush(): Promise<void> {
    await this.flush()
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.forceFlush()
  }
}

// Global batch processor instance
const auditBatcher = new AuditBatchProcessor()

// Optimized audit logger class
export class OptimizedAuditLogger {
  private static instance: OptimizedAuditLogger
  private cache = new Map<string, any>()
  private cacheExpiry = 5 * 60 * 1000 // 5 minutes

  static getInstance(): OptimizedAuditLogger {
    if (!OptimizedAuditLogger.instance) {
      OptimizedAuditLogger.instance = new OptimizedAuditLogger()
    }
    return OptimizedAuditLogger.instance
  }

  // Main logging method with performance optimizations
  async logEvent(event: Partial<OptimizedAuditEvent>): Promise<void> {
    try {
      // Skip logging for certain low-value operations to reduce noise
      const skipLogging = this.shouldSkipLogging(event)
      if (skipLogging) {
        return
      }

      const optimizedEvent: OptimizedAuditEvent = {
        event_type: event.event_type || 'data_access',
        user_id: event.user_id || 'anonymous',
        resource_type: event.resource_type || 'unknown',
        resource_id: event.resource_id || null,
        action: event.action || 'unknown',
        ip_address: this.extractIpAddress(event.ip_address),
        user_agent: event.user_agent || 'unknown',
        success: event.success ?? true,
        risk_level: this.calculateRiskLevel(event),
        details: {
          timestamp: new Date().toISOString(),
          ...event.details
        }
      }

      // Add to batch for processing
      auditBatcher.add(optimizedEvent)

      // Log critical events immediately
      if (optimizedEvent.risk_level === 'critical' || !optimizedEvent.success) {
        await auditBatcher.forceFlush()
      }

    } catch (error) {
      console.error('❌ Audit logging error:', error)
    }
  }

  // Determine if we should skip logging this event to reduce noise
  private shouldSkipLogging(event: Partial<OptimizedAuditEvent>): boolean {
    // Skip frequent read operations on audit logs themselves to prevent recursive logging
    if (event.resource_type === 'audit_logs' && event.action === 'read') {
      // Only log every 10th audit log read to reduce noise
      return Math.random() > 0.1
    }

    // Skip health check and status endpoints
    const endpoint = event.details?.api_endpoint || ''
    if (endpoint.includes('/health') || endpoint.includes('/status') || endpoint.includes('/ping')) {
      return true
    }

    // Aggressive filtering for rate limit events
    if (event.event_type === 'security_event') {
      const action = event.action || ''
      
      // Skip rate limit events if they're too frequent (let the batch processor handle rate limiting)
      if (action.includes('rate_limit')) {
        // Only log 1 in 10 rate limit events to reduce noise
        return Math.random() > 0.1
      }
      
      // Skip other repetitive security events
      if (action.includes('security_threat_detected') || action.includes('suspicious_activity')) {
        // Only log 1 in 5 threat detection events
        return Math.random() > 0.2
      }
    }

    // Skip successful GET requests to common read-only endpoints (sample 20%)
    if (event.details?.http_method === 'GET' && event.success !== false) {
      const readOnlyEndpoints = ['/api/users', '/api/sleep-data', '/api/health-alerts', '/api/metrics']
      const isReadOnly = readOnlyEndpoints.some(ro => endpoint.includes(ro))
      if (isReadOnly) {
        return Math.random() > 0.2 // Only log 20% of successful read operations
      }
    }

    // Always log write operations, failures, and critical security events
    const writeOperations = ['POST', 'PUT', 'PATCH', 'DELETE']
    const isWriteOperation = writeOperations.includes(event.details?.http_method || '')
    const isFailure = event.success === false
    const isCriticalSecurityEvent = event.event_type === 'security_event' && 
      (event.risk_level === 'critical' || event.action?.includes('breach') || event.action?.includes('attack'))
    const isHighRisk = event.risk_level === 'high' || event.risk_level === 'critical'

    if (isWriteOperation || isFailure || isCriticalSecurityEvent || isHighRisk) {
      return false // Don't skip these important events
    }

    return false // Log everything else by default
  }

  // Calculate risk level based on event characteristics
  private calculateRiskLevel(event: Partial<OptimizedAuditEvent>): 'low' | 'medium' | 'high' | 'critical' {
    // Use provided risk level if available
    if (event.risk_level) {
      return event.risk_level
    }

    // Calculate based on event characteristics
    if (!event.success) {
      return 'high' // Failed operations are high risk
    }

    if (event.event_type === 'security_event') {
      return 'critical'
    }

    const writeOperations = ['POST', 'PUT', 'PATCH', 'DELETE']
    const isWriteOperation = writeOperations.includes(event.details?.http_method || '')
    
    if (isWriteOperation) {
      return 'medium' // Write operations are medium risk
    }

    return 'low' // Read operations are low risk
  }

  // Optimized API request logging
  async logAPIRequest(
    request: NextRequest,
    response: NextResponse,
    startTime: number,
    requestBody?: any,
    additionalDetails?: Record<string, any>
  ): Promise<void> {
    const endTime = Date.now()
    const duration = endTime - startTime

    const userId = this.extractUserId(request)
    const resourceType = this.getResourceType(request.nextUrl.pathname)
    const eventType = this.getEventType(request.method, request.nextUrl.pathname)
    const riskLevel = this.getRiskLevel(request.method, request.nextUrl.pathname, response.status)

    // Sanitize request body for logging
    const sanitizedBody = requestBody ? this.sanitizeRequestBody(requestBody, request.nextUrl.pathname) : null
    const bodySize = requestBody ? JSON.stringify(requestBody).length : 0

    const auditEvent: OptimizedAuditEvent = {
      event_type: eventType,
      user_id: userId || 'anonymous',
      resource_type: resourceType,
      resource_id: this.getResourceId(request.nextUrl.pathname),
      action: this.getAction(request.method, request.nextUrl.pathname),
      ip_address: this.extractIpAddress(request),
      user_agent: request.headers.get('user-agent') || 'unknown',
      success: response.status >= 200 && response.status < 400,
      risk_level: riskLevel,
      details: {
        api_endpoint: `${request.method} ${request.nextUrl.pathname}`,
        http_method: request.method,
        response_status: response.status,
        duration_ms: duration,
        query_parameters: Object.fromEntries(request.nextUrl.searchParams),
        request_headers: this.sanitizeHeaders(request.headers),
        request_body: sanitizedBody,
        request_body_size: bodySize,
        request_body_hash: bodySize > 0 ? this.hashData(JSON.stringify(requestBody)) : null,
        url: request.nextUrl.href,
        session_id: request.headers.get('x-session-id') || undefined,
        request_id: request.headers.get('x-request-id') || this.generateId(),
        ...additionalDetails
      }
    }

    await this.logEvent(auditEvent)
  }

  // Enhanced security event logging
  async logSecurityEvent(
    eventType: string,
    details: Record<string, any>,
    request?: NextRequest,
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'high'
  ): Promise<void> {
    const auditEvent: OptimizedAuditEvent = {
      event_type: 'security_event',
      user_id: request ? this.extractUserId(request) || 'anonymous' : 'system',
      resource_type: 'security',
      action: eventType,
      ip_address: this.extractIpAddress(request),
      user_agent: request?.headers.get('user-agent') || 'unknown',
      success: false, // Security events are typically failures/alerts
      risk_level: riskLevel,
      details: {
        security_event_type: eventType,
        timestamp: new Date().toISOString(),
        ...details
      }
    }

    await this.logEvent(auditEvent)
  }

  // Optimized data operation logging
  async logDataOperation(
    operation: 'create' | 'read' | 'update' | 'delete',
    resourceType: string,
    resourceId: string | null,
    userId: string,
    details: Record<string, any> = {},
    request?: NextRequest
  ): Promise<void> {
    const eventTypeMap = {
      create: 'data_modification',
      read: 'data_access',
      update: 'data_modification',
      delete: 'data_deletion'
    } as const

    const auditEvent: OptimizedAuditEvent = {
      event_type: eventTypeMap[operation],
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      action: operation,
      ip_address: this.extractIpAddress(request),
      user_agent: request?.headers.get('user-agent') || 'unknown',
      success: details.success ?? true,
      risk_level: this.getDataOperationRiskLevel(operation, resourceType),
      details: {
        operation_type: operation,
        affected_fields: details.affectedFields || [],
        record_count: details.recordCount || 1,
        data_size: details.dataSize || 0,
        ...details
      }
    }

    await this.logEvent(auditEvent)
  }

  // Utility methods
  private extractIpAddress(input?: NextRequest | string): string {
    // If input is already a string (IP address), return it
    if (typeof input === 'string') {
      return input || '127.0.0.1'
    }
    
    // If input is a NextRequest object, extract IP from headers
    if (input && typeof input === 'object' && input.headers) {
      return input.headers.get('x-forwarded-for') || 
             input.headers.get('x-real-ip') || 
             input.headers.get('cf-connecting-ip') || 
             '127.0.0.1'
    }
    
    // Default fallback
    return '127.0.0.1'
  }

  private extractUserId(request?: NextRequest): string | null {
    if (!request) return null
    
    // Try query parameters first
    const searchParams = request.nextUrl.searchParams
    let userId = searchParams.get('user_id')
    if (userId) return userId

    // Try path parameters
    const pathSegments = request.nextUrl.pathname.split('/').filter(Boolean)
    if (pathSegments.includes('users') && pathSegments.length >= 3) {
      const userIndex = pathSegments.indexOf('users')
      const potentialUserId = pathSegments[userIndex + 1]
      if (potentialUserId && !potentialUserId.includes('.')) {
        return potentialUserId
      }
    }

    // Try request body
    try {
      const bodyStr = request.headers.get('x-request-body')
      if (bodyStr) {
        const body = JSON.parse(bodyStr)
        if (body.user_id) return body.user_id
      }
    } catch {}

    return null
  }

  private getResourceType(pathname: string): string {
    const pathSegments = pathname.split('/').filter(Boolean)
    if (pathSegments.includes('api')) {
      const apiIndex = pathSegments.indexOf('api')
      const resourceSegment = pathSegments[apiIndex + 1]
      
      const resourceMap: Record<string, string> = {
        'users': 'users',
        'sleep-data': 'sleep_data',
        'lab-reports': 'lab_reports',
        'biomarkers': 'biomarkers',
        'health-alerts': 'health_alerts',
        'audit': 'audit_logs'
      }
      
      return resourceMap[resourceSegment] || resourceSegment || 'unknown'
    }
    return 'unknown'
  }

  private getEventType(method: string, pathname: string): AuditEventType {
    if (pathname.includes('/api/audit/')) return 'system_access'
    if (pathname.includes('/api/auth/')) return 'login_attempt'
    
    const isDataEndpoint = pathname.includes('/api/') && 
      !pathname.includes('/audit/') && 
      !pathname.includes('/auth/')
    
    if (!isDataEndpoint) return 'api_request'
    
    switch (method) {
      case 'GET': return 'data_access'
      case 'POST': return 'data_modification'
      case 'PUT':
      case 'PATCH': return 'data_modification'
      case 'DELETE': return 'data_deletion'
      default: return 'api_request'
    }
  }

  private getRiskLevel(method: string, pathname: string, responseStatus?: number): 'low' | 'medium' | 'high' | 'critical' {
    // Critical risk for failed operations
    if (responseStatus && responseStatus >= 500) return 'critical'
    if (responseStatus && responseStatus >= 400) return 'high'
    
    // High-risk operations
    if (method === 'DELETE') return 'high'
    if (pathname.includes('/export')) return 'high'
    if (pathname.includes('/admin')) return 'high'
    
    // Medium-risk operations
    if (pathname.includes('/lab-reports') && method === 'POST') return 'medium'
    if (pathname.includes('/biomarkers')) return 'medium'
    if (pathname.includes('/users') && (method === 'POST' || method === 'PUT')) return 'medium'
    
    // Low-risk operations
    if (method === 'GET' && pathname.includes('/audit')) return 'low'
    if (method === 'GET' && !pathname.includes('/users/')) return 'low'
    
    return 'medium'
  }

  private getDataOperationRiskLevel(operation: string, resourceType: string): 'low' | 'medium' | 'high' | 'critical' {
    if (operation === 'delete') return 'high'
    if (resourceType === 'users' && operation !== 'read') return 'medium'
    if (resourceType === 'lab_reports') return 'medium'
    if (resourceType === 'biomarkers') return 'medium'
    return 'low'
  }

  private getResourceId(pathname: string): string | null {
    const pathSegments = pathname.split('/').filter(Boolean)
    if (pathSegments.includes('api')) {
      const apiIndex = pathSegments.indexOf('api')
      if (pathSegments[apiIndex + 2] && !pathSegments[apiIndex + 2].includes('.')) {
        return pathSegments[apiIndex + 2]
      }
    }
    return null
  }

  private getAction(method: string, pathname: string): string {
    const pathSegments = pathname.split('/').filter(Boolean)
    const lastSegment = pathSegments[pathSegments.length - 1]
    
    // Special actions
    if (lastSegment === 'metrics') return 'view_metrics'
    if (lastSegment === 'export') return 'export_data'
    if (pathname.includes('/health-alerts')) {
      return method === 'POST' ? 'create_health_alert' : 'view_health_alerts'
    }
    
    // Standard CRUD actions
    const actionMap: Record<string, string> = {
      'GET': 'read',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete'
    }
    
    return actionMap[method] || 'access'
  }

  private sanitizeRequestBody(body: any, pathname: string): any {
    if (!body || typeof body !== 'object') return body

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential']
    const result = { ...body }

    // Remove sensitive fields
    for (const field of sensitiveFields) {
      if (field in result) {
        result[field] = '[REDACTED]'
      }
    }

    // Mask email addresses
    if (result.email && typeof result.email === 'string') {
      result.email = this.maskEmail(result.email)
    }

    return result
  }

  private sanitizeHeaders(headers: Headers): Record<string, string> {
    const safeHeaders = [
      'content-type', 'content-length', 'user-agent', 'accept', 
      'accept-language', 'accept-encoding', 'cache-control'
    ]
    
    const result: Record<string, string> = {}
    for (const header of safeHeaders) {
      const value = headers.get(header)
      if (value) {
        result[header] = value
      }
    }
    
    return result
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (!local || !domain) return email
    
    const maskedLocal = local.length > 2 
      ? local.substring(0, 2) + '*'.repeat(local.length - 2)
      : local
    
    return `${maskedLocal}@${domain}`
  }

  private hashData(data: string): string {
    // Simple hash for data integrity checking
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Cache management
  private getCached(key: string): any {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  private setCached(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    await auditBatcher.forceFlush()
    auditBatcher.destroy()
    this.cache.clear()
  }
}

// Export singleton instance
export const optimizedAuditLogger = OptimizedAuditLogger.getInstance()

// Graceful shutdown handling (Edge Runtime compatible)
if (typeof globalThis !== 'undefined' && typeof process !== 'undefined' && process.on) {
  process.on('SIGTERM', () => optimizedAuditLogger.cleanup());
  process.on('SIGINT', () => optimizedAuditLogger.cleanup());
}