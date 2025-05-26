"use client"

import { useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts"
import { Moon, Shield, BarChart3 } from "lucide-react"
import { GlassCard } from "@/components/atoms/glass-card"
import { useSleepData } from "@/lib/hooks/use-sleep-data"

interface SleepChartsCardProps {
  userId: string
}

interface SleepDataPoint {
  day: string
  date: string
  hours: number
  efficiency: number
  rem: number
  shieldScore: number
}

interface SleepStageData {
  name: string
  value: number
  color: string
}

// Chart configuration
const CHART_CONFIG = {
  hours: {
    label: "Sleep Pattern",
    color: "#06b6d4",
    dataKey: "hours"
  },
  shield: {
    label: "SHIELD Score Trend", 
    color: "#10b981",
    dataKey: "shieldScore"
  }
} as const

// Reusable Components
const LoadingSkeleton = () => (
  <GlassCard className="p-6">
    <div className="flex items-center space-x-2 mb-6">
      <Moon className="h-6 w-6 text-purple-400" />
      <h3 className="text-lg font-semibold text-white">Sleep Analytics</h3>
    </div>
    <div className="animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-48 bg-white/10 rounded"></div>
        <div className="h-48 bg-white/10 rounded"></div>
      </div>
    </div>
  </GlassCard>
)

const EmptyState = () => (
  <GlassCard className="p-6">
    <div className="flex items-center space-x-2 mb-6">
      <Moon className="h-6 w-6 text-purple-400" />
      <h3 className="text-lg font-semibold text-white">Sleep Analytics</h3>
    </div>
    <div className="text-center py-12">
      <Moon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h4 className="text-lg font-semibold text-white mb-2">No Sleep Data Available</h4>
      <p className="text-gray-400">Add sleep data to see your analytics and trends</p>
    </div>
  </GlassCard>
)

const ErrorState = ({ error }: { error: string }) => (
  <GlassCard className="p-6">
    <div className="flex items-center space-x-2 mb-6">
      <Moon className="h-6 w-6 text-red-400" />
      <h3 className="text-lg font-semibold text-white">Sleep Analytics</h3>
    </div>
    <div className="text-center py-12">
      <div className="text-red-400 text-xl mb-4">⚠️</div>
      <h4 className="text-lg font-semibold text-white mb-2">Failed to Load Sleep Data</h4>
      <p className="text-gray-400">{error}</p>
    </div>
  </GlassCard>
)

const ChartToggle = ({ 
  activeChart, 
  onToggle 
}: { 
  activeChart: "hours" | "shield"
  onToggle: (chart: "hours" | "shield") => void 
}) => (
  <div className="flex items-center space-x-2">
    <button
      onClick={() => onToggle("hours")}
      className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-colors ${
        activeChart === "hours"
          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
          : "text-gray-400 hover:text-cyan-400"
      }`}
    >
      <BarChart3 className="h-4 w-4" />
      <span>Hours</span>
    </button>
    <button
      onClick={() => onToggle("shield")}
      className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-colors ${
        activeChart === "shield"
          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
          : "text-gray-400 hover:text-cyan-400"
      }`}
    >
      <Shield className="h-4 w-4" />
      <span>SHIELD</span>
    </button>
  </div>
)

const CustomTooltip = ({ active, payload, label, activeChart }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-slate-800 border border-white/20 rounded-lg p-3 shadow-lg">
        <p className="text-white font-medium">{label}</p>
        {activeChart === "hours" ? (
          <p className="text-cyan-400">
            Sleep Hours: <span className="font-bold">{payload[0].value.toFixed(1)}h</span>
          </p>
        ) : (
          <p className="text-cyan-400">
            SHIELD Score: <span className="font-bold">{payload[0].value}</span>
          </p>
        )}
        <p className="text-xs text-gray-400">{new Date(data.date).toLocaleDateString()}</p>
      </div>
    )
  }
  return null
}

const ShieldStats = ({ sleepData }: { sleepData: SleepDataPoint[] }) => {
  const shieldScores = sleepData.map((d) => d.shieldScore).filter(score => score > 0)
  
  if (shieldScores.length === 0) return null

  const best = Math.max(...shieldScores)
  const average = Math.round(shieldScores.reduce((sum, score) => sum + score, 0) / shieldScores.length)
  const lowest = Math.min(...shieldScores)

  return (
    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
      <div className="p-2 rounded bg-white/5">
        <div className="text-sm font-semibold text-green-400">{best}</div>
        <div className="text-xs text-gray-400">Best</div>
      </div>
      <div className="p-2 rounded bg-white/5">
        <div className="text-sm font-semibold text-cyan-400">{average}</div>
        <div className="text-xs text-gray-400">Average</div>
      </div>
      <div className="p-2 rounded bg-white/5">
        <div className="text-sm font-semibold text-yellow-400">{lowest}</div>
        <div className="text-xs text-gray-400">Lowest</div>
      </div>
    </div>
  )
}

const SleepStagesChart = ({ sleepStagesData }: { sleepStagesData: SleepStageData[] }) => {
  if (sleepStagesData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-sm">No sleep stage data available</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="h-48 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sleepStagesData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {sleepStagesData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {sleepStagesData.map((stage) => (
          <div key={stage.name} className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
            <span className="text-xs text-gray-300">
              {stage.name}: {stage.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

export function SleepChartsCard({ userId }: SleepChartsCardProps) {
  const [activeChart, setActiveChart] = useState<"hours" | "shield">("hours")

  // React Query hook
  const { 
    data: sleepDataResponse, 
    isLoading, 
    error 
  } = useSleepData(userId)

  const rawSleepData = sleepDataResponse?.sleepData || []

  // Process data for charts
  const sleepData: SleepDataPoint[] = rawSleepData
    .slice(0, 7) // Last 7 days
    .reverse() // Show oldest to newest
    .map((item: any) => ({
      day: new Date(item.date).toLocaleDateString("en-US", { weekday: "short" }),
      date: item.date,
      hours: Number(item.total_sleep_hours) || 0,
      efficiency: item.time_in_bed ? Math.round((Number(item.total_sleep_hours) / Number(item.time_in_bed)) * 100) : 0,
      rem: Number(item.rem_percentage) || 0,
      shieldScore: Number(item.shield_score) || 0,
    }))

  // Process sleep stages data from latest entry
  const sleepStagesData: SleepStageData[] = rawSleepData.length > 0 ? [
    {
      name: "REM Sleep", 
      value: Number(rawSleepData[0].rem_percentage) || 0,
      color: "#8b5cf6",
    },
    {
      name: "Non-REM Sleep",
      value: Math.max(0, 100 - (Number(rawSleepData[0].rem_percentage) || 0)),
      color: "#06b6d4",
    },
  ].filter(stage => stage.value > 0) : []

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return <ErrorState error={error.message} />
  }

  if (sleepData.length === 0) {
    return <EmptyState />
  }

  const chartConfig = CHART_CONFIG[activeChart]

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Moon className="h-6 w-6 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Sleep Analytics</h3>
        </div>
        <ChartToggle activeChart={activeChart} onToggle={setActiveChart} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sleep Trend Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-4">
            {sleepData.length}-Day {chartConfig.label}
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sleepData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  domain={activeChart === "shield" ? [0, 100] : undefined} 
                />
                <Tooltip content={<CustomTooltip activeChart={activeChart} />} />
                <Line
                  type="monotone"
                  dataKey={chartConfig.dataKey}
                  stroke={chartConfig.color}
                  strokeWidth={3}
                  dot={{
                    fill: chartConfig.color,
                    strokeWidth: 2,
                    r: 4,
                  }}
                  activeDot={{
                    r: 6,
                    fill: chartConfig.color,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Stats for SHIELD */}
          {activeChart === "shield" && <ShieldStats sleepData={sleepData} />}
        </div>

        {/* Sleep Stages Distribution */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-4">
            Sleep Stages {sleepStagesData.length > 0 ? "(Latest Night)" : ""}
          </h4>
          <SleepStagesChart sleepStagesData={sleepStagesData} />
        </div>
      </div>
    </GlassCard>
  )
}
