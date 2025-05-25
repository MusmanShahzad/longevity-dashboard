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

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <GlassCard className="w-full max-w-4xl mx-4 h-[90vh] flex flex-col max-h-[90vh]">
        <div className="p-6 flex-shrink-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                <Moon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Sleep Data Details</h2>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Sleep Metrics */}
              <div className="space-y-6">
                {/* SHIELD Score - Featured */}
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

                  {/* Score Breakdown */}
                  <div className="mt-4 p-3 rounded-lg bg-white/5">
                    <h4 className="text-xs font-medium text-gray-300 mb-2">Score Breakdown</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Base Score:</span>
                        <span className="text-white">100</span>
                      </div>
                      {sleepData.total_sleep_hours < 6 && (
                        <div className="flex justify-between">
                          <span className="text-red-400">Sleep Duration {"<"} 6h:</span>
                          <span className="text-red-400">-10</span>
                        </div>
                      )}
                      {sleepData.sleep_efficiency < 85 && (
                        <div className="flex justify-between">
                          <span className="text-yellow-400">Sleep Efficiency {"<"} 85%:</span>
                          <span className="text-yellow-400">-5</span>
                        </div>
                      )}
                      {sleepData.rem_percentage < 15 && (
                        <div className="flex justify-between">
                          <span className="text-orange-400">REM Sleep {"<"} 15%:</span>
                          <span className="text-orange-400">-5</span>
                        </div>
                      )}
                      {age > 50 && sleepData.total_sleep_hours < 6 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Age {">"} 50:</span>
                          <span className="text-gray-400">-5</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-cyan-400" />
                    <span>Sleep Metrics</span>
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
              </div>

              {/* Right Column - AI Suggestions */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-yellow-400" />
                  <span>AI Suggestions for this Night</span>
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
