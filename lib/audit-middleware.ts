import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface AuditEventData {
  event_type: string
  user_id: string
  resource_type: string
  resource_id?: string | null
  action: string
  ip_address: string
  user_agent: string
  success: boolean
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  details?: Record<string, any>
}

// Enhanced function to log complete request data including body
export async function logCompleteAuditEvent(
  request: NextRequest,
  response: NextResponse,
  requestBody?: any,
  additionalDetails?: Record<string, any>
): Promise<void> {
  try {
    // Extract user ID from various sources
    const userId = extractUserId(request)
    const resourceType = getResourceTypeFromPath(request.nextUrl.pathname)
    const eventType = getEventType(request.method, request.nextUrl.pathname)
    const riskLevel = getRiskLevel(request.method, request.nextUrl.pathname)
    
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const endpoint = `${request.method} ${request.nextUrl.pathname}`
    
    // Determine success based on response status
    const success = response.status >= 200 && response.status < 400
    
    // Get query parameters
    const queryParams = Object.fromEntries(request.nextUrl.searchParams)
    
    // Prepare request body data for logging
    let bodyData: any = null
    let bodySize = 0
    
    if (requestBody) {
      try {
        // Sanitize sensitive data from body
        bodyData = sanitizeRequestBody(requestBody, request.nextUrl.pathname)
        bodySize = JSON.stringify(requestBody).length
      } catch (error) {
        console.warn('Failed to process request body for audit:', error)
        bodyData = { error: 'Failed to parse request body' }
      }
    }
    
    // Get request headers (sanitized)
    const requestHeaders = sanitizeHeaders(request.headers)
    
    // Create comprehensive audit log entry
    const auditData: AuditEventData = {
      event_type: eventType,
      user_id: userId || 'anonymous',
      resource_type: resourceType,
      resource_id: getResourceId(request.nextUrl.pathname, resourceType),
      action: getAction(request.method, request.nextUrl.pathname),
      ip_address: ip,
      user_agent: userAgent,
      success,
      risk_level: riskLevel,
      details: {
        api_endpoint: endpoint,
        http_method: request.method,
        response_status: response.status,
        query_parameters: queryParams,
        request_headers: requestHeaders,
        request_body: bodyData,
        request_body_size: bodySize,
        timestamp: new Date().toISOString(),
        url: request.nextUrl.href,
        ...additionalDetails
      }
    }
    
    // Insert into database
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        ...auditData,
        timestamp: new Date().toISOString()
      }])
    
    if (error) {
      console.error('Failed to log complete audit event:', error)
    } else {
      console.log('✅ Complete audit logged:', {
        endpoint,
        user: userId || 'anonymous',
        status: response.status,
        bodySize: bodySize > 0 ? `${bodySize} bytes` : 'no body',
        success
      })
    }
    
  } catch (error) {
    console.error('Error in complete audit logging:', error)
  }
}

export async function logAuditEventFromMiddleware(
  request: NextRequest,
  response: NextResponse,
  additionalDetails?: Record<string, any>
): Promise<void> {
  try {
    // Extract audit data from middleware headers
    const userId = request.headers.get('x-audit-user-id') || 'anonymous'
    const resourceType = request.headers.get('x-audit-resource-type') || 'unknown'
    const eventType = request.headers.get('x-audit-event-type') || 'data_access'
    const riskLevel = request.headers.get('x-audit-risk-level') as 'low' | 'medium' | 'high' | 'critical' || 'medium'
    const startTime = parseInt(request.headers.get('x-audit-start-time') || '0')
    const ip = request.headers.get('x-audit-ip') || 'unknown'
    const userAgent = request.headers.get('x-audit-user-agent') || 'unknown'
    const endpoint = request.headers.get('x-audit-endpoint') || `${request.method} ${request.nextUrl.pathname}`
    
    const endTime = Date.now()
    const duration = startTime ? endTime - startTime : 0
    
    // Determine success based on response status
    const success = response.status < 400
    
    // Get query parameters
    const queryParams = Object.fromEntries(request.nextUrl.searchParams)
    
    // Create audit log entry
    const auditData: AuditEventData = {
      event_type: eventType,
      user_id: userId,
      resource_type: resourceType,
      resource_id: null,
      action: endpoint,
      ip_address: ip,
      user_agent: userAgent,
      success,
      risk_level: riskLevel,
      details: {
        api_endpoint: endpoint,
        http_method: request.method,
        response_status: response.status,
        duration_ms: duration,
        query_params: queryParams,
        timestamp: new Date().toISOString(),
        ...additionalDetails
      }
    }
    
    // Insert into database
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        ...auditData,
        timestamp: new Date().toISOString()
      }])
    
    if (error) {
      console.error('Failed to log audit event:', error)
    }
    
  } catch (error) {
    console.error('Error in audit logging:', error)
  }
}

export async function logAuditEvent(auditData: Partial<AuditEventData>): Promise<void> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        event_type: auditData.event_type || 'data_access',
        user_id: auditData.user_id || 'anonymous',
        resource_type: auditData.resource_type || 'unknown',
        resource_id: auditData.resource_id || null,
        action: auditData.action || 'unknown',
        ip_address: auditData.ip_address || 'unknown',
        user_agent: auditData.user_agent || 'unknown',
        success: auditData.success ?? true,
        risk_level: auditData.risk_level || 'medium',
        details: auditData.details || {},
        timestamp: new Date().toISOString()
      }])
    
    if (error) {
      console.error('Failed to log audit event:', error)
    }
  } catch (error) {
    console.error('Error in audit logging:', error)
  }
}

// Helper functions for data extraction and processing

function extractUserId(request: NextRequest): string | null {
  // Try to get user ID from query parameters
  const searchParams = request.nextUrl.searchParams
  let userId = searchParams.get('user_id')
  
  if (userId) return userId
  
  // Try to get from path parameters (e.g., /api/users/[id])
  const pathSegments = request.nextUrl.pathname.split('/').filter(Boolean)
  if (pathSegments.includes('users') && pathSegments.length >= 3) {
    const userIndex = pathSegments.indexOf('users')
    const potentialUserId = pathSegments[userIndex + 1]
    // Basic validation - should be a valid ID format
    if (potentialUserId && potentialUserId.length > 0 && !potentialUserId.includes('.')) {
      return potentialUserId
    }
  }
  
  return null
}

function getResourceTypeFromPath(pathname: string): string {
  const pathSegments = pathname.split('/').filter(Boolean)
  
  if (pathSegments.includes('api')) {
    const apiIndex = pathSegments.indexOf('api')
    const resourceSegment = pathSegments[apiIndex + 1]
    
    switch (resourceSegment) {
      case 'users': return 'users'
      case 'sleep-data': return 'sleep_data'
      case 'lab-reports': return 'lab_reports'
      case 'biomarkers': return 'biomarkers'
      case 'health-alerts': return 'health_alerts'
      case 'audit': return 'audit_logs'
      default: return resourceSegment || 'unknown'
    }
  }
  
  return 'unknown'
}

function getEventType(method: string, pathname: string): string {
  const isDataEndpoint = pathname.includes('/api/') && 
    !pathname.includes('/audit/') && 
    !pathname.includes('/auth/')
  
  if (!isDataEndpoint) return 'data_access'
  
  switch (method) {
    case 'GET': return 'data_access'
    case 'POST': return 'data_modification'
    case 'PUT':
    case 'PATCH': return 'data_modification'
    case 'DELETE': return 'data_deletion'
    default: return 'data_access'
  }
}

function getRiskLevel(method: string, pathname: string): 'low' | 'medium' | 'high' | 'critical' {
  // High-risk operations
  if (method === 'DELETE') return 'high'
  if (pathname.includes('/export')) return 'high'
  if (pathname.includes('/lab-reports') && method === 'POST') return 'medium'
  if (pathname.includes('/biomarkers')) return 'medium'
  if (pathname.includes('/users') && (method === 'POST' || method === 'PUT')) return 'medium'
  
  // Low-risk operations
  if (method === 'GET' && pathname.includes('/audit')) return 'low'
  
  // Default medium risk for health data
  return 'medium'
}

function getResourceId(pathname: string, resourceType: string): string | null {
  const pathSegments = pathname.split('/').filter(Boolean)
  
  if (pathSegments.includes('api')) {
    const apiIndex = pathSegments.indexOf('api')
    const resourceSegment = pathSegments[apiIndex + 1]
    
    if (resourceSegment === resourceType.replace('_', '-') && pathSegments[apiIndex + 2]) {
      return pathSegments[apiIndex + 2]
    }
  }
  
  return null
}

function getAction(method: string, pathname: string): string {
  const pathSegments = pathname.split('/').filter(Boolean)
  const lastSegment = pathSegments[pathSegments.length - 1]
  
  // Special actions based on path
  if (lastSegment === 'metrics') return 'view_metrics'
  if (lastSegment === 'export') return 'export_data'
  if (pathname.includes('/health-alerts')) return method === 'POST' ? 'create_health_alert' : 'view_health_alerts'
  
  // Standard CRUD actions
  switch (method) {
    case 'GET': return 'read'
    case 'POST': return 'create'
    case 'PUT':
    case 'PATCH': return 'update'
    case 'DELETE': return 'delete'
    default: return 'access'
  }
}

function sanitizeRequestBody(body: any, pathname: string): any {
  if (!body || typeof body !== 'object') {
    return body
  }
  
  const sanitized = { ...body }
  
  // Remove or mask sensitive fields
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'credential',
    'ssn', 'social_security', 'credit_card', 'card_number'
  ]
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]'
    }
  }
  
  // For health data, we can log most fields but be careful with PII
  if (pathname.includes('/users')) {
    // Mask email partially for privacy
    if (sanitized.email) {
      const email = sanitized.email
      const [local, domain] = email.split('@')
      if (local && domain) {
        sanitized.email = `${local.substring(0, 2)}***@${domain}`
      }
    }
  }
  
  return sanitized
}

function sanitizeHeaders(headers: Headers): Record<string, string> {
  const sanitized: Record<string, string> = {}
  
  // Only include safe headers
  const safeHeaders = [
    'content-type', 'content-length', 'user-agent', 'accept',
    'accept-language', 'accept-encoding', 'cache-control'
  ]
  
  for (const header of safeHeaders) {
    const value = headers.get(header)
    if (value) {
      sanitized[header] = value
    }
  }
  
  return sanitized
} 