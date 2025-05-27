import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'
    const riskLevel = searchParams.get('riskLevel') || 'all'
    const eventType = searchParams.get('eventType') || 'all'
    const limit = parseInt(searchParams.get('limit') || '100')

    // Calculate time range
    const now = new Date()
    let startTime: Date
    
    switch (timeRange) {
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Build query
    let query = supabase
      .from('hipaa_audit_logs')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (riskLevel !== 'all') {
      query = query.eq('risk_level', riskLevel)
    }

    if (eventType !== 'all') {
      query = query.eq('event_type', eventType)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching audit logs:', error)
      // Return sample logs if table doesn't exist yet
      const sampleLogs = generateSampleAuditLogs()
      return NextResponse.json({
        logs: sampleLogs,
        message: 'Audit logs table not found. Showing sample data for demonstration.'
      })
    }

    // If no logs exist, create some sample data for demo
    if (!logs || logs.length === 0) {
      const sampleLogs = generateSampleAuditLogs()
      return NextResponse.json({
        logs: sampleLogs,
        message: 'No audit logs found. Showing sample data for demonstration.'
      })
    }

    return NextResponse.json({
      logs: logs || [],
      total: logs?.length || 0,
      timeRange,
      filters: { riskLevel, eventType }
    })

  } catch (error) {
    console.error('Audit logs API error:', error)
    
    // Return sample data if there's an error
    const sampleLogs = generateSampleAuditLogs()
    return NextResponse.json({
      logs: sampleLogs,
      message: 'Error accessing audit logs. Showing sample data for demonstration.',
      error: 'Database connection issue'
    })
  }
}

// Generate sample audit logs for demonstration
function generateSampleAuditLogs() {
  const now = new Date()
  const sampleLogs = []

  // Generate logs for the last 24 hours
  for (let i = 0; i < 25; i++) {
    const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000)
    
    const eventTypes = ['data_access', 'data_modification', 'login_attempt', 'failed_access', 'export_data']
    const riskLevels = ['low', 'medium', 'high', 'critical']
    const userIds = ['user_001', 'user_002', 'user_003', 'admin_001', 'system']
    const resourceTypes = ['biomarkers', 'lab_reports', 'user_data', 'health_metrics', 'sleep_data']
    const actions = ['view', 'create', 'update', 'delete', 'export']
    const ipAddresses = ['192.168.1.100', '10.0.0.50', '172.16.0.25', '203.0.113.45']

    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)]
    const userId = userIds[Math.floor(Math.random() * userIds.length)]
    const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)]
    const action = actions[Math.floor(Math.random() * actions.length)]
    const ipAddress = ipAddresses[Math.floor(Math.random() * ipAddresses.length)]

    sampleLogs.push({
      id: `audit_${i + 1}`,
      created_at: timestamp.toISOString(),
      event_type: eventType,
      user_id: userId,
      resource_type: resourceType,
      resource_id: `${resourceType}_${Math.floor(Math.random() * 1000)}`,
      action: action,
      ip_address: ipAddress,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      success: Math.random() > 0.1, // 90% success rate
      risk_level: riskLevel,
      details: {
        session_id: `session_${Math.random().toString(36).substr(2, 9)}`,
        duration_ms: Math.floor(Math.random() * 5000),
        data_size: Math.floor(Math.random() * 1000000),
        encryption_used: true
      }
    })
  }

  return sampleLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
} 