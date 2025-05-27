"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Shield, AlertTriangle, Eye, Activity, Clock, Users, Database, Lock } from 'lucide-react'
import { GlassCard } from '@/components/atoms/glass-card'
import { Button } from '@/components/ui/button'
import { useSecureAPI } from '@/lib/hooks/use-secure-api'

interface AuditLogEntry {
  id: string
  timestamp: string
  event_type: string
  user_id: string
  resource_type: string
  action: string
  ip_address: string
  success: boolean
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  details?: Record<string, any>
}

interface SecurityMetrics {
  totalEvents: number
  failedAttempts: number
  uniqueUsers: number
  highRiskEvents: number
  averageSessionDuration: number
  dataAccessCount: number
}

interface SecurityDashboardProps {
  className?: string
}

export function SecurityDashboard({ className }: SecurityDashboardProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  
  const api = useSecureAPI()

  // Memoize the loadSecurityData function to prevent unnecessary re-creation
  const loadSecurityData = useCallback(async () => {
    if (loading) return // Prevent multiple simultaneous calls
    
    setLoading(true)
    try {
      // Load audit logs
      const logsResponse = await api.get(
        `/api/audit/logs?timeRange=${timeRange}&riskLevel=${filterRiskLevel}`
      )
      
      if (logsResponse.success && logsResponse.data) {
        setAuditLogs(logsResponse.data.logs || [])
      }

      // Load security metrics
      const metricsResponse = await api.get(
        `/api/audit/metrics?timeRange=${timeRange}`
      )
      
      if (metricsResponse.success && metricsResponse.data) {
        setMetrics(metricsResponse.data.metrics)
      }
    } catch (error) {
      console.error('Failed to load security data:', error)
    } finally {
      setLoading(false)
    }
  }, [timeRange, filterRiskLevel, api.get, loading]) // Use api.get instead of api

  // Use effect with stable dependencies
  useEffect(() => {
    loadSecurityData()
  }, [loadSecurityData])

  // Memoize exportAuditLogs function
  const exportAuditLogs = useCallback(async () => {
    try {
      const response = await api.get(
        `/api/audit/export?timeRange=${timeRange}&format=csv`
      )
      
      if (response.success && response.data) {
        // Create and download CSV file
        const blob = new Blob([response.data.csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-logs-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export audit logs:', error)
    }
  }, [timeRange, api.get]) // Stable dependencies

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'data_access': return <Eye className="h-4 w-4" />
      case 'data_modification': return <Database className="h-4 w-4" />
      case 'login_attempt': return <Lock className="h-4 w-4" />
      case 'failed_access': return <AlertTriangle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
            <p className="text-gray-400">HIPAA Compliance & Audit Monitoring</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <Button
            onClick={exportAuditLogs}
            variant="outline"
            className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
          >
            Export Logs
          </Button>
        </div>
      </div>

      {/* Security Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Events</p>
                <p className="text-2xl font-bold text-white">{metrics.totalEvents.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-cyan-400" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Failed Attempts</p>
                <p className="text-2xl font-bold text-red-400">{metrics.failedAttempts.toLocaleString()}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-green-400">{metrics.uniqueUsers.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-green-400" />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">High Risk Events</p>
                <p className="text-2xl font-bold text-orange-400">{metrics.highRiskEvents.toLocaleString()}</p>
              </div>
              <Shield className="h-8 w-8 text-orange-400" />
            </div>
          </GlassCard>
        </div>
      )}

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm text-gray-400">Filter by Risk Level:</label>
          <select
            value={filterRiskLevel}
            onChange={(e) => setFilterRiskLevel(e.target.value)}
            className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
          >
            <option value="all">All Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </GlassCard>

      {/* Audit Logs */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Audit Logs</h2>
          <Button
            onClick={loadSecurityData}
            variant="ghost"
            size="sm"
            className="text-cyan-400 hover:bg-cyan-400/10"
          >
            Refresh
          </Button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No audit logs found for the selected criteria.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getEventTypeIcon(log.event_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-white">
                        {log.event_type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs border ${getRiskLevelColor(log.risk_level)}`}>
                        {log.risk_level.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1">
                      User: {log.user_id} • Resource: {log.resource_type} • Action: {log.action}
                    </div>
                    
                    {log.details && (
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        {JSON.stringify(log.details).substring(0, 100)}...
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs text-gray-400">
                  <span>{log.ip_address}</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimestamp(log.timestamp)}</span>
                  </span>
                  <div className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Compliance Status */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">HIPAA Compliance Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full" />
            <div>
              <p className="text-sm font-medium text-white">Audit Logging</p>
              <p className="text-xs text-gray-400">Active & Compliant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full" />
            <div>
              <p className="text-sm font-medium text-white">Data Encryption</p>
              <p className="text-xs text-gray-400">AES-256-GCM</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full" />
            <div>
              <p className="text-sm font-medium text-white">Access Control</p>
              <p className="text-xs text-gray-400">RLS Enabled</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
} 