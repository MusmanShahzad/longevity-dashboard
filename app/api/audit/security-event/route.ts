import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      type,
      message,
      severity,
      timestamp,
      userAgent,
      url,
      additionalData
    } = body

    // Validate required fields
    if (!type || !message || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields: type, message, severity' },
        { status: 400 }
      )
    }

    // Get client IP
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Create security event record
    const securityEvent = {
      event_type: 'security_event',
      user_id: 'frontend_user',
      resource_type: 'security_monitoring',
      action: type,
      ip_address: ipAddress,
      user_agent: userAgent || request.headers.get('user-agent') || 'unknown',
      success: true,
      risk_level: mapSeverityToRiskLevel(severity),
      details: {
        original_type: type,
        message,
        severity,
        url,
        timestamp,
        ...additionalData
      },
      created_at: new Date().toISOString()
    }

    // Try to insert into audit logs table
    const { error } = await supabase
      .from('audit_logs')
      .insert([securityEvent])

    if (error) {
      console.error('Error inserting security event:', error)
      // Don't fail the request if logging fails
    }

    // Log to console for development
    console.log('Security Event:', {
      type,
      message,
      severity,
      ipAddress,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true,
      message: 'Security event logged successfully'
    })

  } catch (error) {
    console.error('Security event API error:', error)
    
    // Don't fail the request if logging fails
    return NextResponse.json({ 
      success: true,
      message: 'Security event received (logging may have failed)'
    })
  }
}

function mapSeverityToRiskLevel(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'critical'
    case 'high':
      return 'high'
    case 'medium':
      return 'medium'
    case 'low':
    default:
      return 'low'
  }
} 