"use client"

import { useState } from "react"
import { Activity, Heart, Zap, Flame, Scale, Stethoscope, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, ArrowLeft, FileText, Calendar, Target } from "lucide-react"
import { PageLayout } from "@/components/layouts/page-layout"
import { StatsCard } from "@/components/ui/stats-card"
import { ContentSection } from "@/components/ui/content-section"
import { GlassCard } from "@/components/atoms/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useBiomarkersWithRefresh } from "@/lib/hooks/use-biomarkers"
import { useLabReportsWithUpload } from "@/lib/hooks/use-lab-reports"
// import { BiomarkerReportModal } from "@/components/organisms/biomarker-report-modal"
import type { Biomarker } from "@/lib/biomarker-extraction"

interface BiomarkersPageProps {
  params: { userId: string }
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
    case 'nutritional':
      return <Stethoscope className="h-4 w-4 text-green-400" />
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

const BiomarkerCard = ({ 
  biomarker, 
  reportName, 
  reportDate, 
  onViewReport 
}: { 
  biomarker: Biomarker
  reportName?: string
  reportDate?: string
  onViewReport?: () => void
}) => (
  <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-4 hover:bg-white/15 transition-all duration-300 cursor-pointer" onClick={onViewReport}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center space-x-3">
        <CategoryIcon category={biomarker.category} />
        <div>
          <h4 className="text-lg font-semibold text-white">{biomarker.name}</h4>
          <p className="text-sm text-gray-400 capitalize">{biomarker.category}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <StatusIcon status={biomarker.status} />
        <Badge className={`text-xs ${getStatusColor(biomarker.status)}`}>
          {biomarker.status.toUpperCase()}
        </Badge>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-3">
      <div>
        <p className="text-sm text-gray-400">Current Value</p>
        <p className="text-lg font-semibold text-white">
          {biomarker.value} {biomarker.unit}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-400">Reference Range</p>
        <p className="text-sm text-gray-300">{biomarker.referenceRange}</p>
      </div>
    </div>

    {reportName && (
      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-white/10">
        <div className="flex items-center space-x-2">
          <FileText className="h-3 w-3" />
          <span>{reportName}</span>
        </div>
        {reportDate && (
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(reportDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    )}
  </div>
)

const CategorySection = ({ 
  title, 
  biomarkers, 
  icon, 
  reports,
  onViewReport 
}: { 
  title: string
  biomarkers: Biomarker[]
  icon: React.ReactNode
  reports?: any[]
  onViewReport?: (reportId: string) => void
}) => {
  if (biomarkers.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        {icon}
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <Badge variant="outline" className="text-gray-400 border-gray-400/30">
          {biomarkers.length} biomarkers
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {biomarkers.map((biomarker, index) => {
          const report = reports?.find(r => r.biomarkers?.some((b: any) => b.name === biomarker.name))
          return (
            <BiomarkerCard
              key={`${biomarker.name}-${index}`}
              biomarker={biomarker}
              reportName={report?.name}
              reportDate={report?.uploaded_at}
              onViewReport={() => report && onViewReport?.(report.id)}
            />
          )
        })}
      </div>
    </div>
  )
}

const SummaryCard = ({ title, value, subtitle, icon, color }: {
  title: string
  value: number
  subtitle?: string
  icon: React.ReactNode
  color: string
}) => (
  <GlassCard className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-400 mb-1">{title}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-lg bg-white/10 ${color}`}>
        {icon}
      </div>
    </div>
  </GlassCard>
)

export default function BiomarkersPage({ params }: BiomarkersPageProps) {
  const { userId } = params
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  
  const { data: biomarkerData, isLoading: biomarkersLoading, error: biomarkersError } = useBiomarkersWithRefresh(userId)
  const { data: reportsData, isLoading: reportsLoading } = useLabReportsWithUpload(userId)

  const isLoading = biomarkersLoading || reportsLoading
  const error = biomarkersError

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-white/10 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/10 rounded"></div>
          ))}
        </div>
        <div className="h-96 bg-white/10 rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Error Loading Biomarkers</h2>
        <p className="text-gray-400 mb-6">{error.message}</p>
        <Link href={`/user/${userId}`}>
          <Button variant="outline" className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  const analysis = biomarkerData?.biomarkerData
  const reports = reportsData?.labReports || []

  if (!analysis || analysis.summary.totalBiomarkers === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={`/user/${userId}`}>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-white">Biomarker Analysis</h1>
          </div>
        </div>

        <div className="text-center py-12">
          <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Biomarker Data Available</h2>
          <p className="text-gray-400 mb-6">
            Upload lab reports to see detailed biomarker analysis and health insights.
          </p>
          <Link href={`/user/${userId}`}>
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
              <Target className="h-4 w-4 mr-2" />
              Upload Lab Reports
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const { summary, categories, criticalBiomarkers } = analysis

  return (
    <PageLayout
      title="Biomarker Analysis"
      subtitle="Comprehensive health insights from your lab reports"
      icon={<Activity className="h-6 w-6 text-cyan-400" />}
      showBackButton={true}
      onBack={() => window.history.back()}
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <StatsCard
            title="Total Biomarkers"
            value={summary.totalBiomarkers}
            subtitle={`From ${summary.reportsProcessed} reports`}
            icon={Activity}
            iconColor="text-cyan-400"
          />
          <StatsCard
            title="Normal Range"
            value={summary.normalCount}
            subtitle={`${Math.round((summary.normalCount / summary.totalBiomarkers) * 100)}% of total`}
            icon={CheckCircle}
            iconColor="text-green-400"
          />
          <StatsCard
            title="Out of Range"
            value={summary.highCount + summary.lowCount}
            subtitle="Need attention"
            icon={AlertTriangle}
            iconColor="text-orange-400"
          />
          <StatsCard
            title="Critical"
            value={summary.criticalCount}
            subtitle="Immediate action needed"
            icon={AlertTriangle}
            iconColor="text-red-400"
          />
        </div>

        {/* Critical Biomarkers Section */}
        {criticalBiomarkers.length > 0 && (
          <ContentSection
            title="Critical Biomarkers"
            icon={AlertTriangle}
            badge={{ text: "Immediate Attention Required", variant: "error" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {criticalBiomarkers.map((biomarker, index) => {
                const report = reports.find((r: any) => r.biomarkers?.some((b: any) => b.name === biomarker.name))
                return (
                  <BiomarkerCard
                    key={`critical-${index}`}
                    biomarker={biomarker}
                    reportName={report?.name}
                    reportDate={report?.uploaded_at}
                    onViewReport={() => report && setSelectedReportId(report.id)}
                  />
                )
              })}
            </div>
          </ContentSection>
        )}

        {/* Category Sections */}
        <div className="space-y-8">
          <CategorySection
            title="Cardiovascular Health"
            biomarkers={categories.cardiovascular}
            icon={<Heart className="h-6 w-6 text-red-400" />}
            reports={reports}
            onViewReport={setSelectedReportId}
          />
          
          <CategorySection
            title="Metabolic Health"
            biomarkers={categories.metabolic}
            icon={<Zap className="h-6 w-6 text-blue-400" />}
            reports={reports}
            onViewReport={setSelectedReportId}
          />
          
          <CategorySection
            title="Inflammatory Markers"
            biomarkers={categories.inflammatory}
            icon={<Flame className="h-6 w-6 text-orange-400" />}
            reports={reports}
            onViewReport={setSelectedReportId}
          />
          
          <CategorySection
            title="Hormonal Balance"
            biomarkers={categories.hormonal}
            icon={<Scale className="h-6 w-6 text-purple-400" />}
            reports={reports}
            onViewReport={setSelectedReportId}
          />
          
                     <CategorySection
             title="Other Markers"
             biomarkers={categories.other}
             icon={<Stethoscope className="h-6 w-6 text-green-400" />}
             reports={reports}
             onViewReport={setSelectedReportId}
           />
        </div>

                 {/* Biomarker Report Modal */}
         {selectedReportId && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
             <div className="bg-gray-900 p-6 rounded-lg max-w-2xl w-full mx-4">
               <h3 className="text-xl font-bold text-white mb-4">Report Analysis</h3>
               <p className="text-gray-400 mb-4">Report ID: {selectedReportId}</p>
               <button 
                 onClick={() => setSelectedReportId(null)}
                 className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded"
               >
                 Close
               </button>
             </div>
           </div>
         )}
    </PageLayout>
  )
} 