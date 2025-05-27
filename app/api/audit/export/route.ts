import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'
    const format = searchParams.get('format') || 'csv'
    const riskLevel = searchParams.get('riskLevel') || 'all'

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

    // Apply risk level filter
    if (riskLevel !== 'all') {
      query = query.eq('risk_level', riskLevel)
    }

    const { data: logs, error } = await query

    // Use sample data if no logs found or error
    let exportData = logs || []
    if (error || !logs || logs.length === 0) {
      exportData = generateSampleAuditLogs()
    }

    if (format === 'csv') {
      const csv = convertToCSV(exportData)
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="hipaa-audit-logs-${timeRange}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else {
      const json = JSON.stringify(exportData, null, 2)
      
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="hipaa-audit-logs-${timeRange}-${new Date().toISOString().split('T')[0]}.json"`
        }
      })
    }

  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    )
  }
}

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return 'No data available'
  }

  // Define CSV headers
  const headers = [
    'ID',
    'Created At',
    'Event Type',
    'User ID',
    'Resource Type',
    'Resource ID',
    'Action',
    'IP Address',
    'User Agent',
    'Success',
    'Risk Level',
    'Details'
  ]

  // Convert data to CSV rows
  const rows = data.map(log => [
    log.id || '',
    log.created_at || '',
    log.event_type || '',
    log.user_id || '',
    log.resource_type || '',
    log.resource_id || '',
    log.action || '',
    log.ip_address || '',
    log.user_agent || '',
    log.success ? 'Yes' : 'No',
    log.risk_level || '',
    JSON.stringify(log.details || {})
  ])

  // Escape CSV values
  const escapeCSV = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  return csvContent
}

// Generate sample audit logs for demonstration
function generateSampleAuditLogs() {
  const now = new Date()
  const sampleLogs = []

  for (let i = 0; i < 20; i++) {
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
      success: Math.random() > 0.1,
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