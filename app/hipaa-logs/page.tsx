"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Download, Filter, Search, Calendar, AlertTriangle, Eye, Database, Lock, Activity, RefreshCw, CheckCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { AuditLogDetailModal } from '@/components/organisms/audit-log-detail-modal'

interface AuditLogEntry {
  id: string
  timestamp: string
  created_at?: string
  event_type: string
  user_id: string
  resource_type: string
  resource_id?: string
  action: string
  ip_address: string
  user_agent: string
  success: boolean
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  duration_ms?: number
  cache_hit?: boolean
  threat_level?: string
  details?: Record<string, any>
}

interface AuditStats {
  totalEvents: number
  criticalEvents: number
  failedAttempts: number
  uniqueUsers: number
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Virtual List Item Component
const VirtualLogItem = React.memo(({ log, style, onClick }: { log: AuditLogEntry; style: React.CSSProperties; onClick?: (logId: string) => void }) => {
  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'data_access': return <Eye className="h-4 w-4" />
      case 'data_modification': return <Database className="h-4 w-4" />
      case 'data_deletion': return <AlertTriangle className="h-4 w-4 text-red-400" />
      case 'login_attempt': return <Lock className="h-4 w-4" />
      case 'logout': return <Lock className="h-4 w-4 text-gray-400" />
      case 'failed_access': return <AlertTriangle className="h-4 w-4 text-red-400" />
      case 'security_event': return <Shield className="h-4 w-4 text-orange-400" />
      case 'api_request': return <Activity className="h-4 w-4" />
      case 'system_access': return <Database className="h-4 w-4 text-blue-400" />
      case 'export_data': return <Download className="h-4 w-4 text-yellow-400" />
      case 'biomarker_extraction': return <Activity className="h-4 w-4 text-green-400" />
      case 'lab_report_upload': return <Database className="h-4 w-4 text-purple-400" />
      case 'health_alert_creation': return <AlertTriangle className="h-4 w-4 text-orange-400" />
      case 'system_maintenance': return <RefreshCw className="h-4 w-4 text-gray-400" />
      default: return <Activity className="h-4 w-4" />
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

  return (
    <div style={style} className="px-2">
      <div 
        className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors mb-2 cursor-pointer"
        onClick={() => onClick?.(log.id)}
      >
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
            <p className="text-white text-sm">{new Date(log.timestamp || log.created_at || new Date()).toLocaleString()}</p>
            <p className="text-gray-400 text-xs">{log.ip_address}</p>
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-400">
          <span className="mr-4">Resource: {log.resource_type}</span>
          <span className="mr-4">Status: {log.success ? '✓ Success' : '✗ Failed'}</span>
          {log.details?.api_endpoint && (
            <span className="mr-4">API: {log.details.api_endpoint}</span>
          )}
          {(log.duration_ms || log.details?.duration_ms) && (
            <span className="mr-4">Duration: {log.duration_ms || log.details?.duration_ms}ms</span>
          )}
          {log.details?.response_status && (
            <span className="mr-4">HTTP: {log.details.response_status}</span>
          )}
          {log.cache_hit !== undefined && (
            <span className="mr-4">Cache: {log.cache_hit ? '✓ Hit' : '✗ Miss'}</span>
          )}
          {log.threat_level && log.threat_level !== 'low' && (
            <span className="mr-4 text-orange-400">Threat: {log.threat_level}</span>
          )}
        </div>
      </div>
    </div>
  )
})

VirtualLogItem.displayName = 'VirtualLogItem'

// Simple Virtual List Component
const VirtualList = ({ 
  items, 
  itemHeight = 100, 
  containerHeight = 400,
  onLoadMore,
  hasMore,
  loading,
  onItemClick
}: {
  items: AuditLogEntry[]
  itemHeight?: number
  containerHeight?: number
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
  onItemClick?: (logId: string) => void
}) => {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(visibleStart + Math.ceil(containerHeight / itemHeight) + 1, items.length)
  const visibleItems = items.slice(visibleStart, visibleEnd)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    setScrollTop(scrollTop)

    // Infinite scroll trigger
    if (onLoadMore && hasMore && !loading) {
      const { scrollHeight, clientHeight } = e.currentTarget
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        onLoadMore()
      }
    }
  }, [onLoadMore, hasMore, loading])

  return (
    <div 
      ref={containerRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <VirtualLogItem
            key={item.id}
            log={item}
            onClick={onItemClick}
            style={{
              position: 'absolute',
              top: (visibleStart + index) * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          />
        ))}
        {loading && (
          <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mx-auto"></div>
            <p className="text-gray-400 text-sm mt-2">Loading more logs...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HIPAALogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState<AuditStats>({ totalEvents: 0, criticalEvents: 0, failedAttempts: 0, uniqueUsers: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '12h' | '24h' | '7d' | '30d' | 'all'>('24h')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [apiEndpointFilter, setApiEndpointFilter] = useState<string>('all')
  const [exporting, setExporting] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
    hasNextPage: false,
    hasPreviousPage: false
  })
  const [viewMode, setViewMode] = useState<'virtual' | 'pagination'>('virtual')
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const api = useSecureAPI()
  const { securityEvents } = useSecurity()
  const router = useRouter()

  // Memoize the loadLogs function to prevent unnecessary re-creation
  const loadLogs = useCallback(async (page = 1, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      // Build query parameters with proper encoding
      const params = new URLSearchParams({
        timeRange: timeRange,
        riskLevel: riskFilter,
        eventType: eventTypeFilter,
        apiEndpoint: apiEndpointFilter,
        limit: pagination.itemsPerPage.toString(),
        page: page.toString()
      })

      console.log('🔍 Making API request:', `/api/audit/logs?${params.toString()}`)
      const response = await api.get(`/api/audit/logs?${params.toString()}`)
      console.log('📥 API response:', response)
      
      if (response.success || (response.data && !response.hasOwnProperty('success'))) {
        // Handle both old and new response formats
        // Priority: response.data.data (new format) > response.data (old format) > response (direct data)
        let responseData
        if (response.data?.data) {
          responseData = response.data.data
        } else if (response.data?.logs) {
          responseData = response.data
        } else if ('logs' in response && response.logs) {
          responseData = response
        } else {
          responseData = response.data || response
        }
        
        console.log('📊 Response data:', responseData)
        const newLogs = responseData.logs || []
        
        if (!Array.isArray(newLogs)) {
          console.error('❌ Expected logs to be an array, got:', typeof newLogs, newLogs)
          throw new Error('Invalid response format: logs is not an array')
        }
        
        if (append) {
          setLogs(prev => [...prev, ...newLogs])
        } else {
          setLogs(newLogs)
        }
        
        // Update pagination info from API response
        const paginationData = responseData.pagination || {}
        const totalItems = paginationData.total || newLogs.length
        const totalPages = paginationData.totalPages || Math.ceil(totalItems / pagination.itemsPerPage)
        
        setPagination(prev => ({
          ...prev,
          currentPage: paginationData.page || page,
          totalPages,
          totalItems,
          hasNextPage: paginationData.hasNext || false,
          hasPreviousPage: paginationData.hasPrev || false
        }))
        
        // Use statistics from API response if available, otherwise calculate
        if (!append) {
          const apiStats = responseData.statistics
          if (apiStats) {
            setStats({
              totalEvents: apiStats.total_records || 0,
              criticalEvents: apiStats.risk_distribution?.critical || 0,
              failedAttempts: Math.round(totalItems * (1 - (apiStats.success_rate || 0) / 100)),
              uniqueUsers: new Set(newLogs.map((log: AuditLogEntry) => log.user_id)).size
            })
          } else {
            // Fallback calculation
            const totalEvents = totalItems
            const criticalEvents = newLogs.filter((log: AuditLogEntry) => log.risk_level === 'critical').length
            const failedAttempts = newLogs.filter((log: AuditLogEntry) => !log.success).length
            const uniqueUsers = new Set(newLogs.map((log: AuditLogEntry) => log.user_id)).size
            
            setStats({ totalEvents, criticalEvents, failedAttempts, uniqueUsers })
          }
        }
      }
    } catch (error) {
      console.error('Failed to load HIPAA logs:', error)
      // Show user-friendly error message
      setError(error instanceof Error ? error.message : 'Failed to load audit logs')
      setStats({ totalEvents: 0, criticalEvents: 0, failedAttempts: 0, uniqueUsers: 0 })
      setLogs([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [timeRange, riskFilter, eventTypeFilter, apiEndpointFilter, pagination.itemsPerPage, api.get]) // Use api.get instead of api

  // Memoize loadMoreLogs to prevent recreation
  const loadMoreLogs = useCallback(() => {
    if (pagination.hasNextPage && !loadingMore) {
      loadLogs(pagination.currentPage + 1, true)
    }
  }, [pagination.hasNextPage, pagination.currentPage, loadingMore, loadLogs])

  // Memoize goToPage to prevent recreation
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      loadLogs(page, false)
    }
  }, [pagination.totalPages, loadLogs])

  // Use effect with stable dependencies
  useEffect(() => {
    setError(null) // Clear previous errors
    loadLogs(1, false)
  }, [loadLogs]) // Only depend on the memoized loadLogs function

  // Memoize exportLogs function
  const exportLogs = useCallback(async (format: 'csv' | 'json') => {
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
  }, [timeRange, riskFilter]) // Stable dependencies

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs
    
    const searchLower = searchTerm.toLowerCase()
    return logs.filter(log => 
      log.user_id?.toLowerCase().includes(searchLower) ||
      log.resource_type?.toLowerCase().includes(searchLower) ||
      log.action?.toLowerCase().includes(searchLower) ||
      log.ip_address?.toLowerCase().includes(searchLower) ||
      log.details?.api_endpoint?.toLowerCase().includes(searchLower) ||
      log.details?.http_method?.toLowerCase().includes(searchLower)
    )
  }, [logs, searchTerm])

  const eventTypes = useMemo(() => 
    [...new Set(logs.map(log => log.event_type))], 
    [logs]
  )

  const apiEndpoints = useMemo(() => 
    [...new Set(logs.map(log => log.details?.api_endpoint).filter(Boolean))], 
    [logs]
  )

  const handleLogClick = (logId: string) => {
    setSelectedLogId(logId)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedLogId(null)
  }

  const renderPaginationControls = () => (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center space-x-2">
        <Button
          onClick={() => goToPage(pagination.currentPage - 1)}
          disabled={!pagination.hasPreviousPage || loading}
          variant="outline"
          size="sm"
          className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <span className="text-gray-400 text-sm">
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>
        
        <Button
          onClick={() => goToPage(pagination.currentPage + 1)}
          disabled={!pagination.hasNextPage || loading}
          variant="outline"
          size="sm"
          className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className="text-gray-400 text-sm">
          Showing {Math.min(pagination.itemsPerPage, filteredLogs.length)} of {pagination.totalItems} logs
        </span>
        
        <Select 
          value={pagination.itemsPerPage.toString()} 
          onValueChange={(value) => {
            setPagination(prev => ({ ...prev, itemsPerPage: parseInt(value) }))
            loadLogs(1, false)
          }}
        >
          <SelectTrigger className="w-20 glass-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="200">200</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <PageLayout
      title="HIPAA Audit Logs"
      subtitle="Comprehensive audit trail for PHI access and system events"
      icon={<Shield className="h-6 w-6 text-cyan-400" />}
      showBackButton={true}
      showRefreshButton={true}
      onRefresh={() => loadLogs(1, false)}
      isRefreshing={loading}
      onBack={() => router.back()}
      actions={
        <>
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
        </>
      }
    >
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
              placeholder="Search by user, action, resource, API endpoint..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input"
            />
          </div>
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | 'all')}>
            <SelectTrigger className="w-full md:w-40 glass-input">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="12h">Last 12 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
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
              <SelectItem value="data_access">Data Access</SelectItem>
              <SelectItem value="data_modification">Data Modification</SelectItem>
              <SelectItem value="data_deletion">Data Deletion</SelectItem>
              <SelectItem value="login_attempt">Login Attempt</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="failed_access">Failed Access</SelectItem>
              <SelectItem value="export_data">Export Data</SelectItem>
              <SelectItem value="print_data">Print Data</SelectItem>
              <SelectItem value="biomarker_extraction">Biomarker Extraction</SelectItem>
              <SelectItem value="lab_report_upload">Lab Report Upload</SelectItem>
              <SelectItem value="health_alert_creation">Health Alert Creation</SelectItem>
              <SelectItem value="security_event">Security Event</SelectItem>
              <SelectItem value="api_request">API Request</SelectItem>
              <SelectItem value="system_access">System Access</SelectItem>
              <SelectItem value="system_maintenance">System Maintenance</SelectItem>
              {eventTypes.filter(type => ![
                'data_access', 'data_modification', 'data_deletion', 'login_attempt', 'logout',
                'failed_access', 'export_data', 'print_data', 'biomarker_extraction',
                'lab_report_upload', 'health_alert_creation', 'security_event', 'api_request',
                'system_access', 'system_maintenance'
              ].includes(type)).map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, ' ').toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={apiEndpointFilter} onValueChange={setApiEndpointFilter}>
            <SelectTrigger className="w-full md:w-48 glass-input">
              <SelectValue placeholder="API Endpoint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Endpoints</SelectItem>
              {apiEndpoints.map(endpoint => (
                <SelectItem key={endpoint} value={endpoint}>
                  {endpoint}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'virtual' | 'pagination')}>
            <SelectTrigger className="w-full md:w-40 glass-input">
              <SelectValue placeholder="View Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="virtual">Virtual Scroll</SelectItem>
              <SelectItem value="pagination">Pagination</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Error Display */}
      {error && (
        <GlassCard className="p-4 border-red-500/30 bg-red-500/10">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-400 mb-1">
                Error Loading Audit Logs
              </h3>
              <p className="text-xs text-gray-300">{error}</p>
              <Button
                onClick={() => {
                  setError(null)
                  loadLogs(1, false)
                }}
                variant="outline"
                size="sm"
                className="mt-2 border-red-400 text-red-400 hover:bg-red-400/10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Logs Display */}
      <GlassCard className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Audit Trail</h2>
            <div className="flex items-center space-x-2">
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30">
                {filteredLogs.length} events
              </Badge>
              {viewMode === 'virtual' && (
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                  Virtual Scroll
                </Badge>
              )}
            </div>
          </div>
          
          {loading && !loadingMore ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-white/5 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No audit logs found for the selected criteria.</p>
            </div>
          ) : (
            <>
              {viewMode === 'virtual' ? (
                <VirtualList
                  items={filteredLogs}
                  itemHeight={100}
                  containerHeight={600}
                  onLoadMore={loadMoreLogs}
                  hasMore={pagination.hasNextPage}
                  loading={loadingMore}
                  onItemClick={handleLogClick}
                />
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => handleLogClick(log.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {(() => {
                              switch (log.event_type) {
                                case 'data_access': return <Eye className="h-4 w-4" />
                                case 'data_modification': return <Database className="h-4 w-4" />
                                case 'data_deletion': return <AlertTriangle className="h-4 w-4 text-red-400" />
                                case 'login_attempt': return <Lock className="h-4 w-4" />
                                case 'logout': return <Lock className="h-4 w-4 text-gray-400" />
                                case 'failed_access': return <AlertTriangle className="h-4 w-4 text-red-400" />
                                case 'security_event': return <Shield className="h-4 w-4 text-orange-400" />
                                case 'api_request': return <Activity className="h-4 w-4" />
                                case 'system_access': return <Database className="h-4 w-4 text-blue-400" />
                                case 'export_data': return <Download className="h-4 w-4 text-yellow-400" />
                                case 'biomarker_extraction': return <Activity className="h-4 w-4 text-green-400" />
                                case 'lab_report_upload': return <Database className="h-4 w-4 text-purple-400" />
                                case 'health_alert_creation': return <AlertTriangle className="h-4 w-4 text-orange-400" />
                                case 'system_maintenance': return <RefreshCw className="h-4 w-4 text-gray-400" />
                                default: return <Activity className="h-4 w-4" />
                              }
                            })()}
                            <span className="text-white font-medium">{log.action}</span>
                          </div>
                          <Badge className={(() => {
                            switch (log.risk_level) {
                              case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30'
                              case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
                              case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
                              case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30'
                              default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
                            }
                          })()}>
                            {log.risk_level}
                          </Badge>
                          <span className="text-gray-400 text-sm">{log.user_id}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm">{new Date(log.timestamp || log.created_at || new Date()).toLocaleString()}</p>
                          <p className="text-gray-400 text-xs">{log.ip_address}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-400">
                        <span className="mr-4">Resource: {log.resource_type}</span>
                        <span className="mr-4">Status: {log.success ? '✓ Success' : '✗ Failed'}</span>
                        {log.details?.api_endpoint && (
                          <span className="mr-4">API: {log.details.api_endpoint}</span>
                        )}
                        {(log.duration_ms || log.details?.duration_ms) && (
                          <span className="mr-4">Duration: {log.duration_ms || log.details?.duration_ms}ms</span>
                        )}
                        {log.details?.response_status && (
                          <span className="mr-4">HTTP: {log.details.response_status}</span>
                        )}
                        {log.cache_hit !== undefined && (
                          <span className="mr-4">Cache: {log.cache_hit ? '✓ Hit' : '✗ Miss'}</span>
                        )}
                        {log.threat_level && log.threat_level !== 'low' && (
                          <span className="mr-4 text-orange-400">Threat: {log.threat_level}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {viewMode === 'pagination' && filteredLogs.length > 0 && renderPaginationControls()}
            </>
          )}
        </div>
      </GlassCard>

      {/* Audit Log Detail Modal */}
      {selectedLogId && (
        <AuditLogDetailModal
          logId={selectedLogId}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
        />
      )}
    </PageLayout>
  )
} 