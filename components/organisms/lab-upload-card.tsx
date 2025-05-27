"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Upload, FileText, Plus, CheckCircle, Clock, AlertCircle, Activity, X } from "lucide-react"
import { GlassCard } from "@/components/atoms/glass-card"
import { Button } from "@/components/ui/button"
import { useLabReportsWithUpload, type LabReport } from "@/lib/hooks/use-lab-reports"
import { BiomarkerReportModal } from "./biomarker-report-modal"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface LabUploadCardProps {
  userId: string
}

// Status configuration object to eliminate duplication
const STATUS_CONFIG = {
  processed: { icon: CheckCircle, color: "text-green-400" },
  processing: { icon: Clock, color: "text-yellow-400" },
  error: { icon: AlertCircle, color: "text-red-400" },
  default: { icon: FileText, color: "text-gray-400" }
} as const

// Reusable header component
const CardHeader = () => (
  <div className="flex items-center space-x-2 mb-6">
    <FileText className="h-6 w-6 text-green-400" />
    <h3 className="text-lg font-semibold text-white">Lab Reports</h3>
  </div>
)

// Optimized loading skeleton component
const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-24 bg-white/10 rounded-lg"></div>
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-16 bg-white/10 rounded-lg"></div>
      ))}
    </div>
  </div>
)

// Optimized empty state component
const EmptyState = () => (
  <div className="text-center py-8">
    <div className="relative">
      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4 opacity-50" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Plus className="h-6 w-6 text-gray-500" />
      </div>
    </div>
    <h4 className="text-sm font-medium text-white mb-2">No Lab Reports Yet</h4>
    <p className="text-xs text-gray-400 max-w-xs mx-auto">
      Upload your first lab report to get AI-powered biomarker analysis and health insights
    </p>
  </div>
)

// Enhanced file upload zone with drag & drop
interface FileUploadZoneProps {
  uploading: boolean
  onFileUpload: (file: File) => void
}

const FileUploadZone = ({ uploading, onFileUpload }: FileUploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const file = files[0]
    if (file && isValidFileType(file)) {
      onFileUpload(file)
    }
  }, [onFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
    }
    e.target.value = ""
  }, [onFileUpload])

  const isValidFileType = (file: File) => {
    const validTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    return validTypes.includes(fileExtension)
  }

  return (
    <div 
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center mb-6 transition-all duration-200",
        isDragOver 
          ? "border-cyan-400 bg-cyan-400/10 scale-[1.02]" 
          : "border-gray-600 hover:border-cyan-400",
        uploading && "opacity-50 pointer-events-none"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload className={cn(
        "h-8 w-8 mx-auto mb-3 transition-colors",
        isDragOver ? "text-cyan-400" : "text-gray-400"
      )} />
      <p className="text-sm text-gray-300 mb-3">
        {isDragOver ? "Drop your lab report here" : "Drag & drop or click to upload lab reports"}
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        disabled={uploading}
      >
        <Plus className="h-4 w-4 mr-2" />
        {uploading ? "Uploading..." : "Upload Lab Report"}
      </Button>
    </div>
  )
}

// Optimized lab report item component
interface LabReportItemProps {
  report: LabReport
  onViewBiomarkers: (reportId: string) => void
}

const LabReportItem = ({ report, onViewBiomarkers }: LabReportItemProps) => {
  const statusConfig = STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default
  const StatusIcon = statusConfig.icon
  const hasBiomarkers = report.status === 'processed' && report.biomarkers && report.biomarkers.length > 0
  
  const formatDate = useCallback((dateString: string) => 
    new Date(dateString).toLocaleDateString(), [])

  const handleAnalysisClick = useCallback(() => {
    onViewBiomarkers(report.id)
  }, [report.id, onViewBiomarkers])

  const handleViewClick = useCallback(() => {
    if (report.file_url) {
      window.open(report.file_url, "_blank")
    }
  }, [report.file_url])

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <FileText className="h-4 w-4 text-cyan-400 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{report.name}</p>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>{formatDistanceToNow(report.uploaded_at)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-1 flex-shrink-0">
        <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
        {hasBiomarkers && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAnalysisClick}
            className="text-xs text-green-400 hover:text-green-300 px-2"
          >
            <Activity className="h-3 w-3 mr-1" />
            Analysis
          </Button>
        )}
        {report.file_url && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewClick}
            className="text-xs text-cyan-400 hover:text-cyan-300 px-2"
          >
            View
          </Button>
        )}
      </div>
    </div>
  )
}

// Info banner component
const InfoBanner = () => (
  <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
    <p className="text-xs text-blue-300">💡 Supported: PDF, JPG, PNG, DOC files up to 10MB</p>
  </div>
)

export function LabUploadCard({ userId }: LabUploadCardProps) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  
  const { 
    data, 
    isLoading: loading, 
    error,
    uploadLabReport,
    isUploading: uploading,
    uploadError,
    uploadSuccess
  } = useLabReportsWithUpload(userId)

  const labReports = data?.labReports || []

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return

    try {
      await uploadLabReport(file)
      // Success is handled automatically by React Query
    } catch (error) {
      console.error("Failed to upload lab report:", error)
      alert(`Failed to upload lab report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [uploadLabReport])

  if (loading) {
    return (
      <GlassCard className="p-6">
        <CardHeader />
        <LoadingSkeleton />
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6">
      <CardHeader />
      <FileUploadZone uploading={uploading} onFileUpload={handleFileUpload} />
      
      {labReports.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-300">Recent Uploads</h4>
            <span className="text-xs text-gray-500">{labReports.length} report{labReports.length !== 1 ? 's' : ''}</span>
          </div>
          {/* Scrollable container with fixed height */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {labReports.map((report) => (
              <LabReportItem 
                key={report.id} 
                report={report} 
                onViewBiomarkers={setSelectedReportId}
              />
            ))}
          </div>
        </div>
      )}
      
      <InfoBanner />
      
      {/* Biomarker Report Modal */}
      {selectedReportId && (
        <BiomarkerReportModal
          reportId={selectedReportId}
          isOpen={!!selectedReportId}
          onClose={() => setSelectedReportId(null)}
        />
      )}
    </GlassCard>
  )
}
