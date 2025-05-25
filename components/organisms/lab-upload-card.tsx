"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Upload, FileText, Plus, CheckCircle, Clock, AlertCircle, type LucideIcon } from "lucide-react"
import { GlassCard } from "@/components/atoms/glass-card"
import { Button } from "@/components/ui/button"
import type { LabReport } from "@/lib/supabase"

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

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-24 bg-white/10 rounded-lg mb-6"></div>
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-16 bg-white/10 rounded-lg"></div>
      ))}
    </div>
  </div>
)

// Empty state component
const EmptyState = () => (
  <div className="text-center py-6">
    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
    <h4 className="text-sm font-medium text-white mb-2">No Lab Reports Yet</h4>
    <p className="text-xs text-gray-400">Upload your first lab report to get started</p>
  </div>
)

// File upload zone component
interface FileUploadZoneProps {
  uploading: boolean
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const FileUploadZone = ({ uploading, onFileUpload }: FileUploadZoneProps) => (
  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center mb-6 hover:border-cyan-400 transition-colors">
    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
    <p className="text-sm text-gray-300 mb-3">Upload your latest lab reports for AI analysis</p>
    <div className="relative">
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={onFileUpload}
        disabled={uploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <Button
        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        disabled={uploading}
      >
        <Plus className="h-4 w-4 mr-2" />
        {uploading ? "Uploading..." : "Upload Lab Report"}
      </Button>
    </div>
  </div>
)

// Lab report item component
interface LabReportItemProps {
  report: LabReport
}

const LabReportItem = ({ report }: LabReportItemProps) => {
  const statusConfig = STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default
  const StatusIcon = statusConfig.icon
  
  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString()

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
      <div className="flex items-center space-x-3">
        <FileText className="h-4 w-4 text-cyan-400" />
        <div>
          <p className="text-sm font-medium text-white">{report.name}</p>
          <p className="text-xs text-gray-400">{formatDate(report.uploaded_at)}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
        {report.file_url && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(report.file_url, "_blank")}
            className="text-xs text-cyan-400 hover:text-cyan-300"
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
  const [labReports, setLabReports] = useState<LabReport[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const fetchLabReports = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/lab-reports?user_id=${userId}`)
      const data = await response.json()

      if (response.ok) {
        setLabReports(data.labReports || [])
      }
    } catch (error) {
      console.error("Failed to fetch lab reports:", error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchLabReports()
  }, [fetchLabReports])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', userId)

      const response = await fetch("/api/lab-reports", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload lab report")
      }

      // alert(data.message || "File uploaded successfully!")
      fetchLabReports()
    } catch (error) {
      console.error("Failed to upload lab report:", error)
      alert(`Failed to upload lab report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

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
          <h4 className="text-sm font-medium text-gray-300">Recent Uploads</h4>
          {labReports.map((report) => (
            <LabReportItem key={report.id} report={report} />
          ))}
        </div>
      )}
      
      <InfoBanner />
    </GlassCard>
  )
}
