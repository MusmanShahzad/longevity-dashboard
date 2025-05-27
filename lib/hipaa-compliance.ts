// HIPAA Compliance utilities for healthcare data protection
import { NextRequest } from 'next/server'

// Request context for audit logging
export interface AuditContext {
  request: NextRequest
  userId?: string
  sessionId?: string
  userRole?: string
  startTime: number
}

// HIPAA Audit Event Types
export type AuditEventType = 
  | 'data_access' 
  | 'data_modification' 
  | 'data_deletion' 
  | 'failed_access' 
  | 'export_data' 
  | 'print_data'
  | 'biomarker_extraction'
  | 'lab_report_upload'
  | 'health_alert_generated'

export interface AuditLogEntry {
  id: string
  timestamp: string
  event_type: AuditEventType
  user_id: string
  patient_id?: string
  resource_type: string
  resource_id?: string
  action: string
  ip_address: string
  user_agent: string
  success: boolean
  details?: Record<string, any>
  risk_level: 'low' | 'medium' | 'high' | 'critical'
}

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted'
  categories: string[]
  retention_period_days: number
  encryption_required: boolean
  access_controls: string[]
}

// Data classification for different types of health information
export const DATA_CLASSIFICATIONS: Record<string, DataClassification> = {
  'user_profile': {
    level: 'confidential',
    categories: ['PII', 'demographic'],
    retention_period_days: 2555, // 7 years
    encryption_required: true,
    access_controls: ['authenticated_user', 'data_owner']
  },
  'sleep_data': {
    level: 'restricted',
    categories: ['PHI', 'biometric'],
    retention_period_days: 2555,
    encryption_required: true,
    access_controls: ['authenticated_user', 'data_owner', 'healthcare_provider']
  },
  'lab_reports': {
    level: 'restricted',
    categories: ['PHI', 'medical_records'],
    retention_period_days: 2555,
    encryption_required: true,
    access_controls: ['authenticated_user', 'data_owner', 'healthcare_provider']
  },
  'biomarkers': {
    level: 'restricted',
    categories: ['PHI', 'diagnostic_data'],
    retention_period_days: 2555,
    encryption_required: true,
    access_controls: ['authenticated_user', 'data_owner', 'healthcare_provider']
  },
  'health_alerts': {
    level: 'restricted',
    categories: ['PHI', 'clinical_alerts'],
    retention_period_days: 2555,
    encryption_required: true,
    access_controls: ['authenticated_user', 'data_owner', 'healthcare_provider']
  }
}

// Utility functions for generating IDs and hashing (Edge Runtime compatible)
function generateId(): string {
  // Use crypto.randomUUID() which is available in Edge Runtime
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback to timestamp-based ID
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

async function hashData(data: string): Promise<string> {
  // Use Web Crypto API which is available in Edge Runtime
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
  
  // Fallback for environments without Web Crypto API
  return data
}

export class PHIEncryption {
  static async hashPII(data: string): Promise<string> {
    // One-way hash for PII that needs to be searchable but not reversible
    const salt = process.env.PII_HASH_SALT || 'default-salt-change-in-production'
    return await hashData(data + salt)
  }
  
  // Note: Full encryption/decryption moved to server-side only functions
  // Edge Runtime doesn't support Node.js crypto module
}

// HIPAA Audit Logger
export class HIPAAAuditLogger {
  static async logEvent(event: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...event
    }

    try {
      // In production, this would write to a secure, tamper-proof audit log
      // For now, we'll use Supabase with additional security measures
      const { supabase } = await import('@/lib/supabase')
      
      await supabase
        .from('audit_logs')
        .insert([auditEntry])

      // For critical events, also log to external SIEM system
      if (event.risk_level === 'critical' || event.risk_level === 'high') {
        await this.alertSecurityTeam(auditEntry)
      }

    } catch (error) {
      console.error('Failed to log audit event:', error)
      // In production, this should trigger an alert as audit logging failures are serious
    }
  }

  private static async alertSecurityTeam(auditEntry: AuditLogEntry): Promise<void> {
    // In production, integrate with security monitoring systems
    console.warn('HIGH RISK AUDIT EVENT:', auditEntry)
    
    // Could integrate with:
    // - Slack/Teams notifications
    // - Email alerts
    // - SIEM systems (Splunk, ELK, etc.)
    // - Security incident response platforms
  }

  static async getAuditTrail(
    userId: string, 
    startDate: Date, 
    endDate: Date,
    eventTypes?: AuditEventType[]
  ): Promise<AuditLogEntry[]> {
    const { supabase } = await import('@/lib/supabase')
    
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false })

    if (eventTypes && eventTypes.length > 0) {
      query = query.in('event_type', eventTypes)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to retrieve audit trail: ${error.message}`)
    }

    return data || []
  }
}

// Access Control utilities
export class AccessControl {
  static async checkDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: 'read' | 'write' | 'delete'
  ): Promise<{ allowed: boolean; reason?: string }> {
    
    const classification = DATA_CLASSIFICATIONS[resourceType]
    if (!classification) {
      return { allowed: false, reason: 'Unknown resource type' }
    }

    // Check if user has required access level
    const userRole = await this.getUserRole(userId)
    const hasAccess = this.checkRolePermissions(userRole, classification.access_controls, action)

    if (!hasAccess) {
      // Note: This would need proper audit context in a real implementation
      console.warn('Access denied:', { userId, resourceType, resourceId, action, reason: 'Insufficient permissions' })
      return { allowed: false, reason: 'Insufficient permissions' }
    }

    // Note: This would need proper audit context in a real implementation
    console.log('Access granted:', { userId, resourceType, resourceId, action })

    return { allowed: true }
  }

  private static async getUserRole(userId: string): Promise<string> {
    // In production, this would check user roles from database
    // For now, assume all users are 'data_owner' of their own data
    return 'data_owner'
  }

  private static checkRolePermissions(
    userRole: string,
    requiredRoles: string[],
    action: string
  ): boolean {
    // Simple role-based access control
    // In production, this would be more sophisticated
    return requiredRoles.includes(userRole)
  }
}

// Data Retention utilities
export class DataRetention {
  static async checkRetentionPolicy(resourceType: string, createdAt: Date): Promise<{
    shouldRetain: boolean;
    daysUntilExpiry: number;
    action: 'retain' | 'archive' | 'delete';
  }> {
    const classification = DATA_CLASSIFICATIONS[resourceType]
    if (!classification) {
      return { shouldRetain: false, daysUntilExpiry: 0, action: 'delete' }
    }

    const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const daysUntilExpiry = classification.retention_period_days - ageInDays

    if (daysUntilExpiry <= 0) {
      return { shouldRetain: false, daysUntilExpiry: 0, action: 'delete' }
    } else if (daysUntilExpiry <= 30) {
      return { shouldRetain: true, daysUntilExpiry, action: 'archive' }
    } else {
      return { shouldRetain: true, daysUntilExpiry, action: 'retain' }
    }
  }

  static async scheduleDataCleanup(): Promise<void> {
    // This would be called by a scheduled job to clean up expired data
    console.log('Data retention cleanup scheduled - implement in production')
  }
}

// Privacy utilities
export class PrivacyControls {
  static anonymizeData(data: any, fieldsToAnonymize: string[]): any {
    const anonymized = { ...data }
    
    for (const field of fieldsToAnonymize) {
      if (anonymized[field]) {
        anonymized[field] = this.anonymizeField(anonymized[field], field)
      }
    }
    
    return anonymized
  }

  private static anonymizeField(value: any, fieldType: string): string {
    switch (fieldType) {
      case 'email':
        return value.replace(/(.{2}).*(@.*)/, '$1***$2')
      case 'name':
        return value.replace(/(.{1}).*/, '$1***')
      case 'phone':
        return value.replace(/(.{3}).*(.{4})/, '$1***$2')
      default:
        return '***'
    }
  }

  static async requestDataExport(userId: string): Promise<{ exportId: string; estimatedCompletion: Date }> {
    // GDPR/CCPA data export request
    const exportId = generateId()
    const estimatedCompletion = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Note: This would need proper audit context in a real implementation
    console.log('Data export requested:', { userId, exportId })

    return { exportId, estimatedCompletion }
  }

  static async requestDataDeletion(userId: string): Promise<{ deletionId: string; scheduledDate: Date }> {
    // GDPR right to be forgotten
    const deletionId = generateId()
    const scheduledDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days notice

    // Note: This would need proper audit context in a real implementation
    console.log('Data deletion requested:', { userId, deletionId })

    return { deletionId, scheduledDate }
  }
}

// Utility function to create audit context from request
export function createAuditContext(
  request: NextRequest,
  userId?: string,
  sessionId?: string,
  userRole?: string
): AuditContext {
  return {
    request,
    userId,
    sessionId,
    userRole,
    startTime: Date.now()
  }
}

// Export all utilities
export const HIPAACompliance = {
  PHIEncryption,
  HIPAAAuditLogger,
  AccessControl,
  DataRetention,
  PrivacyControls,
  DATA_CLASSIFICATIONS
} 