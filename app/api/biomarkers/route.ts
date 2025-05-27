import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { HIPAACompliance } from "@/lib/hipaa-compliance"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Fetch lab reports with biomarker data
    const { data: labReports, error } = await supabase
      .from("lab_reports")
      .select(`
        id,
        name,
        biomarkers,
        health_insights,
        extraction_confidence,
        processed_at,
        uploaded_at,
        status
      `)
      .eq("user_id", userId)
      .not("biomarkers", "is", null)
      .eq("status", "processed")
      .order("processed_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Process and aggregate biomarker data
    const processedData = processLabReports(labReports || [])

    return NextResponse.json({
      biomarkerData: processedData,
      totalReports: labReports?.length || 0,
      lastUpdated: labReports?.[0]?.processed_at || null
    })

  } catch (error) {
    console.error('Biomarker API error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Process lab reports to extract and organize biomarker data
function processLabReports(labReports: any[]) {
  const aggregatedBiomarkers: Record<string, any> = {}
  const reportsWithBiomarkers: any[] = []
  const allInsights: string[] = []
  let totalBiomarkers = 0
  let criticalCount = 0
  let highCount = 0
  let lowCount = 0
  let normalCount = 0

  for (const report of labReports) {
    if (!report.biomarkers || report.biomarkers.length === 0) continue

    const reportData = {
      id: report.id,
      name: report.name,
      biomarkers: report.biomarkers,
      health_insights: report.health_insights || [],
      extraction_confidence: report.extraction_confidence,
      processed_at: report.processed_at,
      uploaded_at: report.uploaded_at
    }

    reportsWithBiomarkers.push(reportData)

    // Aggregate insights
    if (report.health_insights) {
      allInsights.push(...report.health_insights)
    }

    // Process individual biomarkers
    for (const biomarker of report.biomarkers) {
      totalBiomarkers++
      
      // Count by status
      switch (biomarker.status) {
        case 'critical': criticalCount++; break
        case 'high': highCount++; break
        case 'low': lowCount++; break
        case 'normal': normalCount++; break
      }

      // Track latest value for each biomarker type
      const key = biomarker.name
      if (!aggregatedBiomarkers[key] || 
          new Date(report.processed_at) > new Date(aggregatedBiomarkers[key].lastUpdated)) {
        aggregatedBiomarkers[key] = {
          ...biomarker,
          lastUpdated: report.processed_at,
          reportId: report.id,
          reportName: report.name
        }
      }
    }
  }

  // Get trending biomarkers (those that appear in multiple reports)
  const trendingBiomarkers = Object.values(aggregatedBiomarkers)
    .filter(biomarker => {
      const count = reportsWithBiomarkers.filter(report => 
        report.biomarkers.some((b: any) => b.name === biomarker.name)
      ).length
      return count > 1
    })
    .sort((a: any, b: any) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())

  // Get critical biomarkers that need attention
  const criticalBiomarkers = Object.values(aggregatedBiomarkers)
    .filter((biomarker: any) => biomarker.status === 'critical' || biomarker.status === 'high')
    .sort((a: any, b: any) => {
      if (a.status === 'critical' && b.status !== 'critical') return -1
      if (b.status === 'critical' && a.status !== 'critical') return 1
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    })

  // Get recent insights (last 10)
  const recentInsights = allInsights
    .slice(0, 10)
    .filter((insight, index, arr) => arr.indexOf(insight) === index) // Remove duplicates

  return {
    summary: {
      totalBiomarkers,
      criticalCount,
      highCount,
      lowCount,
      normalCount,
      reportsProcessed: reportsWithBiomarkers.length
    },
    latestBiomarkers: Object.values(aggregatedBiomarkers)
      .sort((a: any, b: any) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()),
    trendingBiomarkers: trendingBiomarkers,
    criticalBiomarkers: criticalBiomarkers,
    recentInsights,
    reportsWithBiomarkers: reportsWithBiomarkers, // All reports with biomarkers
    categories: groupBiomarkersByCategory(Object.values(aggregatedBiomarkers))
  }
}

// Group biomarkers by category for better organization
function groupBiomarkersByCategory(biomarkers: any[]) {
  const categories: Record<string, any[]> = {
    cardiovascular: [],
    metabolic: [],
    inflammatory: [],
    hormonal: [],
    other: []
  }

  for (const biomarker of biomarkers) {
    const category = biomarker.category || 'other'
    if (categories[category]) {
      categories[category].push(biomarker)
    }
  }

  // Sort each category by status priority (critical first)
  const statusPriority = { critical: 0, high: 1, low: 2, normal: 3 }
  
  for (const category in categories) {
    categories[category].sort((a, b) => {
      const aPriority = statusPriority[a.status as keyof typeof statusPriority] ?? 4
      const bPriority = statusPriority[b.status as keyof typeof statusPriority] ?? 4
      return aPriority - bPriority
    })
  }

  return categories
} 