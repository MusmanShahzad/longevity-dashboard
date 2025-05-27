import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withDataAccess } from '@/lib/optimized-api-wrapper'

// Enhanced validation schema for audit log queries
const auditLogsQuerySchema = z.object({
  // Pagination
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  
  // Time range filtering (frontend convenience parameter)
  timeRange: z.enum(['1h', '6h', '12h', '24h', '7d', '30d', 'all']).optional(),
  
  // Filtering
  user_id: z.string().uuid().optional(),
  resource_type: z.string().max(50).optional(),
  event_type: z.enum(['data_access', 'data_modification', 'data_deletion', 'login_attempt', 'logout', 'failed_access', 'export_data', 'print_data', 'biomarker_extraction', 'lab_report_upload', 'health_alert_creation', 'system_maintenance', 'security_event', 'api_request', 'system_access', 'all']).optional(),
  eventType: z.enum(['data_access', 'data_modification', 'data_deletion', 'login_attempt', 'logout', 'failed_access', 'export_data', 'print_data', 'biomarker_extraction', 'lab_report_upload', 'health_alert_creation', 'system_maintenance', 'security_event', 'api_request', 'system_access', 'all']).optional(), // Frontend alias
  action: z.string().max(50).optional(),
  success: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  risk_level: z.enum(['low', 'medium', 'high', 'critical', 'all']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical', 'all']).optional(), // Frontend alias
  ip_address: z.string().ip().optional(),
  
  // Date range filtering
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  
  // Search
  search: z.string().max(100).optional(),
  api_endpoint: z.string().max(200).optional(),
  apiEndpoint: z.string().max(200).optional(), // Frontend alias
  http_method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  
  // Performance filtering
  min_duration: z.string().regex(/^\d+$/).transform(Number).optional(),
  max_duration: z.string().regex(/^\d+$/).transform(Number).optional(),
  cache_hit: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  
  // Sorting
  sort_by: z.enum(['timestamp', 'duration_ms', 'risk_level', 'user_id']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
})

// GET /api/audit/logs - Enhanced audit logs retrieval with comprehensive filtering
export const GET = withDataAccess(
  async (request, context) => {
    console.log('🔍 Audit logs API called with query:', context.query)
    
    const {
      page = 1,
      limit = 50,
      timeRange,
      user_id,
      resource_type,
      event_type,
      eventType, // Frontend alias
      action,
      success,
      risk_level,
      riskLevel, // Frontend alias
      ip_address,
      start_date,
      end_date,
      search,
      api_endpoint,
      apiEndpoint, // Frontend alias
      http_method,
      min_duration,
      max_duration,
      cache_hit,
      sort_by = 'timestamp',
      sort_order = 'desc'
    } = context.query

    // Handle frontend aliases and "all" values
    const normalizedEventType = (event_type || eventType) === 'all' ? undefined : (event_type || eventType)
    const normalizedRiskLevel = (risk_level || riskLevel) === 'all' ? undefined : (risk_level || riskLevel)
    const normalizedApiEndpoint = (api_endpoint || apiEndpoint) === 'all' ? undefined : (api_endpoint || apiEndpoint)

    // Handle timeRange parameter
    let calculatedStartDate = start_date
    let calculatedEndDate = end_date
    
    if (timeRange && timeRange !== 'all') {
      const now = new Date()
      const timeRangeMap = {
        '1h': 1 * 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '12h': 12 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      }
      
      const milliseconds = timeRangeMap[timeRange as keyof typeof timeRangeMap]
      if (milliseconds) {
        const startTime = new Date(now.getTime() - milliseconds)
        calculatedStartDate = startTime.toISOString().split('T')[0]
        calculatedEndDate = now.toISOString().split('T')[0]
      }
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Build base query with count
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        event_type,
        user_id,
        resource_type,
        resource_id,
        action,
        ip_address,
        user_agent,
        success,
        risk_level,
        timestamp,
        duration_ms,
        cache_hit,
        threat_level,
        details
      `, { count: 'exact' })

    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (resource_type) {
      query = query.eq('resource_type', resource_type)
    }

    if (normalizedEventType) {
      query = query.eq('event_type', normalizedEventType)
    }

    if (action) {
      query = query.eq('action', action)
    }

    if (success !== undefined) {
      query = query.eq('success', success)
    }

    if (normalizedRiskLevel) {
      query = query.eq('risk_level', normalizedRiskLevel)
    }

    if (ip_address) {
      query = query.eq('ip_address', ip_address)
    }

    if (cache_hit !== undefined) {
      query = query.eq('cache_hit', cache_hit)
    }

    // Date range filtering
    if (calculatedStartDate) {
      query = query.gte('timestamp', `${calculatedStartDate}T00:00:00.000Z`)
    }

    if (calculatedEndDate) {
      query = query.lte('timestamp', `${calculatedEndDate}T23:59:59.999Z`)
    }

    // API endpoint filtering
    if (normalizedApiEndpoint) {
      query = query.like('details->>api_endpoint', `%${normalizedApiEndpoint}%`)
    }

    if (http_method) {
      query = query.eq('details->>http_method', http_method)
    }

    // Performance filtering
    if (min_duration !== undefined) {
      query = query.gte('duration_ms', min_duration)
    }

    if (max_duration !== undefined) {
      query = query.lte('duration_ms', max_duration)
    }

    // Search across multiple fields
    if (search) {
      query = query.or(`
        user_id.ilike.%${search}%,
        resource_type.ilike.%${search}%,
        action.ilike.%${search}%,
        ip_address.ilike.%${search}%,
        details->>api_endpoint.ilike.%${search}%
      `)
    }

    // Apply sorting
    const ascending = sort_order === 'asc'
    query = query.order(sort_by, { ascending })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: logs, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`)
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    // Get summary statistics for the current filter
    const statsQuery = supabase
      .from('audit_logs')
      .select('success, risk_level, duration_ms, cache_hit')

    // Apply the same filters to stats query (excluding pagination)
    let filteredStatsQuery = statsQuery
    if (user_id) filteredStatsQuery = filteredStatsQuery.eq('user_id', user_id)
    if (resource_type) filteredStatsQuery = filteredStatsQuery.eq('resource_type', resource_type)
    if (normalizedEventType) filteredStatsQuery = filteredStatsQuery.eq('event_type', normalizedEventType)
    if (calculatedStartDate) filteredStatsQuery = filteredStatsQuery.gte('timestamp', `${calculatedStartDate}T00:00:00.000Z`)
    if (calculatedEndDate) filteredStatsQuery = filteredStatsQuery.lte('timestamp', `${calculatedEndDate}T23:59:59.999Z`)

    const { data: statsData } = await filteredStatsQuery

    // Calculate summary statistics
    const stats = {
      total_records: count || 0,
      success_rate: statsData ? Math.round((statsData.filter(r => r.success).length / statsData.length) * 100) : 0,
      avg_response_time: statsData && statsData.length > 0 
        ? Math.round(statsData.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / statsData.length)
        : 0,
      cache_hit_rate: statsData && statsData.length > 0
        ? Math.round((statsData.filter(r => r.cache_hit).length / statsData.length) * 100)
        : 0,
      risk_distribution: {
        low: statsData ? statsData.filter(r => r.risk_level === 'low').length : 0,
        medium: statsData ? statsData.filter(r => r.risk_level === 'medium').length : 0,
        high: statsData ? statsData.filter(r => r.risk_level === 'high').length : 0,
        critical: statsData ? statsData.filter(r => r.risk_level === 'critical').length : 0
      }
    }

    return {
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext,
        hasPrev
      },
      filters: {
        user_id,
        resource_type,
        event_type: normalizedEventType,
        action,
        success,
        risk_level: normalizedRiskLevel,
        ip_address,
        start_date: calculatedStartDate,
        end_date: calculatedEndDate,
        search,
        api_endpoint: normalizedApiEndpoint,
        http_method,
        min_duration,
        max_duration,
        cache_hit,
        sort_by,
        sort_order,
        timeRange
      },
      statistics: stats
    }
  },
  {
    resourceType: 'audit_logs',
    querySchema: auditLogsQuerySchema,
    cacheTTL: 30 * 1000, // Cache for 30 seconds (audit logs change frequently)
    maxRequestSize: 2048,
    timeout: 15000
  }
) 