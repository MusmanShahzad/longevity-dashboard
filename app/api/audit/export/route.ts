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
      .from('audit_logs')
      .select('*')
      .gte('timestamp', startTime.toISOString())
      .order('timestamp', { ascending: false })

    // Apply risk level filter
    if (riskLevel !== 'all') {
      query = query.eq('risk_level', riskLevel)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching audit logs for export:', error)
      return NextResponse.json(
        { error: 'Failed to fetch audit logs for export', details: error.message },
        { status: 500 }
      )
    }

    const exportData = logs || []

    if (format === 'csv') {
      const csv = convertToCSV(exportData)
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${timeRange}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else {
      const json = JSON.stringify(exportData, null, 2)
      
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="audit-logs-${timeRange}-${new Date().toISOString().split('T')[0]}.json"`
        }
      })
    }

  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { error: 'Failed to export audit logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return 'ID,Created At,Event Type,User ID,Resource Type,Resource ID,Action,IP Address,User Agent,Success,Risk Level,Details\nNo audit logs found for the specified time range'
  }

  // Define CSV headers
  const headers = [
    'ID',
    'Created At',
    'Event Type',
    'User ID',
    'Patient ID',
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
    log.created_at || log.timestamp || '',
    log.event_type || '',
    log.user_id || '',
    log.patient_id || '',
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
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  return csvContent
} 