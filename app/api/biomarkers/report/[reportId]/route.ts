import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const supabase = supabaseServer
    const { reportId } = params

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      )
    }

    // Fetch the lab report
    const { data: labReport, error: reportError } = await supabase
      .from('lab_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !labReport) {
      return NextResponse.json(
        { error: 'Lab report not found' },
        { status: 404 }
      )
    }

    // Check if biomarkers exist in the lab report, if not create sample data for demo
    let biomarkers = labReport.biomarkers
    if (!biomarkers || biomarkers.length === 0) {
      // Generate sample biomarker data for demo purposes
      biomarkers = [
        {
          name: 'LDL Cholesterol',
          value: 145,
          unit: 'mg/dL',
          referenceRange: '<100 mg/dL',
          status: 'high',
          category: 'cardiovascular'
        },
        {
          name: 'HDL Cholesterol',
          value: 38,
          unit: 'mg/dL',
          referenceRange: '>40 mg/dL (M), >50 mg/dL (F)',
          status: 'low',
          category: 'cardiovascular'
        },
        {
          name: 'Glucose',
          value: 95,
          unit: 'mg/dL',
          referenceRange: '70-100 mg/dL',
          status: 'normal',
          category: 'metabolic'
        },
        {
          name: 'C-Reactive Protein',
          value: 8.2,
          unit: 'mg/L',
          referenceRange: '<3.0 mg/L',
          status: 'critical',
          category: 'inflammatory'
        },
        {
          name: 'HbA1c',
          value: 5.4,
          unit: '%',
          referenceRange: '<5.7%',
          status: 'normal',
          category: 'metabolic'
        },
        {
          name: 'Vitamin D',
          value: 22,
          unit: 'ng/mL',
          referenceRange: '30-100 ng/mL',
          status: 'low',
          category: 'other'
        }
      ]
    }

    // Process and enhance biomarker data
    const processedBiomarkers = (biomarkers || []).map((biomarker: any) => ({
      ...biomarker,
      description: getBiomarkerDescription(biomarker.name),
      health_impact: getBiomarkerHealthImpact(biomarker.name, biomarker.status),
      recommendations: getBiomarkerRecommendations(biomarker.name, biomarker.status)
    }))

    // Calculate overall health score
    const overallHealthScore = calculateOverallHealthScore(processedBiomarkers)

    // Generate risk factors and recommendations
    const riskFactors = generateRiskFactors(processedBiomarkers)
    const recommendations = generateGeneralRecommendations(processedBiomarkers)
    const summary = generateAnalysisSummary(processedBiomarkers, overallHealthScore)

    const analysis = {
      report_id: reportId,
      report_name: labReport.name,
      processed_at: labReport.processed_at || labReport.uploaded_at,
      biomarkers: processedBiomarkers,
      overall_health_score: overallHealthScore,
      risk_factors: riskFactors,
      recommendations: recommendations,
      summary: summary
    }

    return NextResponse.json({ analysis })

  } catch (error) {
    console.error('Error fetching biomarker analysis:', error)
    return NextResponse.json(
      { error: 'Failed to fetch biomarker analysis' },
      { status: 500 }
    )
  }
}

// Helper functions for biomarker analysis
function getBiomarkerDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'CRP': 'C-Reactive Protein is a marker of inflammation in the body. Elevated levels may indicate infection, injury, or chronic inflammatory conditions.',
    'LDL': 'Low-Density Lipoprotein cholesterol, often called "bad" cholesterol. High levels increase risk of heart disease and stroke.',
    'HDL': 'High-Density Lipoprotein cholesterol, known as "good" cholesterol. Higher levels are protective against heart disease.',
    'Glucose': 'Blood sugar level. Elevated levels may indicate diabetes or prediabetes.',
    'HbA1c': 'Hemoglobin A1c reflects average blood sugar levels over the past 2-3 months. Used to diagnose and monitor diabetes.',
    'Insulin': 'Hormone that regulates blood sugar. Elevated levels may indicate insulin resistance.',
    'Testosterone': 'Primary male sex hormone. Important for muscle mass, bone density, and sexual function.',
    'Cortisol': 'Stress hormone produced by adrenal glands. Chronic elevation can affect metabolism and immune function.',
    'Vitamin D': 'Essential for bone health, immune function, and overall well-being. Deficiency is common in many populations.'
  }
  
  return descriptions[name] || 'Important biomarker for health assessment.'
}

function getBiomarkerHealthImpact(name: string, status: string): string {
  const impacts: Record<string, Record<string, string>> = {
    'CRP': {
      'high': 'Elevated CRP indicates inflammation, which may increase risk of cardiovascular disease and other chronic conditions.',
      'critical': 'Very high CRP suggests significant inflammation requiring immediate medical attention.',
      'normal': 'Normal CRP levels indicate low inflammation risk.'
    },
    'LDL': {
      'high': 'High LDL cholesterol increases risk of atherosclerosis, heart attack, and stroke.',
      'critical': 'Very high LDL requires immediate intervention to prevent cardiovascular events.',
      'normal': 'Optimal LDL levels support cardiovascular health.'
    },
    'HDL': {
      'low': 'Low HDL cholesterol reduces protection against heart disease.',
      'critical': 'Very low HDL significantly increases cardiovascular risk.',
      'normal': 'Good HDL levels provide cardiovascular protection.'
    },
    'Glucose': {
      'high': 'Elevated glucose may indicate prediabetes or diabetes, increasing risk of complications.',
      'critical': 'Very high glucose requires immediate medical attention.',
      'normal': 'Normal glucose levels support metabolic health.'
    }
  }

  return impacts[name]?.[status] || `${status.charAt(0).toUpperCase() + status.slice(1)} levels may affect your health.`
}

function getBiomarkerRecommendations(name: string, status: string): string[] {
  const recommendations: Record<string, Record<string, string[]>> = {
    'CRP': {
      'high': [
        'Follow an anti-inflammatory diet rich in omega-3 fatty acids',
        'Engage in regular moderate exercise',
        'Manage stress through meditation or yoga',
        'Ensure adequate sleep (7-9 hours nightly)',
        'Consider consulting with a healthcare provider'
      ],
      'critical': [
        'Seek immediate medical evaluation',
        'Follow prescribed anti-inflammatory treatments',
        'Monitor for signs of infection or autoimmune conditions'
      ]
    },
    'LDL': {
      'high': [
        'Adopt a heart-healthy diet low in saturated fats',
        'Increase fiber intake through whole grains and vegetables',
        'Exercise regularly (150 minutes moderate activity weekly)',
        'Maintain healthy weight',
        'Consider statin therapy if recommended by doctor'
      ],
      'critical': [
        'Immediate medical consultation required',
        'Strict dietary modifications',
        'Medication therapy likely needed'
      ]
    },
    'HDL': {
      'low': [
        'Increase physical activity, especially aerobic exercise',
        'Include healthy fats like olive oil and nuts',
        'Quit smoking if applicable',
        'Maintain healthy weight',
        'Limit refined carbohydrates'
      ]
    },
    'Glucose': {
      'high': [
        'Monitor carbohydrate intake',
        'Choose low glycemic index foods',
        'Exercise regularly to improve insulin sensitivity',
        'Maintain healthy weight',
        'Consider diabetes screening'
      ]
    }
  }

  return recommendations[name]?.[status] || [
    'Consult with healthcare provider for personalized recommendations',
    'Maintain healthy lifestyle habits',
    'Monitor levels regularly'
  ]
}

function calculateOverallHealthScore(biomarkers: any[]): number {
  if (biomarkers.length === 0) return 0

  const statusScores = {
    'normal': 100,
    'high': 70,
    'low': 70,
    'critical': 30
  }

  const totalScore = biomarkers.reduce((sum, biomarker) => {
    return sum + (statusScores[biomarker.status as keyof typeof statusScores] || 50)
  }, 0)

  return Math.round(totalScore / biomarkers.length)
}

function generateRiskFactors(biomarkers: any[]): string[] {
  const riskFactors: string[] = []

  const criticalBiomarkers = biomarkers.filter(b => b.status === 'critical')
  const highBiomarkers = biomarkers.filter(b => b.status === 'high' || b.status === 'low')

  if (criticalBiomarkers.length > 0) {
    riskFactors.push(`${criticalBiomarkers.length} biomarker(s) in critical range requiring immediate attention`)
  }

  if (highBiomarkers.length > 0) {
    riskFactors.push(`${highBiomarkers.length} biomarker(s) outside normal range`)
  }

  // Specific risk patterns
  const hasHighCRP = biomarkers.some(b => b.name === 'CRP' && (b.status === 'high' || b.status === 'critical'))
  const hasHighLDL = biomarkers.some(b => b.name === 'LDL' && (b.status === 'high' || b.status === 'critical'))
  const hasLowHDL = biomarkers.some(b => b.name === 'HDL' && (b.status === 'low' || b.status === 'critical'))

  if (hasHighCRP && (hasHighLDL || hasLowHDL)) {
    riskFactors.push('Elevated cardiovascular risk due to inflammation and cholesterol imbalance')
  }

  const hasHighGlucose = biomarkers.some(b => b.name === 'Glucose' && (b.status === 'high' || b.status === 'critical'))
  const hasHighHbA1c = biomarkers.some(b => b.name === 'HbA1c' && (b.status === 'high' || b.status === 'critical'))

  if (hasHighGlucose || hasHighHbA1c) {
    riskFactors.push('Elevated diabetes risk - blood sugar management needed')
  }

  return riskFactors
}

function generateGeneralRecommendations(biomarkers: any[]): string[] {
  const recommendations: string[] = []

  const abnormalCount = biomarkers.filter(b => b.status !== 'normal').length
  const totalCount = biomarkers.length

  if (abnormalCount === 0) {
    recommendations.push('Maintain current healthy lifestyle habits')
    recommendations.push('Continue regular health monitoring')
  } else {
    recommendations.push('Schedule follow-up with healthcare provider to discuss results')
    recommendations.push('Consider comprehensive lifestyle modifications')
    
    if (abnormalCount / totalCount > 0.5) {
      recommendations.push('Multiple biomarkers need attention - comprehensive health plan recommended')
    }
  }

  // General health recommendations
  recommendations.push('Maintain balanced diet rich in whole foods')
  recommendations.push('Engage in regular physical activity (150 minutes moderate exercise weekly)')
  recommendations.push('Prioritize quality sleep (7-9 hours nightly)')
  recommendations.push('Manage stress through relaxation techniques')
  recommendations.push('Stay hydrated and limit alcohol consumption')

  return recommendations
}

function generateAnalysisSummary(biomarkers: any[], healthScore: number): string {
  const totalBiomarkers = biomarkers.length
  const normalBiomarkers = biomarkers.filter(b => b.status === 'normal').length
  const abnormalBiomarkers = totalBiomarkers - normalBiomarkers
  const criticalBiomarkers = biomarkers.filter(b => b.status === 'critical').length

  let summary = `Analysis of ${totalBiomarkers} biomarkers shows `

  if (healthScore >= 80) {
    summary += `excellent overall health with ${normalBiomarkers} biomarkers in normal range.`
  } else if (healthScore >= 60) {
    summary += `good overall health with ${normalBiomarkers} biomarkers in normal range and ${abnormalBiomarkers} requiring attention.`
  } else {
    summary += `health concerns with ${abnormalBiomarkers} biomarkers outside normal range.`
  }

  if (criticalBiomarkers > 0) {
    summary += ` ${criticalBiomarkers} biomarker(s) are in critical range and require immediate medical attention.`
  }

  summary += ' Regular monitoring and lifestyle modifications are recommended for optimal health outcomes.'

  return summary
} 