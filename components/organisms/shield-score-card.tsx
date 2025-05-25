"use client"

import { useState, useMemo } from "react"
import { Shield, TrendingUp, Calendar, BarChart3 } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { GlassCard } from "@/components/atoms/glass-card"
import { MetricDisplay } from "@/components/molecules/metric-display"
import { ProgressRing } from "@/components/atoms/progress-ring"
import { useMetrics } from "@/lib/hooks/use-metrics"

interface ShieldScoreCardProps {
  userId: string
}

export function ShieldScoreCard({ userId }: ShieldScoreCardProps) {
  const [showDailyView, setShowDailyView] = useState(false)
  
  const { 
    data: metrics, 
    isLoading: loading, 
    error 
  } = useMetrics(userId)

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">SHIELD Sleep Score</h3>
          </div>
        </div>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <div className="h-8 w-16 bg-white/10 rounded"></div>
              <div className="h-4 w-32 bg-white/10 rounded"></div>
            </div>
            <div className="w-20 h-20 bg-white/10 rounded-full"></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-12 bg-white/10 rounded"></div>
            <div className="h-12 bg-white/10 rounded"></div>
            <div className="h-12 bg-white/10 rounded"></div>
          </div>
        </div>
      </GlassCard>
    )
  }

  if (!metrics || metrics.sleepDataCount === 0) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">SHIELD Sleep Score</h3>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">No sleep data available</div>
          <div className="text-sm text-gray-500">Add sleep data to see your SHIELD score</div>
        </div>
      </GlassCard>
    )
  }

  const { avgShieldScore, avgSleepEfficiency, avgRemPercentage, avgSleepHours, dailyShieldScores } = metrics

  const getScoreDescription = (score: number) => {
    if (score >= 95) return "Exceptional Sleep Quality"
    if (score >= 85) return "Excellent Sleep Quality"
    if (score >= 75) return "Good Sleep Quality"
    if (score >= 65) return "Fair Sleep Quality"
    return "Needs Improvement"
  }

  const getScoreColor = (score: number) => {
    if (score >= 95) return "text-emerald-400"
    if (score >= 85) return "text-green-400"
    if (score >= 75) return "text-cyan-400"
    if (score >= 65) return "text-yellow-400"
    return "text-red-400"
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-800 border border-white/20 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{label}</p>
          <p className="text-cyan-400">
            SHIELD Score: <span className="font-bold">{payload[0].value}</span>
          </p>
          <p className="text-xs text-gray-400">{new Date(data.date).toLocaleDateString()}</p>
        </div>
      )
    }
    return null
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">SHIELD Sleep Score</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDailyView(!showDailyView)}
            className="flex items-center space-x-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {showDailyView ? <Calendar className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
            <span>{showDailyView ? "Average" : "Daily"}</span>
          </button>
          <div className="flex items-center space-x-1 text-green-400">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Live</span>
          </div>
        </div>
      </div>

      {showDailyView && dailyShieldScores.length > 0 ? (
        /* Daily View */
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-white mb-1">7-Day SHIELD Score Trend</div>
            <div className="text-sm text-gray-300">
              Average: <span className={`font-bold ${getScoreColor(avgShieldScore)}`}>{avgShieldScore}</span>
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyShieldScores}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ fill: "#06b6d4", strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, fill: "#06b6d4" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {dailyShieldScores.map((dayScore: any, index: number) => (
              <div key={index} className="text-center">
                <div className="text-xs text-gray-400 mb-1">{dayScore.day}</div>
                <div
                  className={`text-sm font-bold px-2 py-1 rounded ${
                    dayScore.score >= 85
                      ? "bg-green-500/20 text-green-400"
                      : dayScore.score >= 75
                        ? "bg-cyan-500/20 text-cyan-400"
                        : dayScore.score >= 65
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {dayScore.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Average View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className={`text-3xl font-bold ${getScoreColor(avgShieldScore)}`}>{avgShieldScore}</div>
              <div className="text-sm text-gray-300">{getScoreDescription(avgShieldScore)}</div>
              <div className="text-xs text-cyan-300">
                Based on {metrics.sleepDataCount}-day average
                {dailyShieldScores.length > 0 &&
                  ` • Latest: ${dailyShieldScores[dailyShieldScores.length - 1]?.score || 0}`}
              </div>
            </div>

            <ProgressRing value={avgShieldScore} size={80} strokeWidth={6} />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <MetricDisplay label="Duration" value={`${avgSleepHours.toFixed(1)}h`} color="text-green-400" />
            <MetricDisplay label="Efficiency" value={`${avgSleepEfficiency.toFixed(0)}%`} color="text-blue-400" />
            <MetricDisplay label="REM" value={`${avgRemPercentage.toFixed(0)}%`} color="text-purple-400" />
          </div>

          {/* SHIELD Score Breakdown */}
          <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
            <h4 className="text-sm font-medium text-white mb-2">SHIELD Score Factors</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-white">Base Score:</span>
                <span className="text-white">100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-400">Sleep Duration {"<"} 6h:</span>
                <span className="text-red-400">-10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-400">Sleep Efficiency {"<"} 85%:</span>
                <span className="text-yellow-400">-5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-400">REM Sleep {"<"} 15%:</span>
                <span className="text-orange-400">-5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Age {">"} 50:</span>
                <span className="text-gray-400">-5</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  )
}
