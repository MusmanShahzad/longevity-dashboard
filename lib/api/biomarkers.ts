// API layer for biomarker data
import type { Biomarker } from '@/lib/biomarker-extraction'

export interface BiomarkerSummary {
  totalBiomarkers: number
  criticalCount: number
  highCount: number
  lowCount: number
  normalCount: number
  reportsProcessed: number
}

export interface BiomarkerCategories {
  cardiovascular: Biomarker[]
  metabolic: Biomarker[]
  inflammatory: Biomarker[]
  hormonal: Biomarker[]
  other: Biomarker[]
}

export interface ProcessedBiomarkerData {
  summary: BiomarkerSummary
  latestBiomarkers: Biomarker[]
  trendingBiomarkers: Biomarker[]
  criticalBiomarkers: Biomarker[]
  recentInsights: string[]
  reportsWithBiomarkers: Array<{
    id: string
    name: string
    biomarkers: Biomarker[]
    health_insights: string[]
    extraction_confidence: number
    processed_at: string
    uploaded_at: string
  }>
  categories: BiomarkerCategories
}

export interface BiomarkerResponse {
  biomarkerData: ProcessedBiomarkerData
  totalReports: number
  lastUpdated: string | null
}

export async function fetchBiomarkers(userId: string): Promise<BiomarkerResponse> {
  const response = await fetch(`/api/biomarkers?user_id=${userId}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch biomarkers')
  }
  
  return response.json()
}

// Helper functions for biomarker analysis
export function getBiomarkerTrend(biomarkerName: string, reports: any[]): 'improving' | 'worsening' | 'stable' | 'insufficient_data' {
  const biomarkerHistory = reports
    .filter(report => report.biomarkers?.some((b: Biomarker) => b.name === biomarkerName))
    .sort((a, b) => new Date(a.processed_at).getTime() - new Date(b.processed_at).getTime())
    .map(report => report.biomarkers.find((b: Biomarker) => b.name === biomarkerName))
    .filter(Boolean)

  if (biomarkerHistory.length < 2) {
    return 'insufficient_data'
  }

  const latest = biomarkerHistory[biomarkerHistory.length - 1]
  const previous = biomarkerHistory[biomarkerHistory.length - 2]

  // Simple trend analysis based on status changes
  const statusScore = { normal: 3, low: 2, high: 1, critical: 0 }
  const latestScore = statusScore[latest.status as keyof typeof statusScore] ?? 1
  const previousScore = statusScore[previous.status as keyof typeof statusScore] ?? 1

  if (latestScore > previousScore) return 'improving'
  if (latestScore < previousScore) return 'worsening'
  return 'stable'
}

export function getRiskLevel(biomarkerData: ProcessedBiomarkerData): 'low' | 'medium' | 'high' | 'critical' {
  const { criticalCount, highCount, totalBiomarkers } = biomarkerData.summary

  if (criticalCount > 0) return 'critical'
  if (highCount > totalBiomarkers * 0.3) return 'high'
  if (highCount > 0) return 'medium'
  return 'low'
}

export function getHealthScore(biomarkerData: ProcessedBiomarkerData): number {
  const { normalCount, lowCount, highCount, criticalCount, totalBiomarkers } = biomarkerData.summary

  if (totalBiomarkers === 0) return 0

  // Weighted scoring: normal=100, low=70, high=40, critical=0
  const score = (normalCount * 100 + lowCount * 70 + highCount * 40 + criticalCount * 0) / totalBiomarkers
  return Math.round(score)
}

export function getPriorityActions(biomarkerData: ProcessedBiomarkerData): string[] {
  const actions: string[] = []
  const { criticalBiomarkers } = biomarkerData

  // Add actions based on critical biomarkers
  for (const biomarker of criticalBiomarkers.slice(0, 3)) {
    switch (biomarker.category) {
      case 'cardiovascular':
        actions.push(`🫀 Address ${biomarker.name} levels - consult cardiologist`)
        break
      case 'metabolic':
        actions.push(`🍎 Optimize ${biomarker.name} through diet and exercise`)
        break
      case 'inflammatory':
        actions.push(`🔥 Reduce inflammation - consider anti-inflammatory protocol`)
        break
      case 'hormonal':
        actions.push(`⚖️ Balance ${biomarker.name} - consult endocrinologist`)
        break
      default:
        actions.push(`⚠️ Monitor ${biomarker.name} closely - follow up with physician`)
    }
  }

  return actions
} 