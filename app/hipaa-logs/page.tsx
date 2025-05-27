"use client"

import React, { useState, useEffect } from 'react'
import { Shield, Download, Filter, Search, Calendar, AlertTriangle, Eye, Database, Lock, Activity, RefreshCw, CheckCircle, Clock } from 'lucide-react'
import { GlassCard } from '@/components/atoms/glass-card'
import { Button } from '@/components/ui/button'
import { useSecureAPI } from '@/lib/hooks/use-secure-api'
import { useSecurity } from '@/app/contexts/security-context'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PageLayout } from '@/components/layouts/page-layout'
import { StatsCard } from '@/components/ui/stats-card'
import { ContentSection } from '@/components/ui/content-section'
import { ActionButton } from '@/components/ui/action-button'

interface AuditLogEntry {
  id: string
  created_at: string
  event_type: string
  user_id: string
  resource_type: string
  resource_id?: string
  action: string
  ip_address: string
  user_agent: string
  success: boolean
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  details?: Record<string, any>
}

interface AuditStats {
  totalEvents: number
  criticalEvents: number
  failedAttempts: number
  uniqueUsers: number
}

export default function HIPAALogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState<AuditStats>({ totalEvents: 0, criticalEvents: 0, failedAttempts: 0, uniqueUsers: 0 })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [exporting, setExporting] = useState(false)
  
  const api = useSecureAPI()
  const { securityEvents } = useSecurity()

  useEffect(() => {
    loadLogs()
  }, [timeRange, riskFilter, eventTypeFilter])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const response = await api.get(
        `/api/audit/logs?timeRange=${timeRange}&riskLevel=${riskFilter}&eventType=${eventTypeFilter}&limit=100`
      )
      
      if (response.success && response.data) {
        setLogs(response.data.logs || [])
        
        // Calculate stats
        const totalEvents = response.data.logs?.length || 0
        const criticalEvents = response.data.logs?.filter((log: AuditLogEntry) => log.risk_level === 'critical').length || 0
        const failedAttempts = response.data.logs?.filter((log: AuditLogEntry) => !log.success).length || 0
        const uniqueUsers = new Set(response.data.logs?.map((log: AuditLogEntry) => log.user_id)).size || 0
        
        setStats({ totalEvents, criticalEvents, failedAttempts, uniqueUsers })
      }
    } catch (error) {
      console.error('Failed to load HIPAA logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportLogs = async (format: 'csv' | 'json') => {
    setExporting(true)
    try {
      const response = await fetch(
        `/api/audit/export?timeRange=${timeRange}&format=${format}&riskLevel=${riskFilter}`
      )
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `hipaa-audit-logs-${timeRange}-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export logs:', error)
    } finally {
      setExporting(false)
    }
  }

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

  const filteredLogs = logs.filter(log => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        log.user_id?.toLowerCase().includes(searchLower) ||
        log.resource_type?.toLowerCase().includes(searchLower) ||
        log.action?.toLowerCase().includes(searchLower) ||
        log.ip_address?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const eventTypes = [...new Set(logs.map(log => log.event_type))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">HIPAA Audit Logs</h1>
            <p className="text-gray-400 mt-1">
              Comprehensive audit trail for PHI access and system events
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={loadLogs}
            variant="outline"
            size="sm"
            className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={() => exportLogs('csv')}
            variant="outline"
            size="sm"
            className="border-green-400 text-green-400 hover:bg-green-400/10"
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <Button
            onClick={() => exportLogs('json')}
            variant="outline"
            size="sm"
            className="border-blue-400 text-blue-400 hover:bg-blue-400/10"
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Recent Security Events Alert */}
      {securityEvents.length > 0 && (
        <GlassCard className="p-4 border-yellow-500/30 bg-yellow-500/10">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-400 mb-2">
                Recent Security Events ({securityEvents.length})
              </h3>
              <div className="space-y-1">
                {securityEvents.slice(-3).map((event, index) => (
                  <div key={index} className="text-xs text-gray-300">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      event.severity === 'critical' ? 'bg-red-400' :
                      event.severity === 'high' ? 'bg-orange-400' :
                      event.severity === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />
                    {event.message}
                    <span className="text-gray-500 ml-2">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Events</p>
              <p className="text-2xl font-bold text-white">{stats.totalEvents}</p>
            </div>
            <Shield className="h-8 w-8 text-cyan-400" />
          </div>
        </GlassCard>
        
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Critical Events</p>
              <p className="text-2xl font-bold text-red-400">{stats.criticalEvents}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </GlassCard>
        
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Failed Attempts</p>
              <p className="text-2xl font-bold text-orange-400">{stats.failedAttempts}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
        </GlassCard>
        
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Unique Users</p>
              <p className="text-2xl font-bold text-green-400">{stats.uniqueUsers}</p>
            </div>
            <Eye className="h-8 w-8 text-green-400" />
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by user, action, or resource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input"
            />
          </div>
                     <Select value={timeRange} onValueChange={(value) => setTimeRange(value as '24h' | '7d' | '30d')}>
            <SelectTrigger className="w-full md:w-40 glass-input">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-full md:w-40 glass-input">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-full md:w-40 glass-input">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {eventTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace('_', ' ').toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Logs Table */}
      <GlassCard className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Audit Trail</h2>
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30">
              {filteredLogs.length} events
            </Badge>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-white/5 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getEventTypeIcon(log.event_type)}
                        <span className="text-white font-medium">{log.action}</span>
                      </div>
                      <Badge className={getRiskLevelColor(log.risk_level)}>
                        {log.risk_level}
                      </Badge>
                      <span className="text-gray-400 text-sm">{log.user_id}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm">{new Date(log.created_at).toLocaleString()}</p>
                      <p className="text-gray-400 text-xs">{log.ip_address}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-400">
                    <span className="mr-4">Resource: {log.resource_type}</span>
                    <span className="mr-4">Status: {log.success ? '✓ Success' : '✗ Failed'}</span>
                    {log.details?.session_id && (
                      <span>Session: {log.details.session_id}</span>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredLogs.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No audit logs found for the selected criteria.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  )
} 