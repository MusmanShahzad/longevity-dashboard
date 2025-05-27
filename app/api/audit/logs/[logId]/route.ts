import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withDataAccess } from '@/lib/optimized-api-wrapper'

// Validation schema for log ID parameter
const logIdSchema = z.object({
  logId: z.string().min(1, 'Log ID is required')
})

// Enhanced interfaces for type safety
interface AuditLogDetails {
  api_endpoint?: string
  http_method?: string
  response_status?: number
  duration_ms?: number
  query_parameters?: Record<string, any>
  request_headers?: Record<string, string>
  request_body?: any
  request_body_size?: number
  request_body_hash?: string
  session_id?: string
  request_id?: string
  encryption_used?: boolean
  error_details?: any
  error_code?: string
  cache_hit?: boolean
  performance_metrics?: Record<string, any>
  security_context?: Record<string, any>
  [key: string]: any
}

interface SecurityAnalysis {
  threat_level: 'low' | 'medium' | 'high' | 'critical'
  anomaly_score: number
  flags: string[]
  recommendations: string[]
  risk_factors: {
    failed_attempts: number
    off_hours_access: boolean
    bulk_operations: boolean
    high_risk_event: boolean
    suspicious_patterns: string[]
  }
}

interface RelatedEvent {
  id: string
  event_type: string
  action: string
  timestamp: string
  success: boolean
  risk_level: string
  resource_type: string
}

interface EnhancedAuditLog {
  id: string
  created_at: string
  timestamp?: string
  event_type: string
  user_id: string
  resource_type: string
  resource_id?: string
  action: string
  ip_address: string
  user_agent: string
  success: boolean
  risk_level: string
  duration_ms?: number
  cache_hit?: boolean
  threat_level?: string
  details?: AuditLogDetails
  related_events: RelatedEvent[]
  security_analysis: SecurityAnalysis
  context: {
    time_of_day: string
    day_of_week: string
    is_business_hours: boolean
    session_duration?: number
    geographic_location?: string
  }
}

// GET /api/audit/logs/[logId] - Get specific audit log with comprehensive analysis
export const GET = withDataAccess(
  async (request, context) => {
    const { logId } = context.params!

    // Fetch the specific audit log
    const { data: log, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', logId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Audit log not found')
      }
      throw new Error(`Failed to fetch audit log: ${error.message}`)
    }

    // Fetch related events (events from same user within 2 hours)
    const logTime = new Date(log.timestamp || log.created_at)
    const twoHoursBefore = new Date(logTime.getTime() - 2 * 60 * 60 * 1000)
    const twoHoursAfter = new Date(logTime.getTime() + 2 * 60 * 60 * 1000)

    const { data: relatedEvents } = await supabase
      .from('audit_logs')
      .select('id, event_type, action, timestamp, success, risk_level, resource_type')
      .eq('user_id', log.user_id)
      .neq('id', logId)
      .gte('timestamp', twoHoursBefore.toISOString())
      .lte('timestamp', twoHoursAfter.toISOString())
      .order('timestamp', { ascending: false })
      .limit(20)

    // Fetch user session context (events from same IP within 24 hours)
    const twentyFourHoursAgo = new Date(logTime.getTime() - 24 * 60 * 60 * 1000)
    const { data: sessionEvents } = await supabase
      .from('audit_logs')
      .select('timestamp, event_type, success')
      .eq('ip_address', log.ip_address)
      .gte('timestamp', twentyFourHoursAgo.toISOString())
      .lte('timestamp', logTime.toISOString())
      .order('timestamp', { ascending: true })

    // Generate comprehensive security analysis
    const securityAnalysis = await generateAdvancedSecurityAnalysis(
      log, 
      relatedEvents || [], 
      sessionEvents || []
    )

    // Generate contextual information
    const logContext = generateLogContext(log, sessionEvents || [])

    // Build enhanced audit log response
    const enhancedLog: EnhancedAuditLog = {
      id: log.id,
      created_at: log.created_at,
      timestamp: log.timestamp,
      event_type: log.event_type,
      user_id: log.user_id,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      action: log.action,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      success: log.success,
      risk_level: log.risk_level,
      duration_ms: log.duration_ms,
      cache_hit: log.cache_hit,
      threat_level: log.threat_level,
      details: log.details,
      related_events: (relatedEvents || []).map(event => ({
        id: event.id,
        event_type: event.event_type,
        action: event.action,
        timestamp: event.timestamp,
        success: event.success,
        risk_level: event.risk_level,
        resource_type: event.resource_type
      })),
      security_analysis: securityAnalysis,
      context: logContext
    }

    return {
      log: enhancedLog,
      metadata: {
        related_events_count: relatedEvents?.length || 0,
        session_events_count: sessionEvents?.length || 0,
        analysis_timestamp: new Date().toISOString()
      }
    }
  },
  {
    resourceType: 'audit_logs',
    paramsSchema: logIdSchema,
    cacheTTL: 30 * 1000, // Cache for 30 seconds
    maxRequestSize: 1024,
    timeout: 10000
  }
)

// Advanced security analysis with machine learning-like patterns
async function generateAdvancedSecurityAnalysis(
  log: any, 
  relatedEvents: any[], 
  sessionEvents: any[]
): Promise<SecurityAnalysis> {
  const flags: string[] = []
  const recommendations: string[] = []
  let anomalyScore = 0
  let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

  // Risk factors tracking
  const riskFactors = {
    failed_attempts: 0,
    off_hours_access: false,
    bulk_operations: false,
    high_risk_event: false,
    suspicious_patterns: [] as string[]
  }

  // 1. ANALYZE CURRENT LOG
  
  // Failed operation analysis
  if (!log.success) {
    flags.push('Failed operation detected')
    anomalyScore += 25
    riskFactors.failed_attempts = 1
    recommendations.push('Investigate cause of operation failure')
  }

  // High-risk event types
  const highRiskEvents = ['data_deletion', 'export_data', 'failed_access', 'security_event']
  if (highRiskEvents.includes(log.event_type)) {
    flags.push(`High-risk event type: ${log.event_type}`)
    anomalyScore += 30
    riskFactors.high_risk_event = true
    recommendations.push('Review authorization for high-risk operations')
  }

  // Critical risk level from original assessment
  if (log.risk_level === 'critical') {
    flags.push('Critical risk level assigned')
    anomalyScore += 50
    threatLevel = 'critical'
    recommendations.push('Immediate security review required')
  } else if (log.risk_level === 'high') {
    flags.push('High risk level assigned')
    anomalyScore += 30
  }

  // Performance anomalies
  if (log.duration_ms && log.duration_ms > 10000) {
    flags.push('Unusually slow response time')
    anomalyScore += 15
    riskFactors.suspicious_patterns.push('performance_anomaly')
    recommendations.push('Investigate system performance issues')
  }

  // 2. ANALYZE RELATED EVENTS PATTERNS

  // Multiple failed attempts
  const failedRelatedEvents = relatedEvents.filter(event => !event.success)
  if (failedRelatedEvents.length >= 3) {
    flags.push(`${failedRelatedEvents.length} failed attempts in time window`)
    anomalyScore += 40
    riskFactors.failed_attempts = failedRelatedEvents.length
    riskFactors.suspicious_patterns.push('multiple_failures')
    recommendations.push('Consider implementing account lockout policies')
  }

  // Bulk operations detection
  const sameTypeEvents = relatedEvents.filter(event => 
    event.event_type === log.event_type && 
    event.resource_type === log.resource_type
  )
  if (sameTypeEvents.length >= 10) {
    flags.push('Bulk operations detected')
    anomalyScore += 35
    riskFactors.bulk_operations = true
    riskFactors.suspicious_patterns.push('bulk_operations')
    recommendations.push('Review data access patterns for potential data exfiltration')
  }

  // Privilege escalation patterns
  const adminEvents = relatedEvents.filter(event => 
    event.resource_type === 'users' || 
    event.action.includes('admin') ||
    event.event_type === 'system_access'
  )
  if (adminEvents.length >= 2) {
    flags.push('Administrative activity detected')
    anomalyScore += 25
    riskFactors.suspicious_patterns.push('privilege_escalation')
    recommendations.push('Verify administrative privileges and access rights')
  }

  // 3. ANALYZE SESSION CONTEXT

  // Off-hours access (outside 6 AM - 10 PM)
  const logHour = new Date(log.timestamp || log.created_at).getHours()
  if (logHour < 6 || logHour > 22) {
    flags.push('Off-hours access detected')
    anomalyScore += 20
    riskFactors.off_hours_access = true
    recommendations.push('Verify legitimate business need for off-hours access')
  }

  // Session anomalies
  const sessionFailureRate = sessionEvents.length > 0 
    ? sessionEvents.filter(e => !e.success).length / sessionEvents.length 
    : 0
  
  if (sessionFailureRate > 0.3) {
    flags.push('High session failure rate')
    anomalyScore += 30
    riskFactors.suspicious_patterns.push('session_anomalies')
    recommendations.push('Investigate user session for potential compromise')
  }

  // Rapid-fire requests
  if (sessionEvents.length > 100) {
    flags.push('High-volume session activity')
    anomalyScore += 20
    riskFactors.suspicious_patterns.push('high_volume_activity')
    recommendations.push('Monitor for automated/scripted access')
  }

  // 4. GEOGRAPHIC AND DEVICE ANALYSIS
  
  // Check for suspicious user agent patterns
  const userAgent = log.user_agent || ''
  const suspiciousAgents = ['curl', 'wget', 'python', 'bot', 'crawler', 'scanner']
  if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    flags.push('Suspicious user agent detected')
    anomalyScore += 25
    riskFactors.suspicious_patterns.push('suspicious_user_agent')
    recommendations.push('Verify legitimate application access')
  }

  // 5. DETERMINE FINAL THREAT LEVEL
  
  if (anomalyScore >= 80) {
    threatLevel = 'critical'
  } else if (anomalyScore >= 60) {
    threatLevel = 'high'
  } else if (anomalyScore >= 35) {
    threatLevel = 'medium'
  } else {
    threatLevel = 'low'
  }

  // Add general recommendations based on threat level
  if (threatLevel === 'critical') {
    recommendations.unshift('URGENT: Immediate security incident response required')
    recommendations.push('Consider temporary account suspension')
    recommendations.push('Escalate to security team immediately')
  } else if (threatLevel === 'high') {
    recommendations.unshift('Enhanced monitoring recommended')
    recommendations.push('Review user access permissions')
  } else if (threatLevel === 'medium') {
    recommendations.push('Continue monitoring user activity')
  }

  return {
    threat_level: threatLevel,
    anomaly_score: Math.min(anomalyScore, 100),
    flags,
    recommendations: [...new Set(recommendations)], // Remove duplicates
    risk_factors: riskFactors
  }
}

// Generate contextual information about the log
function generateLogContext(log: any, sessionEvents: any[]) {
  const logTime = new Date(log.timestamp || log.created_at)
  
  // Time analysis
  const hour = logTime.getHours()
  const dayOfWeek = logTime.toLocaleDateString('en-US', { weekday: 'long' })
  const isBusinessHours = hour >= 9 && hour <= 17 && 
    !['Saturday', 'Sunday'].includes(dayOfWeek)
  
  let timeOfDay: string
  if (hour >= 6 && hour < 12) timeOfDay = 'morning'
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon'
  else if (hour >= 17 && hour < 22) timeOfDay = 'evening'
  else timeOfDay = 'night'

  // Session duration calculation
  let sessionDuration: number | undefined
  if (sessionEvents.length > 1) {
    const firstEvent = new Date(sessionEvents[0].timestamp)
    const lastEvent = new Date(sessionEvents[sessionEvents.length - 1].timestamp)
    sessionDuration = Math.round((lastEvent.getTime() - firstEvent.getTime()) / 1000 / 60) // minutes
  }

  return {
    time_of_day: timeOfDay,
    day_of_week: dayOfWeek,
    is_business_hours: isBusinessHours,
    session_duration: sessionDuration,
    geographic_location: 'Unknown' // Could be enhanced with IP geolocation
  }
}