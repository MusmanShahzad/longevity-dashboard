"use client"

import { useState, useMemo } from "react"
import { AlertTriangle, Brain, Lightbulb, CheckCircle, Calendar, Eye, ChevronDown, ChevronUp } from "lucide-react"
import { GlassCard } from "@/components/atoms/glass-card"
import { Button } from "@/components/ui/button"
import { SleepDataDetailModal } from "@/components/organisms/sleep-data-detail-modal"
import { useHealthAlerts } from "@/lib/hooks/use-health-alerts"
import { useSleepData } from "@/lib/hooks/use-sleep-data"
import type { HealthAlert } from "@/lib/supabase"

interface HealthAlertsCardProps {
  userId: string
}

interface AlertWithSleepData extends HealthAlert {
  sleep_data?: any
}

interface GroupedAlerts {
  [date: string]: AlertWithSleepData[]
}

// Configuration for alert types
const ALERT_CONFIG = {
  warning: { icon: AlertTriangle, color: "text-yellow-400" },
  info: { icon: Lightbulb, color: "text-blue-400" },
  success: { icon: CheckCircle, color: "text-green-400" },
  default: { icon: Brain, color: "text-purple-400" }
} as const

// Constants
const INITIAL_DISPLAY_LIMIT = 5

// Utility functions
const formatDateLong = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

const getAlertDate = (alert: HealthAlert) => {
  return alert.sleep_date || new Date(alert.created_at).toISOString().split("T")[0]
}

// Reusable Components
const CardHeader = ({ alertCount }: { alertCount: number }) => (
  <div className="flex items-center space-x-2">
    <AlertTriangle className="h-6 w-6 text-yellow-400" />
    <h3 className="text-lg font-semibold text-white">Health Insights & AI Suggestions</h3>
  </div>
)

const LoadingSkeleton = () => (
  <GlassCard className="p-6">
    <div className="flex items-center justify-between mb-6">
      <CardHeader alertCount={0} />
    </div>
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="h-24 bg-white/10 rounded-lg"></div>
      ))}
    </div>
  </GlassCard>
)

const EmptyState = () => (
  <div className="text-center py-8">
    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
    <h4 className="text-lg font-semibold text-white mb-2">All Good!</h4>
    <p className="text-gray-400 text-sm">
      No health alerts at the moment. Keep adding sleep data to get personalized insights.
    </p>
  </div>
)

const ErrorState = ({ error }: { error: Error }) => (
  <div className="text-center py-8">
    <div className="text-red-400 text-xl mb-4">⚠️</div>
    <h4 className="text-lg font-semibold text-white mb-2">Failed to Load Health Alerts</h4>
    <p className="text-gray-400 text-sm">{error.message}</p>
  </div>
)

const AlertItem = ({ 
  alert, 
  onAlertClick 
}: { 
  alert: AlertWithSleepData
  onAlertClick: (alert: AlertWithSleepData) => void 
}) => {
  const config = ALERT_CONFIG[alert.type as keyof typeof ALERT_CONFIG] || ALERT_CONFIG.default
  const Icon = config.icon

  return (
    <div
      className={`p-3 rounded-lg bg-white/5 border border-white/10 transition-all duration-200 ${
        alert.sleep_data ? "hover:bg-white/10 cursor-pointer" : ""
      }`}
      onClick={() => alert.sleep_data && onAlertClick(alert)}
    >
      <div className="flex items-start space-x-3">
        <Icon className={`h-4 w-4 mt-0.5 ${config.color}`} />
        <div className="flex-1 space-y-2">
          <div>
            <h5 className="text-sm font-medium text-white">{alert.title}</h5>
            <p className="text-xs text-gray-300">{alert.description}</p>
          </div>
          <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-xs text-cyan-300">
              <span className="font-medium">💡 AI Suggestion:</span> {alert.suggestion}
            </p>
          </div>
          {alert.sleep_data && (
            <div className="text-xs text-blue-400 flex items-center space-x-1">
              <Eye className="h-3 w-3" />
              <span>Click to view sleep data details</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const DateGroup = ({ 
  date, 
  alerts, 
  isExpanded, 
  onToggle, 
  onAlertClick 
}: {
  date: string
  alerts: AlertWithSleepData[]
  isExpanded: boolean
  onToggle: () => void
  onAlertClick: (alert: AlertWithSleepData) => void
}) => {
  const hasData = alerts.some((alert) => alert.sleep_data)
  const suggestionText = `${alerts.length} suggestion${alerts.length !== 1 ? "s" : ""}`

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      {/* Date Header */}
      <div
        className="flex items-center justify-between p-4 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-cyan-400" />
          <div>
            <h4 className="text-sm font-medium text-white">{formatDateLong(date)}</h4>
            <p className="text-xs text-gray-400">
              {suggestionText}
              {hasData && " • Click to view sleep data"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {hasData && <Eye className="h-4 w-4 text-blue-400" />}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Suggestions for this date */}
      {isExpanded && (
        <div className="p-4 space-y-3 bg-white/2">
          {alerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} onAlertClick={onAlertClick} />
          ))}
        </div>
      )}
    </div>
  )
}

export function HealthAlertsCard({ userId }: HealthAlertsCardProps) {
  const [selectedAlert, setSelectedAlert] = useState<AlertWithSleepData | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [showAllAlerts, setShowAllAlerts] = useState(false)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  // React Query hooks
  const { 
    data: healthAlertsData, 
    isLoading: alertsLoading, 
    error: alertsError 
  } = useHealthAlerts(userId)
  
  const { 
    data: sleepDataResponse, 
    isLoading: sleepLoading 
  } = useSleepData(userId)

  const alerts = healthAlertsData?.alerts || []
  const sleepData = sleepDataResponse?.sleepData || []

  const isLoading = alertsLoading || sleepLoading

  // Memoized processed data
  const { alertsWithSleepData, groupedAlerts, sortedDates } = useMemo(() => {
    // Process alerts with sleep data
    const processedAlerts: AlertWithSleepData[] = alerts.map((alert: HealthAlert) => {
      const alertDate = getAlertDate(alert)
      const matchingSleepData = sleepData.find((sleep: any) => sleep.date === alertDate)

      return {
        ...alert,
        sleep_data: matchingSleepData,
      }
    })

    // Group alerts by date
    const grouped: GroupedAlerts = processedAlerts.reduce((acc: GroupedAlerts, alert: AlertWithSleepData) => {
      const date = getAlertDate(alert)
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(alert)
      return acc
    }, {})

    // Sort dates (most recent first)
    const dates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    return {
      alertsWithSleepData: processedAlerts,
      groupedAlerts: grouped,
      sortedDates: dates
    }
  }, [alerts, sleepData])

  // Auto-expand the most recent date on first load
  if (sortedDates.length > 0 && expandedDates.size === 0) {
    setExpandedDates(new Set([sortedDates[0]]))
  }

  const displayDates = showAllAlerts ? sortedDates : sortedDates.slice(0, INITIAL_DISPLAY_LIMIT)

  const handleAlertClick = (alert: AlertWithSleepData) => {
    if (alert.sleep_data) {
      setSelectedAlert(alert)
      setIsDetailModalOpen(true)
    }
  }

  const toggleDateExpansion = (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(date)) {
        newSet.delete(date)
      } else {
        newSet.add(date)
      }
      return newSet
    })
  }

  // Render content based on state
  const renderContent = () => {
    if (isLoading) return <LoadingSkeleton />
    
    if (alertsError) {
      return (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <CardHeader alertCount={0} />
          </div>
          <ErrorState error={alertsError} />
        </GlassCard>
      )
    }

    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <CardHeader alertCount={alertsWithSleepData.length} />
          {alertsWithSleepData.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">{alertsWithSleepData.length} total suggestions</span>
              {sortedDates.length > INITIAL_DISPLAY_LIMIT && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllAlerts(!showAllAlerts)}
                  className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
                >
                  {showAllAlerts ? "Show Recent" : `Show All (${sortedDates.length} days)`}
                </Button>
              )}
            </div>
          )}
        </div>

        {alertsWithSleepData.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {displayDates.map((date) => (
              <DateGroup
                key={date}
                date={date}
                alerts={groupedAlerts[date]}
                isExpanded={expandedDates.has(date)}
                onToggle={() => toggleDateExpansion(date)}
                onAlertClick={handleAlertClick}
              />
            ))}

            {!showAllAlerts && sortedDates.length > INITIAL_DISPLAY_LIMIT && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAllAlerts(true)}
                  className="border-gray-600 text-gray-300 hover:bg-white/5"
                >
                  View {sortedDates.length - INITIAL_DISPLAY_LIMIT} More Days
                </Button>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    )
  }

  return (
    <>
      {renderContent()}
      
      {/* Sleep Data Detail Modal */}
      <SleepDataDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        sleepData={selectedAlert?.sleep_data}
        suggestions={selectedAlert ? [selectedAlert] : []}
      />
    </>
  )
}
