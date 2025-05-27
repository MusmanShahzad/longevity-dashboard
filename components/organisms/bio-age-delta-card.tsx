"use client"

import { useMemo, useState } from "react"
import { Activity, Calendar, TrendingUp, TrendingDown, Minus, Info, ChevronDown, ChevronUp, Target, Lightbulb } from "lucide-react"
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
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  
  const { 
    data: metrics, 
    isLoading, 
    error 
  } = useMetrics(userId)

  // Memoized calculations
  const bioAgeAnalysis = useMemo(() => {
    if (!metrics) return null
    
    const { bioAgeDelta } = metrics
    // Fixed logic: bioAgeDelta > 0 means biologically OLDER, bioAgeDelta < 0 means biologically YOUNGER
    const isYounger = bioAgeDelta < 0
    const isOlder = bioAgeDelta > 0
    
    return {
      isYounger,
      isOlder,
      deltaText: `${isOlder ? "+" : ""}${bioAgeDelta.toFixed(1)}`,
      statusText: bioAgeDelta === 0 
        ? "Same as chronological age" 
        : `${Math.abs(bioAgeDelta).toFixed(1)} years ${isYounger ? "younger" : "older"} than chronological age`,
      deltaColor: isYounger ? "text-green-400" : isOlder ? "text-red-400" : "text-gray-400"
    }
  }, [metrics])

  // Render content based on state
  if (isLoading) return <LoadingSkeleton />
  
  if (error) return <ErrorState error={error as Error} />
  
  if (!metrics || metrics.sleepDataCount === 0) return <EmptyState />

  if (!bioAgeAnalysis) return <EmptyState />

  const { chronologicalAge, biologicalAge, bioAgeBreakdown } = metrics
  const { deltaText, statusText, deltaColor } = bioAgeAnalysis

  return (
    <GlassCard className="p-6 h-[410px] flex flex-col">
      <CardHeader />

      <div className="space-y-4 flex-1 overflow-y-auto">
        {/* Bio-Age Delta Display */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            {bioAgeAnalysis.isYounger && <TrendingDown className="h-6 w-6 text-green-400" />}
            {bioAgeAnalysis.isOlder && <TrendingUp className="h-6 w-6 text-red-400" />}
            {!bioAgeAnalysis.isYounger && !bioAgeAnalysis.isOlder && <Minus className="h-6 w-6 text-gray-400" />}
            <div className={`text-4xl font-bold ${deltaColor}`}>
            {deltaText}
            </div>
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
            color={bioAgeAnalysis.isYounger ? "text-green-400" : bioAgeAnalysis.isOlder ? "text-red-400" : "text-gray-400"}
          />
        </div>

        {/* Calculation Breakdown */}
        {bioAgeBreakdown && (
          <div className="space-y-3">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">How We Calculated This</span>
              </div>
              {showBreakdown ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>

            {showBreakdown && (
              <div className="space-y-3 p-3 rounded-lg bg-white/5">
                <div className="text-xs text-gray-400 mb-3">
                  Overall Sleep Quality: <span className="text-white font-medium">{bioAgeBreakdown.breakdown.sleepQualityPercentage}%</span>
                </div>
                
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sleep Efficiency (40% weight):</span>
                    <span className="text-white">{bioAgeBreakdown.breakdown.efficiencyScore}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">REM Sleep (30% weight):</span>
                    <span className="text-white">{bioAgeBreakdown.breakdown.remScore}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sleep Duration (30% weight):</span>
                    <span className="text-white">{bioAgeBreakdown.breakdown.durationScore}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Age Adjustment Factor:</span>
                    <span className="text-white">{bioAgeBreakdown.breakdown.ageAdjustmentFactor}x</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {bioAgeBreakdown?.recommendations && bioAgeBreakdown.recommendations.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-white">Improvement Recommendations</span>
                <span className="text-xs bg-green-400/20 text-green-400 px-2 py-1 rounded-full">
                  {bioAgeBreakdown.recommendations.length}
                </span>
              </div>
              {showRecommendations ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>

                         {showRecommendations && (
               <div className="space-y-3">
                 {bioAgeBreakdown.recommendations.map((rec: any, index: number) => (
                  <div key={index} className="p-3 rounded-lg bg-white/5 border-l-2 border-l-cyan-400">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Lightbulb className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm font-medium text-white">{rec.category}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        rec.priority === 'high' ? 'bg-red-400/20 text-red-400' :
                        rec.priority === 'medium' ? 'bg-yellow-400/20 text-yellow-400' :
                        'bg-gray-400/20 text-gray-400'
                      }`}>
                        {rec.priority} priority
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-400 mb-2">
                      Current: <span className="text-white">{rec.current}</span> → Target: <span className="text-green-400">{rec.target}</span>
                    </div>
                    
                    <div className="text-xs text-gray-300 mb-2">{rec.impact}</div>
                    
                    <div className="space-y-1">
                                             {rec.tips.slice(0, 3).map((tip: string, tipIndex: number) => (
                        <div key={tipIndex} className="text-xs text-gray-400 flex items-start space-x-1">
                          <span className="text-cyan-400 mt-0.5">•</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                      {rec.tips.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{rec.tips.length - 3} more tips...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  )
}
