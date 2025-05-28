"use client"
import {
  X,
  Moon,
  Activity,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Shield,
  TrendingUp,
  TrendingDown,
  Heart,
  Clock,
  Brain,
  Timer,
  Target,
  Zap
} from "lucide-react"
import { Modal } from "@/components/molecules/modal"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/atoms/glass-card"
import { MetricDisplay } from "@/components/molecules/metric-display"
import { ProgressRing } from "@/components/atoms/progress-ring"
import { useUser } from "@/app/contexts/user-context"

interface SleepDataDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sleepData: any
  suggestions: any[]
}

// Enhanced metrics calculation functions
const calculateHRVScore = (hrv: number): { score: number, status: string, color: string } => {
  if (hrv >= 50) return { score: 100, status: "Excellent", color: "text-emerald-400" }
  if (hrv >= 40) return { score: 85, status: "Good", color: "text-green-400" }
  if (hrv >= 30) return { score: 70, status: "Fair", color: "text-yellow-400" }
  if (hrv >= 20) return { score: 55, status: "Poor", color: "text-orange-400" }
  return { score: 30, status: "Very Poor", color: "text-red-400" }
}

const calculateSleepLatencyScore = (latency: number): { score: number, status: string, color: string } => {
  if (latency <= 15) return { score: 100, status: "Excellent", color: "text-emerald-400" }
  if (latency <= 20) return { score: 85, status: "Good", color: "text-green-400" }
  if (latency <= 30) return { score: 70, status: "Fair", color: "text-yellow-400" }
  if (latency <= 45) return { score: 55, status: "Poor", color: "text-orange-400" }
  return { score: 30, status: "Very Poor", color: "text-red-400" }
}

const calculateTimingConsistencyScore = (consistency: number): { score: number, status: string, color: string } => {
  if (consistency <= 0.5) return { score: 100, status: "Excellent", color: "text-emerald-400" }
  if (consistency <= 1) return { score: 85, status: "Good", color: "text-green-400" }
  if (consistency <= 2) return { score: 70, status: "Fair", color: "text-yellow-400" }
  if (consistency <= 3) return { score: 55, status: "Poor", color: "text-orange-400" }
  return { score: 30, status: "Very Poor", color: "text-red-400" }
}

const getChronotypeInfo = (chronotype: string): { icon: string, description: string, color: string } => {
  switch (chronotype) {
    case 'morning':
      return { icon: "🌅", description: "Early Bird - Peak performance in morning", color: "text-yellow-400" }
    case 'evening':
      return { icon: "🌙", description: "Night Owl - Peak performance in evening", color: "text-purple-400" }
    case 'intermediate':
      return { icon: "⚖️", description: "Flexible - Adaptable to various schedules", color: "text-blue-400" }
    default:
      return { icon: "❓", description: "Unknown chronotype", color: "text-gray-400" }
  }
}

// Bio-age impact calculation
const calculateBioAgeImpact = (sleepData: any, age: number): { delta: number, factors: any[] } => {
  const factors = []
  let totalDelta = 0

  // HRV Impact (25% weight)
  if (sleepData.hrv_overnight) {
    const hrvScore = calculateHRVScore(sleepData.hrv_overnight)
    const impact = (hrvScore.score - 75) * 0.25 * 0.1 // Convert to years
    totalDelta += impact
    factors.push({
      name: "Heart Rate Variability",
      value: `${sleepData.hrv_overnight}ms`,
      impact: impact,
      weight: "25%",
      status: hrvScore.status
    })
  }

  // Sleep Duration Impact (20% weight)
  if (sleepData.total_sleep_hours) {
    let durationScore = 75
    if (sleepData.total_sleep_hours >= 7 && sleepData.total_sleep_hours <= 8.5) durationScore = 100
    else if (sleepData.total_sleep_hours >= 6.5 && sleepData.total_sleep_hours <= 9) durationScore = 85
    else if (sleepData.total_sleep_hours < 6) durationScore = 40
    else if (sleepData.total_sleep_hours > 9.5) durationScore = 60

    const impact = (durationScore - 75) * 0.20 * 0.1
    totalDelta += impact
    factors.push({
      name: "Sleep Duration",
      value: `${sleepData.total_sleep_hours}h`,
      impact: impact,
      weight: "20%",
      status: durationScore >= 85 ? "Good" : durationScore >= 75 ? "Fair" : "Poor"
    })
  }

  // Sleep Efficiency Impact (15% weight)
  if (sleepData.sleep_efficiency) {
    let efficiencyScore = 75
    if (sleepData.sleep_efficiency >= 85) efficiencyScore = 100
    else if (sleepData.sleep_efficiency >= 80) efficiencyScore = 85
    else if (sleepData.sleep_efficiency < 70) efficiencyScore = 40

    const impact = (efficiencyScore - 75) * 0.15 * 0.1
    totalDelta += impact
    factors.push({
      name: "Sleep Efficiency",
      value: `${sleepData.sleep_efficiency}%`,
      impact: impact,
      weight: "15%",
      status: efficiencyScore >= 85 ? "Good" : efficiencyScore >= 75 ? "Fair" : "Poor"
    })
  }

  // Sleep Latency Impact (10% weight)
  if (sleepData.sleep_latency_minutes) {
    const latencyScore = calculateSleepLatencyScore(sleepData.sleep_latency_minutes)
    const impact = (latencyScore.score - 75) * 0.10 * 0.1
    totalDelta += impact
    factors.push({
      name: "Sleep Latency",
      value: `${sleepData.sleep_latency_minutes}min`,
      impact: impact,
      weight: "10%",
      status: latencyScore.status
    })
  }

  // Timing Consistency Impact (10% weight)
  if (sleepData.timing_consistency_hours) {
    const consistencyScore = calculateTimingConsistencyScore(sleepData.timing_consistency_hours)
    const impact = (consistencyScore.score - 75) * 0.10 * 0.1
    totalDelta += impact
    factors.push({
      name: "Timing Consistency",
      value: `±${sleepData.timing_consistency_hours}h`,
      impact: impact,
      weight: "10%",
      status: consistencyScore.status
    })
  }

  // Clamp delta to reasonable range
  totalDelta = Math.max(-5, Math.min(5, totalDelta))

  return { delta: totalDelta, factors }
}

export function SleepDataDetailModal({ isOpen, onClose, sleepData, suggestions }: SleepDataDetailModalProps) {
  if (!sleepData) return null
  const { currentUser } = useUser()

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "warning":
        return AlertTriangle
      case "success":
        return CheckCircle
      default:
        return Lightbulb
    }
  }

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case "warning":
        return "text-yellow-400"
      case "success":
        return "text-green-400"
      default:
        return "text-blue-400"
    }
  }

  const getShieldScoreColor = (score: number) => {
    if (score >= 95) return "text-emerald-400"
    if (score >= 85) return "text-green-400"
    if (score >= 75) return "text-cyan-400"
    if (score >= 65) return "text-yellow-400"
    return "text-red-400"
  }

  const getShieldScoreDescription = (score: number) => {
    if (score >= 95) return "Exceptional"
    if (score >= 85) return "Excellent"
    if (score >= 75) return "Good"
    if (score >= 65) return "Fair"
    return "Needs Improvement"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const shieldScore = sleepData.shield_score || 0
  const scoreColor = getShieldScoreColor(shieldScore)
  const scoreDescription = getShieldScoreDescription(shieldScore)
  
  // Calculate age from date of birth
  const dateOfBirth = new Date(currentUser?.date_of_birth || 0)
  const age = Math.floor((new Date().getTime() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25))

  // Calculate bio-age impact
  const bioAgeAnalysis = calculateBioAgeImpact(sleepData, age)
  const bioAge = age - bioAgeAnalysis.delta

  // Enhanced metrics availability
  const hasEnhancedMetrics = sleepData.hrv_overnight || sleepData.sleep_latency_minutes || 
                            sleepData.chronotype || sleepData.timing_consistency_hours

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <GlassCard className="w-full max-w-6xl mx-4 h-[95vh] flex flex-col max-h-[95vh]">
        <div className="p-6 flex-shrink-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                <Moon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Sleep Analysis</h2>
                <p className="text-sm text-cyan-300">{formatDate(sleepData.date)}</p>
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

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left Column - SHIELD Score & Bio-Age */}
              <div className="space-y-6">
                {/* SHIELD Score */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-6 w-6 text-cyan-400" />
                      <h3 className="text-lg font-semibold text-white">SHIELD Score</h3>
                    </div>
                    <div className="flex items-center space-x-1">
                      {shieldScore >= 85 ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : shieldScore < 75 ? (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-4xl font-bold ${scoreColor}`}>{shieldScore}</div>
                      <div className="text-sm text-gray-300">{scoreDescription}</div>
                    </div>
                    <ProgressRing value={shieldScore} size={80} strokeWidth={6} />
                  </div>
                </div>

                {/* Bio-Age Analysis */}
                {hasEnhancedMetrics && (
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <div className="flex items-center space-x-2 mb-4">
                      <Brain className="h-6 w-6 text-green-400" />
                      <h3 className="text-lg font-semibold text-white">Bio-Age Impact</h3>
                    </div>
                    
                    <div className="text-center mb-4">
                      <div className="text-sm text-gray-300">Chronological Age: {age}</div>
                      <div className="text-3xl font-bold text-green-400">{bioAge.toFixed(1)}</div>
                      <div className="text-sm text-gray-300">Biological Age</div>
                      <div className={`text-sm font-medium ${bioAgeAnalysis.delta > 0 ? 'text-green-400' : bioAgeAnalysis.delta < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {bioAgeAnalysis.delta > 0 ? `${bioAgeAnalysis.delta.toFixed(1)} years younger` : 
                         bioAgeAnalysis.delta < 0 ? `${Math.abs(bioAgeAnalysis.delta).toFixed(1)} years older` : 'Age neutral'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-gray-300 mb-2">Contributing Factors</h4>
                      {bioAgeAnalysis.factors.map((factor, index) => (
                        <div key={index} className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">{factor.name} ({factor.weight}):</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-white">{factor.value}</span>
                            <span className={factor.impact > 0 ? 'text-green-400' : factor.impact < 0 ? 'text-red-400' : 'text-gray-400'}>
                              {factor.impact > 0 ? '+' : ''}{factor.impact.toFixed(2)}y
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Middle Column - Sleep Metrics */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-cyan-400" />
                    <span>Core Sleep Metrics</span>
                  </h3>

                  <div className="space-y-4">
                    {/* Sleep Efficiency Ring */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <div>
                        <h4 className="text-sm font-medium text-white">Sleep Efficiency</h4>
                        <p className="text-xs text-gray-400">Quality of sleep time</p>
                      </div>
                      <ProgressRing value={sleepData.sleep_efficiency || 0} size={60} strokeWidth={4} />
                    </div>

                    {/* Sleep Duration Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <MetricDisplay
                        label="Total Sleep"
                        value={`${sleepData.total_sleep_hours || 0}h`}
                        color="text-blue-400"
                      />
                      <MetricDisplay
                        label="Time in Bed"
                        value={`${sleepData.time_in_bed || 0}h`}
                        color="text-purple-400"
                      />
                    </div>

                    {/* Sleep Stages */}
                    <div className="p-4 rounded-lg bg-white/5">
                      <h4 className="text-sm font-medium text-white mb-3">Sleep Stages</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-purple-400">
                            {(sleepData.rem_percentage || 0).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-400">REM Sleep</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-400">
                            {(sleepData.deep_sleep_percentage || 0).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-400">Deep Sleep</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-cyan-400">
                            {(sleepData.light_sleep_percentage || 0).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-400">Light Sleep</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-red-400">
                            {(sleepData.awake_percentage || 0).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-400">Awake</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Metrics */}
                {hasEnhancedMetrics && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                      <Zap className="h-5 w-5 text-green-400" />
                      <span>Enhanced Analytics</span>
                      <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">Advanced</span>
                    </h3>

                    <div className="space-y-3">
                      {sleepData.hrv_overnight && (
                        <div className="p-3 rounded-lg bg-white/5 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Heart className="h-4 w-4 text-red-400" />
                            <div>
                              <div className="text-sm font-medium text-white">Heart Rate Variability</div>
                              <div className="text-xs text-gray-400">Recovery indicator</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${calculateHRVScore(sleepData.hrv_overnight).color}`}>
                              {sleepData.hrv_overnight}ms
                            </div>
                            <div className="text-xs text-gray-400">
                              {calculateHRVScore(sleepData.hrv_overnight).status}
                            </div>
                          </div>
                        </div>
                      )}

                      {sleepData.sleep_latency_minutes && (
                        <div className="p-3 rounded-lg bg-white/5 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Timer className="h-4 w-4 text-yellow-400" />
                            <div>
                              <div className="text-sm font-medium text-white">Sleep Latency</div>
                              <div className="text-xs text-gray-400">Time to fall asleep</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${calculateSleepLatencyScore(sleepData.sleep_latency_minutes).color}`}>
                              {sleepData.sleep_latency_minutes}min
                            </div>
                            <div className="text-xs text-gray-400">
                              {calculateSleepLatencyScore(sleepData.sleep_latency_minutes).status}
                            </div>
                          </div>
                        </div>
                      )}

                      {sleepData.timing_consistency_hours && (
                        <div className="p-3 rounded-lg bg-white/5 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-blue-400" />
                            <div>
                              <div className="text-sm font-medium text-white">Timing Consistency</div>
                              <div className="text-xs text-gray-400">Schedule variation</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${calculateTimingConsistencyScore(sleepData.timing_consistency_hours).color}`}>
                              ±{sleepData.timing_consistency_hours}h
                            </div>
                            <div className="text-xs text-gray-400">
                              {calculateTimingConsistencyScore(sleepData.timing_consistency_hours).status}
                            </div>
                          </div>
                        </div>
                      )}

                      {sleepData.chronotype && (
                        <div className="p-3 rounded-lg bg-white/5 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Target className="h-4 w-4 text-purple-400" />
                            <div>
                              <div className="text-sm font-medium text-white">Chronotype</div>
                              <div className="text-xs text-gray-400">Natural preference</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${getChronotypeInfo(sleepData.chronotype).color}`}>
                              {getChronotypeInfo(sleepData.chronotype).icon}
                            </div>
                            <div className="text-xs text-gray-400">
                              {sleepData.chronotype.charAt(0).toUpperCase() + sleepData.chronotype.slice(1)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - AI Suggestions */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-yellow-400" />
                  <span>AI Insights</span>
                </h3>

                {suggestions.length === 0 ? (
                  <div className="p-6 rounded-lg bg-white/5 border border-white/10 text-center">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No specific suggestions for this sleep session</p>
                    <p className="text-gray-500 text-xs mt-1">Your sleep metrics were within normal ranges</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {suggestions.map((suggestion, index) => {
                      const Icon = getSuggestionIcon(suggestion.type)
                      const color = getSuggestionColor(suggestion.type)

                      return (
                        <div key={index} className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-start space-x-3">
                            <Icon className={`h-5 w-5 mt-0.5 ${color}`} />
                            <div className="flex-1 space-y-2">
                              <div>
                                <h4 className="text-sm font-medium text-white">{suggestion.title}</h4>
                                <p className="text-xs text-gray-300">{suggestion.description}</p>
                              </div>
                              <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
                                <p className="text-xs text-cyan-300">
                                  <span className="font-medium">AI Suggestion:</span> {suggestion.suggestion}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 flex-shrink-0">
          {/* Footer */}
          <div className="pt-6 border-t border-white/10">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-400">
                Data recorded on {new Date(sleepData.created_at).toLocaleDateString()} • SHIELD Score: {shieldScore}/100
                {hasEnhancedMetrics && ` • Bio-Age: ${bioAge.toFixed(1)} years`}
              </div>
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>
    </Modal>
  )
}
