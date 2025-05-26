"use client"

import { useMemo } from "react"
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Eye, Heart, Zap, Flame, Scale, Stethoscope, ExternalLink } from "lucide-react"
import { GlassCard } from "@/components/atoms/glass-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useBiomarkersWithRefresh } from "@/lib/hooks/use-biomarkers"
import { getRiskLevel, getHealthScore, getPriorityActions } from "@/lib/api/biomarkers"
import type { Biomarker } from "@/lib/biomarker-extraction"

interface BiomarkerAnalysisCardProps {
  userId: string
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case 'high':
      return <TrendingUp className="h-4 w-4 text-orange-400" />
    case 'low':
      return <TrendingDown className="h-4 w-4 text-yellow-400" />
    case 'normal':
      return <CheckCircle className="h-4 w-4 text-green-400" />
    default:
      return <Activity className="h-4 w-4 text-gray-400" />
  }
}

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'cardiovascular':
      return <Heart className="h-4 w-4 text-red-400" />
    case 'metabolic':
      return <Zap className="h-4 w-4 text-blue-400" />
    case 'inflammatory':
      return <Flame className="h-4 w-4 text-orange-400" />
    case 'hormonal':
      return <Scale className="h-4 w-4 text-purple-400" />
    default:
      return <Stethoscope className="h-4 w-4 text-gray-400" />
  }
}

const BiomarkerItem = ({ biomarker }: { biomarker: Biomarker & { lastUpdated?: string; reportName?: string } }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
    <div className="flex items-center space-x-3">
      <StatusIcon status={biomarker.status} />
      <CategoryIcon category={biomarker.category} />
      <div>
        <h5 className="text-sm font-medium text-white">{biomarker.name}</h5>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <span className="capitalize">{biomarker.category}</span>
          {biomarker.reportName && (
            <>
              <span>•</span>
              <span>{biomarker.reportName}</span>
            </>
          )}
        </div>
      </div>
    </div>
    <div className="text-right">
      <div className="text-sm font-semibold text-white">
        {biomarker.value} {biomarker.unit}
      </div>
      <div className="text-xs text-gray-400">
        Ref: {biomarker.referenceRange}
      </div>
      {biomarker.lastUpdated && (
        <div className="text-xs text-gray-500 mt-1">
          {new Date(biomarker.lastUpdated).toLocaleDateString()}
        </div>
      )}
    </div>
  </div>
)

const HealthScoreDisplay = ({ score, riskLevel }: { score: number; riskLevel: string }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-500/10 border-green-400/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-400/20'
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-400/20'
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-400/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-400/20'
    }
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
      <div>
        <h4 className="text-sm font-medium text-white mb-1">Health Score</h4>
        <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
          {score}/100
        </div>
      </div>
      <div className={`px-3 py-1 rounded-full border text-xs font-medium uppercase ${getRiskColor(riskLevel)}`}>
        {riskLevel} Risk
      </div>
    </div>
  )
}

const CategorySection = ({ title, biomarkers, icon }: { 
  title: string; 
  biomarkers: Biomarker[]; 
  icon: React.ReactNode 
}) => {
  if (biomarkers.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        {icon}
        <h4 className="text-sm font-medium text-white">{title}</h4>
        <span className="text-xs text-gray-400">({biomarkers.length})</span>
      </div>
      <div className="space-y-2">
        {biomarkers.slice(0, 3).map((biomarker, index) => (
          <BiomarkerItem key={`${biomarker.name}-${index}`} biomarker={biomarker} />
        ))}
        {biomarkers.length > 3 && (
          <div className="text-xs text-gray-400 text-center py-2">
            +{biomarkers.length - 3} more {title.toLowerCase()} biomarkers
          </div>
        )}
      </div>
    </div>
  )
}

const InsightItem = ({ insight }: { insight: string }) => {
  const getInsightStyle = (insight: string) => {
    if (insight.includes('🚨') || insight.includes('CRITICAL')) 
      return 'border-red-400/30 bg-red-500/10 text-red-300'
    if (insight.includes('⚠️') || insight.includes('HIGH')) 
      return 'border-orange-400/30 bg-orange-500/10 text-orange-300'
    if (insight.includes('⬇️') || insight.includes('LOW')) 
      return 'border-yellow-400/30 bg-yellow-500/10 text-yellow-300'
    if (insight.includes('✅') || insight.includes('NORMAL')) 
      return 'border-green-400/30 bg-green-500/10 text-green-300'
    return 'border-blue-400/30 bg-blue-500/10 text-blue-300'
  }

  return (
    <div className={`p-3 rounded-lg border text-sm ${getInsightStyle(insight)}`}>
      {insight}
    </div>
  )
}

export function BiomarkerAnalysisCard({ userId }: BiomarkerAnalysisCardProps) {
  const { data, isLoading, error, refreshBiomarkers } = useBiomarkersWithRefresh(userId)

  const analysis = useMemo(() => {
    if (!data?.biomarkerData) return null

    const { biomarkerData } = data
    const healthScore = getHealthScore(biomarkerData)
    const riskLevel = getRiskLevel(biomarkerData)
    const priorityActions = getPriorityActions(biomarkerData)

    return {
      healthScore,
      riskLevel,
      priorityActions,
      ...biomarkerData
    }
  }, [data])

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="h-6 w-6 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Biomarker Analysis</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-white/10 rounded"></div>
          <div className="h-20 bg-white/10 rounded"></div>
          <div className="h-20 bg-white/10 rounded"></div>
        </div>
      </GlassCard>
    )
  }

  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="h-6 w-6 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Biomarker Analysis</h3>
        </div>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 mb-4">{error.message}</p>
          <Button
            onClick={refreshBiomarkers}
            variant="outline"
            size="sm"
            className="border-red-400 text-red-400 hover:bg-red-400/10"
          >
            Try Again
          </Button>
        </div>
      </GlassCard>
    )
  }

  if (!analysis || analysis.summary.totalBiomarkers === 0) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="h-6 w-6 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Biomarker Analysis</h3>
        </div>
        <div className="text-center py-8">
          <Eye className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-white mb-2">No Biomarker Data</h4>
          <p className="text-gray-400 text-sm mb-4">
            Upload lab reports to see AI-powered biomarker analysis and health insights.
          </p>
          <Button
            onClick={refreshBiomarkers}
            variant="outline"
            size="sm"
            className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
          >
            Check for Updates
          </Button>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Biomarker Analysis</h3>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-4 text-sm">
            <div className="text-cyan-400">
              {analysis.summary.totalBiomarkers} biomarkers
            </div>
            <div className="text-gray-400">
              {analysis.summary.reportsProcessed} reports
            </div>
          </div>
          <Link href={`/user/${userId}/biomarkers`}>
            <Button
              variant="outline"
              size="sm"
              className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View All
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Health Score Overview */}
        <HealthScoreDisplay 
          score={analysis.healthScore} 
          riskLevel={analysis.riskLevel} 
        />

        {/* Critical Biomarkers */}
        {analysis.criticalBiomarkers.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-red-400 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Needs Attention ({analysis.criticalBiomarkers.length})</span>
            </h4>
            <div className="space-y-2">
              {analysis.criticalBiomarkers.slice(0, 3).map((biomarker, index) => (
                <BiomarkerItem key={`critical-${index}`} biomarker={biomarker} />
              ))}
            </div>
          </div>
        )}

        {/* Priority Actions */}
        {analysis.priorityActions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">Priority Actions</h4>
            <div className="space-y-2">
              {analysis.priorityActions.map((action, index) => (
                <div key={index} className="p-3 rounded-lg bg-blue-500/10 border border-blue-400/20 text-blue-300 text-sm">
                  {action}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Biomarker Categories */}
        <div className="space-y-4">
          <CategorySection
            title="Cardiovascular"
            biomarkers={analysis.categories.cardiovascular}
            icon={<Heart className="h-4 w-4 text-red-400" />}
          />
          <CategorySection
            title="Metabolic"
            biomarkers={analysis.categories.metabolic}
            icon={<Zap className="h-4 w-4 text-blue-400" />}
          />
          <CategorySection
            title="Inflammatory"
            biomarkers={analysis.categories.inflammatory}
            icon={<Flame className="h-4 w-4 text-orange-400" />}
          />
          <CategorySection
            title="Hormonal"
            biomarkers={analysis.categories.hormonal}
            icon={<Scale className="h-4 w-4 text-purple-400" />}
          />
        </div>

        {/* Recent Insights */}
        {analysis.recentInsights.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">AI Health Insights</h4>
            <div className="space-y-2">
              {analysis.recentInsights.slice(0, 3).map((insight, index) => (
                <InsightItem key={index} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        {data?.lastUpdated && (
          <div className="text-xs text-gray-400 text-center pt-4 border-t border-white/10">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </GlassCard>
  )
} 