"use client"

import { useState, useMemo, useCallback } from "react"
import { AlertTriangle, Brain, Lightbulb, CheckCircle, Calendar, Eye, ChevronDown, ChevronUp } from "lucide-react"
import { GlassCard } from "@/components/atoms/glass-card"
import { Button } from "@/components/ui/button"
import { SleepDataDetailModal } from "@/components/organisms/sleep-data-detail-modal"
import { useHealthAlerts, type HealthAlert } from "@/lib/hooks/use-health-alerts"
import { useSleepData } from "@/lib/hooks/use-sleep-data"

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
const MAX_CONTENT_HEIGHT = "600px" // Maximum height before scrolling

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

const pluralize = (count: number, singular: string, plural?: string) => {
  return count === 1 ? singular : (plural || `${singular}s`)
}

// Reusable Components
const CardHeader = ({ alertCount }: { alertCount: number }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-2">
      <AlertTriangle className="h-6 w-6 text-yellow-400" />
      <h3 className="text-lg font-semibold text-white">Health Insights & AI Suggestions</h3>
    </div>
    {alertCount > 0 && (
      <div className="text-sm text-gray-400">
        {alertCount} total {pluralize(alertCount, "suggestion")}
      </div>
    )}
  </div>
)

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {Array.from({ length: 3 }, (_, i) => (
      <div key={i} className="h-24 bg-white/10 rounded-lg"></div>
    ))}
  </div>
)

const StateMessage = ({ 
  icon: Icon, 
  iconColor, 
  title, 
  description 
}: {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  description: string
}) => (
  <div className="text-center py-8">
    <Icon className={`h-12 w-12 ${iconColor} mx-auto mb-3`} />
    <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
    <p className="text-gray-400 text-sm">{description}</p>
  </div>
)

const EmptyState = () => (
  <StateMessage
    icon={CheckCircle}
    iconColor="text-green-400"
    title="All Good!"
    description="No health alerts at the moment. Keep adding sleep data to get personalized insights."
  />
)

const ErrorState = ({ error, onRetry }: { error: Error; onRetry?: () => void }) => (
  <div className="text-center py-8">
    <div className="text-red-400 text-4xl mb-3">⚠️</div>
    <h4 className="text-lg font-semibold text-white mb-2">Failed to Load Health Alerts</h4>
    <p className="text-gray-400 text-sm mb-4">{error.message}</p>
    {onRetry && (
      <Button
        onClick={onRetry}
        variant="outline"
        className="mb-4 border-red-400 text-red-400 hover:bg-red-400/10"
      >
        Try Again
      </Button>
    )}
    <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg p-3 max-w-md mx-auto">
      <p className="mb-2">Troubleshooting tips:</p>
      <ul className="text-left space-y-1">
        <li>• Check your internet connection</li>
        <li>• Refresh the page</li>
        <li>• Try again in a few moments</li>
      </ul>
    </div>
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
  const isClickable = !!alert.sleep_data

  return (
    <div
      className={`p-3 rounded-lg bg-white/5 border border-white/10 transition-all duration-200 ${
        isClickable ? "hover:bg-white/10 cursor-pointer" : ""
      }`}
      onClick={() => isClickable && onAlertClick(alert)}
    >
      <div className="flex items-start space-x-3">
        <Icon className={`h-4 w-4 mt-0.5 ${config.color} flex-shrink-0`} />
        <div className="flex-1 space-y-2 min-w-0">
          <div>
            <h5 className="text-sm font-medium text-white truncate">{alert.title}</h5>
            {alert.description && (
              <p className="text-xs text-gray-300 line-clamp-2">{alert.description}</p>
            )}
          </div>
          {alert.suggestion && (
            <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
              <p className="text-xs text-cyan-300">
                <span className="font-medium">💡 AI Suggestion:</span> {alert.suggestion}
              </p>
            </div>
          )}
          {isClickable && (
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
  const suggestionText = `${alerts.length} ${pluralize(alerts.length, "suggestion")}`

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      {/* Date Header */}
      <div
        className="flex items-center justify-between p-4 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <Calendar className="h-5 w-5 text-cyan-400 flex-shrink-0" />
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-white truncate">{formatDateLong(date)}</h4>
            <p className="text-xs text-gray-400">
              {suggestionText}
              {hasData && " • Click to view sleep data"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
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
        <div className="p-4 space-y-3 bg-white/2 max-h-80 overflow-y-auto">
          {alerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} onAlertClick={onAlertClick} />
          ))}
        </div>
      )}
    </div>
  )
}

const ShowMoreButton = ({ 
  showAll, 
  totalCount, 
  visibleCount, 
  onToggle 
}: {
  showAll: boolean
  totalCount: number
  visibleCount: number
  onToggle: () => void
}) => {
  if (totalCount <= visibleCount) return null

  return (
    <div className="text-center pt-4">
      <Button
        variant="outline"
        onClick={onToggle}
        className="border-gray-600 text-gray-300 hover:bg-white/5"
      >
        {showAll 
          ? "Show Recent" 
          : `View ${totalCount - visibleCount} More ${pluralize(totalCount - visibleCount, "Day")}`
        }
      </Button>
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
    error: alertsError,
    refetch: refetchAlerts
  } = useHealthAlerts(userId)
  
  const { 
    data: sleepDataResponse, 
    isLoading: sleepLoading,
    refetch: refetchSleepData
  } = useSleepData(userId)

  console.log('🏥 Health alerts data:', healthAlertsData)
  console.log('😴 Sleep data response:', sleepDataResponse)

  // Memoize the basic data to prevent unnecessary recalculations
  const alerts = useMemo(() => healthAlertsData?.alerts || [], [healthAlertsData?.alerts])
  const sleepData = useMemo(() => sleepDataResponse?.sleepData || [], [sleepDataResponse?.sleepData])
  const isLoading = alertsLoading || sleepLoading

  console.log('📊 Processed alerts:', alerts.length)
  console.log('📊 Processed sleep data:', sleepData.length)

  // Memoized processed data
  const { alertsWithSleepData, groupedAlerts, sortedDates } = useMemo(() => {
    // Ensure we have valid arrays
    const validAlerts = Array.isArray(alerts) ? alerts : []
    const validSleepData = Array.isArray(sleepData) ? sleepData : []

    console.log('🔄 Processing alerts:', validAlerts.length, 'sleep data:', validSleepData.length)

    // Process alerts with sleep data - fix TypeScript error by ensuring proper typing
    const processedAlerts: AlertWithSleepData[] = validAlerts.map((alert) => {
      try {
        const alertDate = getAlertDate(alert)
        const matchingSleepData = validSleepData.find((sleep: any) => sleep?.date === alertDate)

        return {
          ...alert,
          sleep_data: matchingSleepData,
        }
      } catch (error) {
        console.error('Error processing alert:', alert, error)
        return {
          ...alert,
          sleep_data: undefined,
        }
      }
    })

    // Group alerts by date
    const grouped: GroupedAlerts = processedAlerts.reduce((acc: GroupedAlerts, alert: AlertWithSleepData) => {
      try {
        const date = getAlertDate(alert)
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(alert)
      } catch (error) {
        console.error('Error grouping alert:', alert, error)
      }
      return acc
    }, {})

    // Sort dates (most recent first)
    const dates = Object.keys(grouped).sort((a, b) => {
      try {
        return new Date(b).getTime() - new Date(a).getTime()
      } catch (error) {
        console.error('Error sorting dates:', a, b, error)
        return 0
      }
    })

    console.log('✅ Processed data:', {
      alerts: processedAlerts.length,
      groups: Object.keys(grouped).length,
      dates: dates.length
    })

    return {
      alertsWithSleepData: processedAlerts,
      groupedAlerts: grouped,
      sortedDates: dates
    }
  }, [alerts, sleepData])

  // Auto-expand the most recent date on first load
  if (sortedDates.length > 0 && expandedDates.size === 0) {
    try {
      setExpandedDates(new Set([sortedDates[0]]))
    } catch (error) {
      console.error('Error auto-expanding dates:', error)
    }
  }

  const displayDates = showAllAlerts ? sortedDates : sortedDates.slice(0, INITIAL_DISPLAY_LIMIT)

  // Event handlers
  const handleAlertClick = useCallback((alert: AlertWithSleepData) => {
    if (alert.sleep_data) {
      setSelectedAlert(alert)
      setIsDetailModalOpen(true)
    }
  }, [])

  const toggleDateExpansion = useCallback((date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(date)) {
        newSet.delete(date)
      } else {
        newSet.add(date)
      }
      return newSet
    })
  }, [])

  const toggleShowAllAlerts = useCallback(() => {
    setShowAllAlerts(prev => !prev)
  }, [])

  const handleRetry = useCallback(async () => {
    try {
      await Promise.all([refetchAlerts(), refetchSleepData()])
    } catch (error) {
      console.error('Error retrying data fetch:', error)
    }
  }, [refetchAlerts, refetchSleepData])

  // Render content based on state
  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <CardHeader alertCount={0} />
        <div className="mt-6">
          <LoadingSkeleton />
        </div>
      </GlassCard>
    )
  }

  if (alertsError) {
    return (
      <GlassCard className="p-6">
        <CardHeader alertCount={0} />
        <ErrorState error={alertsError} onRetry={handleRetry} />
      </GlassCard>
    )
  }

  return (
    <>
      <GlassCard className="p-6">
        <CardHeader alertCount={alertsWithSleepData.length} />

        {alertsWithSleepData.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-6">
            {/* Scrollable content area */}
            <div 
              className="space-y-4 overflow-y-auto pr-2"
              style={{ maxHeight: MAX_CONTENT_HEIGHT }}
            >
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
            </div>

            {/* Show more/less button */}
            <ShowMoreButton
              showAll={showAllAlerts}
              totalCount={sortedDates.length}
              visibleCount={INITIAL_DISPLAY_LIMIT}
              onToggle={toggleShowAllAlerts}
            />
          </div>
        )}
      </GlassCard>
      
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
