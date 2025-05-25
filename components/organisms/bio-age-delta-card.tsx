"use client"

import { useMemo } from "react"
import { Activity, Calendar } from "lucide-react"
import { GlassCard } from "@/components/atoms/glass-card"
import { useMetrics } from "@/lib/hooks/use-metrics"

interface BioAgeDeltaCardProps {
  userId: string
}

// Reusable components
const CardHeader = () => (
  <div className="flex items-center space-x-2 mb-4">
    <Activity className="h-6 w-6 text-green-400" />
    <h3 className="text-lg font-semibold text-white">Bio-Age Analysis</h3>
  </div>
)

const LoadingSkeleton = () => (
  <GlassCard className="p-6">
    <CardHeader />
    <div className="animate-pulse">
      <div className="h-12 bg-white/10 rounded mb-4"></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-16 bg-white/10 rounded"></div>
        <div className="h-16 bg-white/10 rounded"></div>
      </div>
    </div>
  </GlassCard>
)

const EmptyState = () => (
  <GlassCard className="p-6">
    <CardHeader />
    <div className="text-center py-8">
      <div className="text-gray-400 mb-2">No sleep data available</div>
      <div className="text-sm text-gray-500">Add sleep data to see your bio-age analysis</div>
    </div>
  </GlassCard>
)

const ErrorState = ({ error }: { error: Error }) => (
  <GlassCard className="p-6">
    <CardHeader />
    <div className="text-center py-8">
      <div className="text-red-400 text-xl mb-4">⚠️</div>
      <div className="text-red-400 mb-2">Failed to load bio-age data</div>
      <div className="text-sm text-gray-500">{error.message}</div>
    </div>
  </GlassCard>
)

const AgeComparisonCard = ({ 
  icon: Icon, 
  age, 
  label, 
  color 
}: { 
  icon: React.ComponentType<any>
  age: number | string
  label: string
  color: string
}) => (
  <div className="text-center p-3 rounded-lg bg-white/5">
    <Icon className={`h-5 w-5 ${color} mx-auto mb-2`} />
    <div className="text-lg font-semibold text-white">{age}</div>
    <div className="text-xs text-gray-400">{label}</div>
  </div>
)

export function BioAgeDeltaCard({ userId }: BioAgeDeltaCardProps) {
  const { 
    data: metrics, 
    isLoading, 
    error 
  } = useMetrics(userId)

  // Memoized calculations
  const bioAgeAnalysis = useMemo(() => {
    if (!metrics) return null
    
    const { bioAgeDelta } = metrics
    const isYounger = bioAgeDelta > 0
    
    return {
      isYounger,
      deltaText: `${isYounger ? "-" : "+"}${Math.abs(bioAgeDelta).toFixed(1)}`,
      statusText: `Years ${isYounger ? "younger" : "older"} than chronological age`,
      deltaColor: isYounger ? "text-green-400" : "text-red-400"
    }
  }, [metrics])

  // Render content based on state
  if (isLoading) return <LoadingSkeleton />
  
  if (error) return <ErrorState error={error as Error} />
  
  if (!metrics || metrics.sleepDataCount === 0) return <EmptyState />

  if (!bioAgeAnalysis) return <EmptyState />

  const { chronologicalAge, biologicalAge } = metrics
  const { deltaText, statusText, deltaColor } = bioAgeAnalysis

  return (
    <GlassCard className="p-6">
      <CardHeader />

      <div className="space-y-4">
        {/* Bio-Age Delta Display */}
        <div className="text-center">
          <div className={`text-4xl font-bold mb-1 ${deltaColor}`}>
            {deltaText}
          </div>
          <div className="text-sm text-gray-300">{statusText}</div>
        </div>

        {/* Age Comparison Cards */}
        <div className="grid grid-cols-2 gap-4">
          <AgeComparisonCard
            icon={Calendar}
            age={chronologicalAge}
            label="Chronological"
            color="text-cyan-400"
          />
          <AgeComparisonCard
            icon={Activity}
            age={biologicalAge.toFixed(1)}
            label="Biological"
            color="text-green-400"
          />
        </div>

        {/* Analysis Note */}
        <div className="text-center">
          <div className="text-xs text-cyan-300">
            Based on sleep efficiency, REM sleep, and sleep duration analysis
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
