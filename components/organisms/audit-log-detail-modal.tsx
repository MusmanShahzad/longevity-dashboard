"use client"

import { useState, useEffect } from "react"
import { X, Shield, AlertTriangle, CheckCircle, Eye, Database, Lock, Activity, Clock, MapPin, Monitor, User, FileText, Calendar, Target, Lightbulb, TrendingUp, TrendingDown, Zap, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/molecules/modal"
import { GlassCard } from "@/components/atoms/glass-card"

interface AuditLogDetailModalProps {
  logId: string
  isOpen: boolean
  onClose: () => void
}

interface AuditLogDetails {
  session_id?: string
  duration_ms?: number
  data_size?: number
  encryption_used?: boolean
  request_id?: string
  endpoint?: string
  method?: string
  response_code?: number
  error_message?: string
  user_role?: string
  location?: string
  device_type?: string
  browser?: string
  os?: string
  // New fields from middleware logging
  api_endpoint?: string
  http_method?: string
  response_status?: number
  query_params?: Record<string, any>
  query_parameters?: Record<string, any>
  request_headers?: Record<string, any>
  error_details?: any
  // Enhanced audit logging fields
  request_body?: any
  request_body_size?: number
  parsing_error?: boolean
  user_id?: string
  updated_fields?: string[]
  update_successful?: boolean
  creation_successful?: boolean
  attempted_creation?: boolean
  attempted_update?: boolean
  new_user_id?: string
  email?: string
  email_attempted?: string
  alert_id?: string
  alert_type?: string
  alert_title?: string
  creation_failed?: boolean
  query_failed?: boolean
  list_users_failed?: boolean
  list_users_successful?: boolean
  users_count?: number
  limit_applied?: string
  alerts_count?: number
  validation_failed?: boolean
  data_retrieved?: boolean
  test_endpoint?: boolean
  test_param?: string
  data_received?: boolean
  data_updated?: boolean
  body_keys?: string[]
  url?: string
  // Security event specific fields
  message?: string
  severity?: string
  original_type?: string
}

interface SecurityAnalysis {
  threat_level?: string
  anomaly_score?: number
  flags?: string[]
  recommendations?: string[]
  risk_factors?: {
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
}

interface AuditLogEntry {
  id: string
  timestamp: string
  created_at?: string
  event_type: string
  user_id: string
  patient_id?: string
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
  related_events?: RelatedEvent[]
  security_analysis?: SecurityAnalysis
  context?: {
    time_of_day: string
    day_of_week: string
    is_business_hours: boolean
    session_duration?: number
    geographic_location?: string
  }
}

const EventTypeIcon = ({ eventType }: { eventType: string }) => {
  switch (eventType) {
    case 'data_access':
      return <Eye className="h-4 w-4 text-blue-400" />
    case 'data_modification':
      return <Database className="h-4 w-4 text-green-400" />
    case 'data_deletion':
      return <AlertTriangle className="h-4 w-4 text-red-400" />
    case 'login_attempt':
      return <Lock className="h-4 w-4 text-purple-400" />
    case 'logout':
      return <Lock className="h-4 w-4 text-gray-400" />
    case 'failed_access':
      return <AlertTriangle className="h-4 w-4 text-red-400" />
    case 'security_event':
      return <Shield className="h-4 w-4 text-orange-400" />
    case 'api_request':
      return <Activity className="h-4 w-4 text-cyan-400" />
    case 'system_access':
      return <Database className="h-4 w-4 text-blue-400" />
    case 'export_data':
      return <FileText className="h-4 w-4 text-orange-400" />
    case 'print_data':
      return <FileText className="h-4 w-4 text-yellow-400" />
    case 'biomarker_extraction':
      return <Activity className="h-4 w-4 text-cyan-400" />
    case 'lab_report_upload':
      return <FileText className="h-4 w-4 text-green-400" />
    case 'health_alert_creation':
      return <AlertTriangle className="h-4 w-4 text-orange-400" />
    case 'system_maintenance':
      return <Activity className="h-4 w-4 text-gray-400" />
    default:
      return <Activity className="h-4 w-4 text-gray-400" />
  }
}

const StatusIcon = ({ success }: { success: boolean }) => {
  return success ? (
    <CheckCircle className="h-4 w-4 text-green-400" />
  ) : (
    <AlertTriangle className="h-4 w-4 text-red-400" />
  )
}

const getRiskLevelColor = (level: string) => {
  switch (level) {
    case 'critical':
      return 'bg-red-500/20 text-red-300 border-red-400/30'
    case 'high':
      return 'bg-orange-500/20 text-orange-300 border-orange-400/30'
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
    case 'low':
      return 'bg-green-500/20 text-green-300 border-green-400/30'
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-400/30'
  }
}

const getThreatLevelColor = (level: string) => {
  switch (level) {
    case 'critical':
      return 'text-red-400'
    case 'high':
      return 'text-orange-400'
    case 'medium':
      return 'text-yellow-400'
    case 'low':
      return 'text-green-400'
    default:
      return 'text-gray-400'
  }
}

// Reusable Components
const StatusMessage = ({ type, message }: { type: 'error' | 'success' | 'warning' | 'info', message: string }) => {
  const configs = {
    error: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    success: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    info: { icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" }
  }
  
  const config = configs[type]
  const Icon = config.icon

  return (
    <div className={`mt-4 p-3 rounded-lg border flex items-center space-x-2 ${config.bg}`}>
      <Icon className={`h-5 w-5 flex-shrink-0 ${config.color}`} />
      <p className={`text-sm ${config.color}`}>{message}</p>
    </div>
  )
}

const LoadingSpinner = ({ message }: { message: string }) => (
  <div className="p-8 text-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
    <p className="text-gray-400">{message}</p>
  </div>
)

const SkeletonLoader = () => (
  <div className="space-y-8">
    {/* Header Skeleton */}
    <div className="bg-white/5 rounded-xl p-6 border border-white/10 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-white/10 rounded w-48"></div>
        <div className="h-4 bg-white/10 rounded w-24"></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-white/10 rounded w-16"></div>
            <div className="h-5 bg-white/10 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>

    {/* Security Analysis Skeleton */}
    <div className="bg-red-500/10 rounded-xl p-6 border border-red-400/20 animate-pulse">
      <div className="flex items-center space-x-2 mb-4">
        <div className="h-6 w-6 bg-red-400/30 rounded"></div>
        <div className="h-6 bg-red-400/30 rounded w-32"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-red-400/20 rounded w-full"></div>
        <div className="h-4 bg-red-400/20 rounded w-4/5"></div>
      </div>
    </div>

    {/* Details Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white/5 rounded-xl p-5 border border-white/10 animate-pulse">
          <div className="h-5 bg-white/10 rounded w-32 mb-3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded w-full"></div>
            <div className="h-4 bg-white/10 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

const ModalHeader = ({ 
  log, 
  onClose 
}: {
  log: AuditLogEntry | null
  onClose: () => void
}) => (
  <div className="flex-shrink-0 p-6 border-b border-white/10">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Audit Log Details</h2>
          {log && (
            <p className="text-sm text-cyan-300">
              {log.event_type.replace('_', ' ').toUpperCase()} - {log.action}
            </p>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="text-gray-400 hover:text-white hover:bg-white/10"
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  </div>
)

const LogOverview = ({ log }: { log: AuditLogEntry }) => (
  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-white">Event Overview</h3>
      <div className="flex items-center space-x-2">
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-400">
          {new Date(log.timestamp || log.created_at || '').toLocaleString()}
        </span>
      </div>
    </div>
    
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <div>
        <p className="text-xs text-gray-400 mb-1">Event Type</p>
        <div className="flex items-center space-x-2">
          <EventTypeIcon eventType={log.event_type} />
          <span className="text-white font-medium">{log.event_type.replace('_', ' ')}</span>
        </div>
      </div>
      
      <div>
        <p className="text-xs text-gray-400 mb-1">Status</p>
        <div className="flex items-center space-x-2">
          <StatusIcon success={log.success} />
          <span className={`font-medium ${log.success ? 'text-green-400' : 'text-red-400'}`}>
            {log.success ? 'Success' : 'Failed'}
          </span>
        </div>
      </div>
      
      <div>
        <p className="text-xs text-gray-400 mb-1">Risk Level</p>
        <Badge className={getRiskLevelColor(log.risk_level)}>
          {log.risk_level.toUpperCase()}
        </Badge>
      </div>
      
      <div>
        <p className="text-xs text-gray-400 mb-1">User</p>
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="text-white font-medium">{log.user_id}</span>
        </div>
      </div>
    </div>

    {/* Additional metrics row */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {log.threat_level && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Threat Level</p>
          <Badge className={`${getThreatLevelColor(log.threat_level)} bg-opacity-20 border-opacity-30`}>
            {log.threat_level.toUpperCase()}
          </Badge>
        </div>
      )}
      
      {log.duration_ms !== undefined && log.duration_ms !== null && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Duration</p>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            <span className="text-white font-medium">{log.duration_ms}ms</span>
          </div>
        </div>
      )}
      
      {log.cache_hit !== undefined && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Cache</p>
          <Badge className={log.cache_hit 
            ? 'bg-green-500/20 text-green-300 border-green-400/30'
            : 'bg-gray-500/20 text-gray-300 border-gray-400/30'
          }>
            {log.cache_hit ? 'Hit' : 'Miss'}
          </Badge>
        </div>
      )}
      
      <div>
        <p className="text-xs text-gray-400 mb-1">Resource</p>
        <span className="text-white font-medium">{log.resource_type}</span>
      </div>
    </div>
  </div>
)

const SecurityAnalysisCard = ({ analysis }: { analysis: SecurityAnalysis }) => (
  <div className="bg-red-500/10 rounded-xl p-6 border border-red-400/20">
    <h3 className="text-xl font-semibold text-red-300 mb-4 flex items-center space-x-2">
      <Shield className="h-6 w-6" />
      <span>Security Analysis</span>
    </h3>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">Threat Level</p>
          <div className="flex items-center space-x-2">
            <div className={`text-2xl font-bold ${getThreatLevelColor(analysis.threat_level || 'low')}`}>
              {(analysis.threat_level || 'low').toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    analysis.threat_level === 'critical' ? 'bg-red-400' :
                    analysis.threat_level === 'high' ? 'bg-orange-400' :
                    analysis.threat_level === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                  }`}
                  style={{ 
                    width: `${
                      analysis.threat_level === 'critical' ? 100 :
                      analysis.threat_level === 'high' ? 75 :
                      analysis.threat_level === 'medium' ? 50 : 25
                    }%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <p className="text-sm text-gray-400 mb-2">Anomaly Score</p>
          <div className="flex items-center space-x-2">
            <span className={`text-lg font-bold ${getThreatLevelColor(
              (analysis.anomaly_score || 0) >= 70 ? 'critical' :
              (analysis.anomaly_score || 0) >= 50 ? 'high' :
              (analysis.anomaly_score || 0) >= 30 ? 'medium' : 'low'
            )}`}>
              {analysis.anomaly_score || 0}/100
            </span>
          </div>
        </div>
      </div>
      
      <div>
        {analysis.flags && analysis.flags.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Security Flags</p>
            <div className="space-y-1">
              {analysis.flags.map((flag, index) => (
                <div key={index} className="text-sm text-red-200 flex items-start space-x-2">
                  <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div>
            <p className="text-sm text-gray-400 mb-2">Recommendations</p>
            <div className="space-y-1">
              {analysis.recommendations.map((rec, index) => (
                <div key={index} className="text-sm text-blue-200 flex items-start space-x-2">
                  <Lightbulb className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    
    {/* Risk Factors Analysis */}
    {analysis.risk_factors && (
      <div className="mt-6 bg-orange-500/10 rounded-lg p-4 border border-orange-400/20">
        <h4 className="text-lg font-semibold text-orange-300 mb-3 flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>Risk Factors Analysis</span>
        </h4>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Failed Attempts</span>
              <Badge className={analysis.risk_factors.failed_attempts > 0 
                ? 'bg-red-500/20 text-red-300 border-red-400/30'
                : 'bg-green-500/20 text-green-300 border-green-400/30'
              }>
                {analysis.risk_factors.failed_attempts}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Off-Hours Access</span>
              <Badge className={analysis.risk_factors.off_hours_access 
                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
                : 'bg-green-500/20 text-green-300 border-green-400/30'
              }>
                {analysis.risk_factors.off_hours_access ? 'Yes' : 'No'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Bulk Operations</span>
              <Badge className={analysis.risk_factors.bulk_operations 
                ? 'bg-orange-500/20 text-orange-300 border-orange-400/30'
                : 'bg-green-500/20 text-green-300 border-green-400/30'
              }>
                {analysis.risk_factors.bulk_operations ? 'Detected' : 'None'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">High-Risk Event</span>
              <Badge className={analysis.risk_factors.high_risk_event 
                ? 'bg-red-500/20 text-red-300 border-red-400/30'
                : 'bg-green-500/20 text-green-300 border-green-400/30'
              }>
                {analysis.risk_factors.high_risk_event ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
          
          {analysis.risk_factors.suspicious_patterns && analysis.risk_factors.suspicious_patterns.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Suspicious Patterns</p>
              <div className="space-y-1">
                {analysis.risk_factors.suspicious_patterns.map((pattern, index) => (
                  <Badge key={index} className="bg-red-500/20 text-red-300 border-red-400/30 mr-2 mb-1">
                    {pattern.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
)

const TechnicalDetails = ({ log }: { log: AuditLogEntry }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Request Details */}
    <div className="bg-white/5 rounded-xl p-5 border border-white/10">
      <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
        <Globe className="h-4 w-4 text-blue-400" />
        <span>Request Details</span>
      </h4>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400">IP Address</p>
          <p className="text-white font-mono">{log.ip_address}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">User Agent</p>
          <p className="text-white text-sm break-all">{log.user_agent}</p>
        </div>
        {(log.details?.endpoint || log.details?.api_endpoint) && (
          <div>
            <p className="text-xs text-gray-400">API Endpoint</p>
            <p className="text-white font-mono">{log.details.api_endpoint || log.details.endpoint}</p>
          </div>
        )}
        {log.details?.url && (
          <div>
            <p className="text-xs text-gray-400">Full URL</p>
            <p className="text-white text-sm break-all font-mono">{log.details.url}</p>
          </div>
        )}
        {(log.details?.method || log.details?.http_method) && (
          <div>
            <p className="text-xs text-gray-400">HTTP Method</p>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
              {log.details.http_method || log.details.method}
            </Badge>
          </div>
        )}
        {(log.details?.query_params || log.details?.query_parameters) && Object.keys(log.details.query_params || log.details.query_parameters || {}).length > 0 && (
          <div>
            <p className="text-xs text-gray-400">Query Parameters</p>
            <div className="text-white text-sm font-mono bg-black/20 rounded p-2 mt-1">
              {JSON.stringify(log.details.query_params || log.details.query_parameters, null, 2)}
            </div>
          </div>
        )}
        {log.details?.message && (
          <div>
            <p className="text-xs text-gray-400">Event Message</p>
            <p className="text-white text-sm">{log.details.message}</p>
          </div>
        )}
        {log.details?.severity && (
          <div>
            <p className="text-xs text-gray-400">Severity</p>
            <Badge className={`${
              log.details.severity === 'critical' ? 'bg-red-500/20 text-red-300 border-red-400/30' :
              log.details.severity === 'high' ? 'bg-orange-500/20 text-orange-300 border-orange-400/30' :
              log.details.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' :
              'bg-green-500/20 text-green-300 border-green-400/30'
            }`}>
              {log.details.severity.toUpperCase()}
            </Badge>
          </div>
        )}
        {log.details?.original_type && (
          <div>
            <p className="text-xs text-gray-400">Original Type</p>
            <p className="text-white font-mono">{log.details.original_type}</p>
          </div>
        )}
      </div>
    </div>

    {/* Resource Details */}
    <div className="bg-white/5 rounded-xl p-5 border border-white/10">
      <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
        <Database className="h-4 w-4 text-green-400" />
        <span>Resource Details</span>
      </h4>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400">Resource Type</p>
          <p className="text-white">{log.resource_type}</p>
        </div>
        {log.resource_id && (
          <div>
            <p className="text-xs text-gray-400">Resource ID</p>
            <p className="text-white font-mono">{log.resource_id}</p>
          </div>
        )}
        {log.patient_id && (
          <div>
            <p className="text-xs text-gray-400">Patient ID</p>
            <p className="text-white font-mono">{log.patient_id}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-400">Action</p>
          <p className="text-white">{log.action}</p>
        </div>
      </div>
    </div>

    {/* Session Details */}
    {log.details && (
      <div className="bg-white/5 rounded-xl p-5 border border-white/10">
        <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
          <Monitor className="h-4 w-4 text-purple-400" />
          <span>Session Details</span>
        </h4>
        <div className="space-y-3">
          {log.details.session_id && (
            <div>
              <p className="text-xs text-gray-400">Session ID</p>
              <p className="text-white font-mono">{log.details.session_id}</p>
            </div>
          )}
          {log.details.request_id && (
            <div>
              <p className="text-xs text-gray-400">Request ID</p>
              <p className="text-white font-mono">{log.details.request_id}</p>
            </div>
          )}
          {log.details.duration_ms && (
            <div>
              <p className="text-xs text-gray-400">Duration</p>
              <p className="text-white">{log.details.duration_ms}ms</p>
            </div>
          )}
          {log.details.user_role && (
            <div>
              <p className="text-xs text-gray-400">User Role</p>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                {log.details.user_role}
              </Badge>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Response Details */}
    {log.details && (log.details.response_code || log.details.error_message) && (
      <div className="bg-white/5 rounded-xl p-5 border border-white/10">
        <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <span>Response Details</span>
        </h4>
        <div className="space-y-3">
          {(log.details.response_code || log.details.response_status) && (
            <div>
              <p className="text-xs text-gray-400">Response Status</p>
              <Badge className={`${
                (() => {
                  const status = log.details.response_status || log.details.response_code || 0
                  return status >= 200 && status < 300 
                  ? 'bg-green-500/20 text-green-300 border-green-400/30'
                    : status >= 400
                  ? 'bg-red-500/20 text-red-300 border-red-400/30'
                  : 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
                })()
              }`}>
                {log.details.response_status || log.details.response_code}
              </Badge>
            </div>
          )}
          {(log.details.error_message || log.details.error_details) && (
            <div>
              <p className="text-xs text-gray-400">Error Details</p>
              {log.details.error_message ? (
              <p className="text-red-300 text-sm">{log.details.error_message}</p>
              ) : (
                <div className="text-red-300 text-sm font-mono bg-red-900/20 rounded p-2 mt-1">
                  {typeof log.details.error_details === 'string' 
                    ? log.details.error_details 
                    : JSON.stringify(log.details.error_details, null, 2)}
                </div>
              )}
            </div>
          )}
          {log.details.data_size && (
            <div>
              <p className="text-xs text-gray-400">Data Size</p>
              <p className="text-white">{(log.details.data_size / 1024).toFixed(2)} KB</p>
            </div>
          )}
          {log.details.encryption_used !== undefined && (
            <div>
              <p className="text-xs text-gray-400">Encryption</p>
              <Badge className={log.details.encryption_used 
                ? 'bg-green-500/20 text-green-300 border-green-400/30'
                : 'bg-red-500/20 text-red-300 border-red-400/30'
              }>
                {log.details.encryption_used ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Request Headers */}
    {log.details && log.details.request_headers && Object.keys(log.details.request_headers).length > 0 && (
      <div className="bg-white/5 rounded-xl p-5 border border-white/10">
        <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
          <FileText className="h-4 w-4 text-orange-400" />
          <span>Request Headers</span>
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {Object.entries(log.details.request_headers).map(([key, value]) => (
            <div key={key} className="flex justify-between items-start">
              <span className="text-xs text-gray-400 font-mono">{key}:</span>
              <span className="text-white text-xs font-mono ml-2 break-all">
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Request Body Data */}
    {log.details && log.details.request_body && (
      <div className="bg-white/5 rounded-xl p-5 border border-white/10 lg:col-span-2">
        <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
          <FileText className="h-4 w-4 text-orange-400" />
          <span>Request Body Data</span>
          {log.details.request_body_size && (
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/30">
              {log.details.request_body_size} bytes
            </Badge>
          )}
        </h4>
        <div className="space-y-3">
          {log.details.parsing_error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-red-300 font-medium">Parsing Error Detected</span>
              </div>
              <p className="text-red-200 text-sm">The request body could not be parsed properly.</p>
            </div>
          )}
          <div className="bg-black/30 rounded-lg p-4 border border-white/10">
            <pre className="text-white text-sm overflow-x-auto whitespace-pre-wrap">
              {typeof log.details.request_body === 'string' 
                ? log.details.request_body 
                : JSON.stringify(log.details.request_body, null, 2)}
            </pre>
          </div>
          {log.details.body_keys && log.details.body_keys.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Request Body Fields</p>
              <div className="flex flex-wrap gap-2">
                {log.details.body_keys.map((key, index) => (
                  <Badge key={index} className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                    {key}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Operation Details */}
    {log.details && (
      log.details.update_successful || log.details.creation_successful || log.details.data_retrieved ||
      log.details.attempted_creation || log.details.attempted_update || log.details.validation_failed ||
      log.details.query_failed || log.details.list_users_successful || log.details.test_endpoint
    ) && (
      <div className="bg-white/5 rounded-xl p-5 border border-white/10">
        <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
          <Target className="h-4 w-4 text-green-400" />
          <span>Operation Details</span>
        </h4>
        <div className="space-y-3">
          {log.details.test_endpoint && (
            <div>
              <p className="text-xs text-gray-400">Test Endpoint</p>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                Test Mode
              </Badge>
            </div>
          )}
          {log.details.test_param && (
            <div>
              <p className="text-xs text-gray-400">Test Parameter</p>
              <p className="text-white">{log.details.test_param}</p>
            </div>
          )}
          {log.details.new_user_id && (
            <div>
              <p className="text-xs text-gray-400">New User ID</p>
              <p className="text-white font-mono">{log.details.new_user_id}</p>
            </div>
          )}
          {(log.details.email || log.details.email_attempted) && (
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-white">{log.details.email || log.details.email_attempted}</p>
            </div>
          )}
          {log.details.updated_fields && log.details.updated_fields.length > 0 && (
            <div>
              <p className="text-xs text-gray-400">Updated Fields</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {log.details.updated_fields.map((field, index) => (
                  <Badge key={index} className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {log.details.alert_id && (
            <div>
              <p className="text-xs text-gray-400">Alert ID</p>
              <p className="text-white font-mono">{log.details.alert_id}</p>
            </div>
          )}
          {log.details.alert_type && (
            <div>
              <p className="text-xs text-gray-400">Alert Type</p>
              <Badge className="bg-red-500/20 text-red-300 border-red-400/30">
                {log.details.alert_type}
              </Badge>
            </div>
          )}
          {log.details.alert_title && (
            <div>
              <p className="text-xs text-gray-400">Alert Title</p>
              <p className="text-white">{log.details.alert_title}</p>
            </div>
          )}
          {log.details.users_count !== undefined && (
            <div>
              <p className="text-xs text-gray-400">Users Count</p>
              <p className="text-white">{log.details.users_count}</p>
            </div>
          )}
          {log.details.alerts_count !== undefined && (
            <div>
              <p className="text-xs text-gray-400">Alerts Count</p>
              <p className="text-white">{log.details.alerts_count}</p>
            </div>
          )}
          {log.details.limit_applied && log.details.limit_applied !== 'none' && (
            <div>
              <p className="text-xs text-gray-400">Limit Applied</p>
              <p className="text-white">{log.details.limit_applied}</p>
            </div>
          )}
          
          {/* Operation Status Indicators */}
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-gray-400 mb-2">Operation Status</p>
            <div className="flex flex-wrap gap-2">
              {log.details.update_successful && (
                <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                  ✓ Update Successful
                </Badge>
              )}
              {log.details.creation_successful && (
                <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                  ✓ Creation Successful
                </Badge>
              )}
              {log.details.data_retrieved && (
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                  ✓ Data Retrieved
                </Badge>
              )}
              {log.details.data_received && (
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                  ✓ Data Received
                </Badge>
              )}
              {log.details.data_updated && (
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
                  ✓ Data Updated
                </Badge>
              )}
              {log.details.list_users_successful && (
                <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                  ✓ List Users Successful
                </Badge>
              )}
              {log.details.attempted_creation && (
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/30">
                  ⚠ Creation Attempted
                </Badge>
              )}
              {log.details.attempted_update && (
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/30">
                  ⚠ Update Attempted
                </Badge>
              )}
              {log.details.validation_failed && (
                <Badge className="bg-red-500/20 text-red-300 border-red-400/30">
                  ✗ Validation Failed
                </Badge>
              )}
              {log.details.creation_failed && (
                <Badge className="bg-red-500/20 text-red-300 border-red-400/30">
                  ✗ Creation Failed
                </Badge>
              )}
              {log.details.query_failed && (
                <Badge className="bg-red-500/20 text-red-300 border-red-400/30">
                  ✗ Query Failed
                </Badge>
              )}
              {log.details.list_users_failed && (
                <Badge className="bg-red-500/20 text-red-300 border-red-400/30">
                  ✗ List Users Failed
                </Badge>
              )}
              {log.details.parsing_error && (
                <Badge className="bg-red-500/20 text-red-300 border-red-400/30">
                  ✗ Parsing Error
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Performance Metrics */}
    {log.details && (log.details.duration_ms || log.details.data_size || log.details.request_body_size) && (
      <div className="bg-white/5 rounded-xl p-5 border border-white/10">
        <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          <span>Performance Metrics</span>
        </h4>
        <div className="grid grid-cols-1 gap-4">
          {log.details.duration_ms && (
            <div>
              <p className="text-xs text-gray-400">Response Time</p>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span className="text-white font-mono">{log.details.duration_ms}ms</span>
                <Badge className={`${
                  log.details.duration_ms < 100 ? 'bg-green-500/20 text-green-300 border-green-400/30' :
                  log.details.duration_ms < 500 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' :
                  'bg-red-500/20 text-red-300 border-red-400/30'
                }`}>
                  {log.details.duration_ms < 100 ? 'Fast' : 
                   log.details.duration_ms < 500 ? 'Normal' : 'Slow'}
                </Badge>
              </div>
            </div>
          )}
          {log.details.data_size && (
            <div>
              <p className="text-xs text-gray-400">Response Data Size</p>
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-green-400" />
                <span className="text-white font-mono">{(log.details.data_size / 1024).toFixed(2)} KB</span>
              </div>
            </div>
          )}
          {log.details.request_body_size && (
            <div>
              <p className="text-xs text-gray-400">Request Body Size</p>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-orange-400" />
                <span className="text-white font-mono">
                  {log.details.request_body_size < 1024 
                    ? `${log.details.request_body_size} bytes`
                    : `${(log.details.request_body_size / 1024).toFixed(2)} KB`
                  }
                </span>
                <Badge className={`${
                  log.details.request_body_size < 1024 ? 'bg-green-500/20 text-green-300 border-green-400/30' :
                  log.details.request_body_size < 10240 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' :
                  'bg-red-500/20 text-red-300 border-red-400/30'
                }`}>
                  {log.details.request_body_size < 1024 ? 'Small' : 
                   log.details.request_body_size < 10240 ? 'Medium' : 'Large'}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
)

const ContextInformation = ({ context }: { context: AuditLogEntry['context'] }) => (
  <div className="bg-purple-500/10 rounded-xl p-6 border border-purple-400/20">
    <h3 className="text-xl font-semibold text-purple-300 mb-4 flex items-center space-x-2">
      <MapPin className="h-6 w-6" />
      <span>Context Information</span>
    </h3>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-400 mb-2">Time Context</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Time of Day</span>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                {context?.time_of_day || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Day of Week</span>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                {context?.day_of_week || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Business Hours</span>
              <Badge className={context?.is_business_hours 
                ? 'bg-green-500/20 text-green-300 border-green-400/30'
                : 'bg-orange-500/20 text-orange-300 border-orange-400/30'
              }>
                {context?.is_business_hours ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-400 mb-2">Session Context</p>
          <div className="space-y-2">
            {context?.session_duration !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Session Duration</span>
                <span className="text-white font-mono">{context.session_duration} min</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Geographic Location</span>
              <span className="text-white">{context?.geographic_location || 'Unknown'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

const RelatedEvents = ({ events }: { events: RelatedEvent[] }) => (
  <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-400/20">
    <h3 className="text-xl font-semibold text-blue-300 mb-4 flex items-center space-x-2">
      <Clock className="h-6 w-6" />
      <span>Related Events ({events.length})</span>
    </h3>
    
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {events.map((event, index) => (
        <div key={event.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <EventTypeIcon eventType={event.event_type} />
              <div>
                <p className="text-white font-medium">{event.action}</p>
                <p className="text-xs text-gray-400">{event.event_type.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="text-right">
              <StatusIcon success={event.success} />
              <p className="text-xs text-gray-400 mt-1">
                {new Date(event.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

const LogContent = ({ log }: { log: AuditLogEntry }) => (
  <div className="space-y-8">
    {/* Log Overview */}
    <LogOverview log={log} />

    {/* Security Analysis */}
    {log.security_analysis && (
      <SecurityAnalysisCard analysis={log.security_analysis} />
    )}

    {/* Context Information */}
    {log.context && (
      <ContextInformation context={log.context} />
    )}

    {/* Technical Details */}
    <div>
      <h3 className="text-xl font-semibold text-white mb-6">Technical Details</h3>
      <TechnicalDetails log={log} />
    </div>

    {/* Related Events */}
    {log.related_events && log.related_events.length > 0 && (
      <RelatedEvents events={log.related_events} />
    )}
  </div>
)

export function AuditLogDetailModal({ logId, isOpen, onClose }: AuditLogDetailModalProps) {
  const [log, setLog] = useState<AuditLogEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && logId) {
      // Reset state when modal opens
      setLog(null)
      setError(null)
      setLoading(true)
      fetchAuditLogDetails()
    } else if (!isOpen) {
      // Reset state when modal closes
      setLog(null)
      setError(null)
      setLoading(false)
    }
  }, [isOpen, logId])

  const fetchAuditLogDetails = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/audit/logs/${logId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch audit log details')
      }
      
      const data = await response.json()
      console.log('📥 Audit log detail response:', data)
      
      // Handle both old and new response formats
      let logData
      if (data.success && data.data?.log) {
        // New format: { success: true, data: { log: {...} } }
        logData = data.data.log
      } else if (data.log) {
        // Old format: { log: {...} }
        logData = data.log
      } else if (data.success && data.data) {
        // Direct data format
        logData = data.data
      } else {
        // Fallback
        logData = data
      }
      
      console.log('📊 Processed log data:', logData)
      setLog(logData)
    } catch (err) {
      console.error('❌ Failed to fetch audit log details:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <GlassCard className="w-full max-w-6xl mx-4 h-[90vh] flex flex-col max-h-[90vh]">
        {/* Header */}
        <ModalHeader log={log} onClose={onClose} />

        {/* Status Messages */}
        <div className="flex-shrink-0 px-6">
          {error && <StatusMessage type="error" message={error} />}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {loading ? (
            <SkeletonLoader />
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <AlertTriangle className="h-16 w-16 text-red-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Audit Log</h3>
              <p className="text-gray-400 text-center max-w-md mb-6">
                We couldn't load the audit log details. This might be due to a network issue or the log may not exist.
              </p>
              <Button
                onClick={fetchAuditLogDetails}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                Try Again
              </Button>
            </div>
          ) : log ? (
            <LogContent log={log} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No audit log data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && log && (
          <div className="flex-shrink-0 p-6 border-t border-white/10">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="text-sm text-gray-400 text-center sm:text-left">
                🔒 This audit log is part of our HIPAA compliance monitoring system.
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-600 text-gray-300 hover:bg-white/5"
                >
                  Close
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                  Print Details
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error State Footer */}
        {error && (
          <div className="flex-shrink-0 p-6 border-t border-white/10">
            <div className="flex justify-center space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:bg-white/5"
              >
                Close
              </Button>
              <Button
                onClick={fetchAuditLogDetails}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </Modal>
  )
} 