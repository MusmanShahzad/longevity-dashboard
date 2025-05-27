"use client"

import { useState, useEffect } from "react"
import { X, Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Heart, Zap, Flame, Scale, Stethoscope, FileText, Calendar, Target, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/molecules/modal"
import { GlassCard } from "@/components/atoms/glass-card"

interface BiomarkerReportModalProps {
  reportId: string
  isOpen: boolean
  onClose: () => void
}

interface BiomarkerAnalysis {
  report_id: string
  report_name: string
  processed_at: string
  biomarkers: Array<{
    name: string
    value: number
    unit: string
    referenceRange: string
    status: 'normal' | 'high' | 'low' | 'critical'
    category: 'cardiovascular' | 'metabolic' | 'inflammatory' | 'hormonal' | 'other'
    description: string
    health_impact: string
    recommendations: string[]
  }>
  overall_health_score: number
  risk_factors: string[]
  recommendations: string[]
  summary: string
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'critical':
      return 'bg-red-500/20 text-red-300 border-red-400/30'
    case 'high':
      return 'bg-orange-500/20 text-orange-300 border-orange-400/30'
    case 'low':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
    case 'normal':
      return 'bg-green-500/20 text-green-300 border-green-400/30'
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-400/30'
  }
}

const getHealthScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

// Reusable Components
const StatusMessage = ({ type, message }: { type: 'error' | 'success' | 'warning' | 'info', message: string }) => {
  const configs = {
    error: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    success: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    info: { icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" }
  }
  
  const config = configs[type]
  const Icon = config.icon

  return (
    <div className={`mt-4 p-3 rounded-lg border flex items-center space-x-2 ${config.bg}`}>
      <Icon className={`h-5 w-5 flex-shrink-0 ${config.color}`} />
      <p className={`text-sm ${config.color}`}>{message}</p>
    </div>
  )
}

const LoadingSpinner = ({ message }: { message: string }) => (
  <div className="p-8 text-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
    <p className="text-gray-400">{message}</p>
  </div>
)

const SkeletonLoader = () => (
  <div className="space-y-8">
    {/* Health Score Skeleton */}
    <div className="bg-white/5 rounded-xl p-6 border border-white/10 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-white/10 rounded w-48"></div>
        <div className="h-4 bg-white/10 rounded w-24"></div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="h-16 w-24 bg-white/10 rounded"></div>
        <div className="flex-1">
          <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
            <div className="h-3 bg-gradient-to-r from-white/10 via-white/20 to-white/10 rounded-full w-3/4 animate-shimmer"></div>
          </div>
          <div className="h-4 bg-white/10 rounded w-full mb-1"></div>
          <div className="h-4 bg-white/10 rounded w-2/3"></div>
        </div>
      </div>
    </div>

    {/* Risk Factors Skeleton */}
    <div className="bg-red-500/10 rounded-xl p-6 border border-red-400/20 animate-pulse">
      <div className="flex items-center space-x-2 mb-4">
        <div className="h-6 w-6 bg-red-400/30 rounded"></div>
        <div className="h-6 bg-red-400/30 rounded w-32"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-red-400/20 rounded w-full"></div>
        <div className="h-4 bg-red-400/20 rounded w-4/5"></div>
        <div className="h-4 bg-red-400/20 rounded w-3/4"></div>
      </div>
    </div>

    {/* Biomarkers Skeleton */}
    <div className="animate-pulse">
      <div className="h-7 bg-white/10 rounded w-48 mb-6"></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(9)].map((_, index) => (
          <div key={index} className="bg-white/5 rounded-xl p-5 border border-white/10 animate-pulse" style={{ animationDelay: `${index * 100}ms` }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="h-4 w-4 bg-white/10 rounded"></div>
                <div>
                  <div className="h-5 bg-white/10 rounded w-24 mb-1"></div>
                  <div className="h-3 bg-white/10 rounded w-16"></div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-white/10 rounded"></div>
                <div className="h-5 bg-white/10 rounded w-16"></div>
              </div>
            </div>

            {/* Values */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="h-3 bg-white/10 rounded w-12 mb-1"></div>
                <div className="h-5 bg-white/10 rounded w-20"></div>
              </div>
              <div>
                <div className="h-3 bg-white/10 rounded w-16 mb-1"></div>
                <div className="h-3 bg-white/10 rounded w-24"></div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="h-3 bg-white/10 rounded w-full"></div>
              <div className="h-3 bg-white/10 rounded w-4/5"></div>
              <div className="h-3 bg-white/10 rounded w-3/4"></div>
              
              {/* Recommendations */}
              <div className="mt-2">
                <div className="h-3 bg-cyan-400/20 rounded w-24 mb-1"></div>
                <div className="space-y-1">
                  <div className="h-3 bg-white/10 rounded w-full"></div>
                  <div className="h-3 bg-white/10 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Recommendations Skeleton */}
    <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-400/20 animate-pulse">
      <div className="flex items-center space-x-2 mb-4">
        <div className="h-6 w-6 bg-blue-400/30 rounded"></div>
        <div className="h-6 bg-blue-400/30 rounded w-48"></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="flex items-start space-x-2" style={{ animationDelay: `${index * 150}ms` }}>
            <div className="h-4 w-4 bg-blue-400/30 rounded mt-0.5"></div>
            <div className="flex-1">
              <div className="h-4 bg-blue-400/20 rounded w-full mb-1"></div>
              <div className="h-4 bg-blue-400/20 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Loading indicator */}
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
        <span className="text-gray-400 text-sm">Analyzing biomarkers...</span>
      </div>
    </div>
  </div>
)

const ModalHeader = ({ 
  analysis, 
  onClose 
}: {
  analysis: BiomarkerAnalysis | null
  onClose: () => void
}) => (
  <div className="flex-shrink-0 p-6 border-b border-white/10">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Biomarker Analysis</h2>
          {analysis && (
            <p className="text-sm text-cyan-300">{analysis.report_name}</p>
          )}
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
)

const BiomarkerCard = ({ biomarker }: { biomarker: BiomarkerAnalysis['biomarkers'][0] }) => (
  <div className="bg-white/5 rounded-xl p-5 border border-white/10 hover:bg-white/10 transition-colors">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center space-x-3">
        <CategoryIcon category={biomarker.category} />
        <div>
          <h4 className="font-semibold text-white">{biomarker.name}</h4>
          <p className="text-xs text-gray-400 capitalize">{biomarker.category}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <StatusIcon status={biomarker.status} />
        <Badge className={`text-xs ${getStatusColor(biomarker.status)}`}>
          {biomarker.status.toUpperCase()}
        </Badge>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 mb-3">
      <div>
        <p className="text-xs text-gray-400">Value</p>
        <p className="font-semibold text-white">
          {biomarker.value} {biomarker.unit}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-400">Reference</p>
        <p className="text-xs text-gray-300">{biomarker.referenceRange}</p>
      </div>
    </div>

    <div className="space-y-2">
      <p className="text-xs text-gray-300">{biomarker.description}</p>
      {biomarker.health_impact && (
        <p className="text-xs text-gray-400 italic">{biomarker.health_impact}</p>
      )}
      
      {biomarker.recommendations.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-cyan-300 mb-1">Recommendations:</p>
          <ul className="text-xs text-gray-300 space-y-1">
            {biomarker.recommendations.slice(0, 2).map((rec, recIndex) => (
              <li key={recIndex} className="flex items-start space-x-1">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </div>
)

const AnalysisContent = ({ analysis }: { analysis: BiomarkerAnalysis }) => (
  <div className="space-y-8">
    {/* Health Score Overview */}
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Overall Health Score</h3>
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">
            {new Date(analysis.processed_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className={`text-4xl font-bold ${getHealthScoreColor(analysis.overall_health_score)}`}>
          {analysis.overall_health_score}/100
        </div>
        <div className="flex-1">
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                analysis.overall_health_score >= 80 ? 'bg-green-400' :
                analysis.overall_health_score >= 60 ? 'bg-yellow-400' :
                analysis.overall_health_score >= 40 ? 'bg-orange-400' : 'bg-red-400'
              }`}
              style={{ width: `${analysis.overall_health_score}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-400 mt-2">{analysis.summary}</p>
        </div>
      </div>
    </div>

    {/* Risk Factors */}
    {analysis.risk_factors.length > 0 && (
      <div className="bg-red-500/10 rounded-xl p-6 border border-red-400/20">
        <h3 className="text-xl font-semibold text-red-300 mb-4 flex items-center space-x-2">
          <AlertTriangle className="h-6 w-6" />
          <span>Risk Factors</span>
        </h3>
        <div className="space-y-2">
          {analysis.risk_factors.map((risk, index) => (
            <div key={index} className="text-sm text-red-200 flex items-start space-x-2">
              <span className="text-red-400 mt-1">•</span>
              <span>{risk}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Biomarkers */}
    <div>
      <h3 className="text-xl font-semibold text-white mb-6">Biomarker Details</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {analysis.biomarkers.map((biomarker, index) => (
          <BiomarkerCard key={index} biomarker={biomarker} />
        ))}
      </div>
    </div>

    {/* General Recommendations */}
    {analysis.recommendations.length > 0 && (
      <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-400/20">
        <h3 className="text-xl font-semibold text-blue-300 mb-4 flex items-center space-x-2">
          <Lightbulb className="h-6 w-6" />
          <span>General Recommendations</span>
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {analysis.recommendations.map((recommendation, index) => (
            <div key={index} className="text-sm text-blue-200 flex items-start space-x-2">
              <Target className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <span>{recommendation}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)

export function BiomarkerReportModal({ reportId, isOpen, onClose }: BiomarkerReportModalProps) {
  const [analysis, setAnalysis] = useState<BiomarkerAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && reportId) {
      // Reset state when modal opens
      setAnalysis(null)
      setError(null)
      setLoading(true) // Set loading to true immediately
      fetchBiomarkerAnalysis()
    } else if (!isOpen) {
      // Reset state when modal closes
      setAnalysis(null)
      setError(null)
      setLoading(false)
    }
  }, [isOpen, reportId])

  const fetchBiomarkerAnalysis = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/biomarkers/report/${reportId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch biomarker analysis')
      }
      
      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <GlassCard className="w-full max-w-6xl mx-4 h-[90vh] flex flex-col max-h-[90vh]">
        {/* Header */}
        <ModalHeader analysis={analysis} onClose={onClose} />

        {/* Status Messages */}
        <div className="flex-shrink-0 px-6">
          {error && <StatusMessage type="error" message={error} />}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {loading ? (
            <SkeletonLoader />
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <AlertTriangle className="h-16 w-16 text-red-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Analysis</h3>
              <p className="text-gray-400 text-center max-w-md mb-6">
                We couldn't load the biomarker analysis. This might be due to a network issue or the report is still being processed.
              </p>
              <Button
                onClick={fetchBiomarkerAnalysis}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                Try Again
              </Button>
            </div>
          ) : analysis ? (
            <AnalysisContent analysis={analysis} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No analysis data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && analysis && (
          <div className="flex-shrink-0 p-6 border-t border-white/10">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="text-sm text-gray-400 text-center sm:text-left">
                💡 This analysis is for informational purposes only. Consult your healthcare provider for medical advice.
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-600 text-gray-300 hover:bg-white/5"
                >
                  Close
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                  Print Report
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error State Footer */}
        {error && (
          <div className="flex-shrink-0 p-6 border-t border-white/10">
            <div className="flex justify-center space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:bg-white/5"
              >
                Close
              </Button>
              <Button
                onClick={fetchBiomarkerAnalysis}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </Modal>
  )
} 