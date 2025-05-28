import { type NextRequest, NextResponse } from "next/server"
import { supabase, calculateAge } from "@/lib/supabase"
import { withAPISecurity, commonSchemas, type SecurityContext } from "@/lib/api-security"
import { HIPAAAuditLogger } from "@/lib/hipaa-compliance"
import { z } from "zod"

// Input validation schema
const metricsRequestSchema = z.object({
  id: commonSchemas.userId
})

async function secureMetricsHandler(
  request: NextRequest,
  context: SecurityContext,
  routeContext: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = await routeContext.params
  const id = params.id

  // Validate user ID format
  const validation = metricsRequestSchema.safeParse({ id })
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid user ID format" },
      { status: 400 }
    )
  }

  // Set user context for audit logging
  context.userId = id
  try {
    // Get user data with audit logging
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single()

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 })
    }

    // ===== DATE RANGE CALCULATION =====
    // Calculate date 6 days ago for filtering recent sleep data
    // This limits the dataset to exactly the most recent 7 days (today + 6 previous days)
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);  // Subtract 6 days from current date to get 7 total days
    const sixDaysAgoString = sixDaysAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    // Get sleep data for the last 7 days only, ordered by date and created_at
    const { data: allSleepData, error: sleepError } = await supabase
      .from("sleep_data")
      .select("*")
      .eq("user_id", id)
      .gte("date", sixDaysAgoString)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })

    if (sleepError) {
      return NextResponse.json({ error: sleepError.message }, { status: 400 })
    }

    // ===== SLEEP DATA PROCESSING =====
    // Since we now prevent duplicates at the database level, we can work directly with the data
    // The query already orders by date DESC, created_at DESC, so we get the most recent records first
    const sleepData = allSleepData?.slice(0, 7) || []; // Limit to exactly 7 most recent days

    // ===== METRICS CALCULATION =====
    // Calculate user's chronological age from date of birth
    const chronologicalAge = user.date_of_birth ? calculateAge(user.date_of_birth) : 0

    // Initialize metric variables with default values
    let avgShieldScore = 0
    let bioAgeDelta = 0
    let avgSleepEfficiency = 0
    let avgRemPercentage = 0
    let avgSleepHours = 0
    let dailyShieldScores: Array<{ date: string; score: number; day: string }> = []
    let bioAgeResult: any = null

    if (sleepData && sleepData.length > 0) {
      // ===== AVERAGE CALCULATIONS =====
      // Calculate mean values across all sleep records in the 7-day period
      
      // SLEEP EFFICIENCY AVERAGE:
      // Sum all sleep efficiency values and divide by number of records
      // Formula: Σ(sleep_efficiency) / n
      avgSleepEfficiency = sleepData.reduce((sum: number, data: any) => sum + (data.sleep_efficiency || 0), 0) / sleepData.length
      
      // REM PERCENTAGE AVERAGE:
      // Sum all REM percentages and divide by number of records
      // Formula: Σ(rem_percentage) / n
      avgRemPercentage = sleepData.reduce((sum: number, data: any) => sum + (data.rem_percentage || 0), 0) / sleepData.length
      
      // SLEEP HOURS AVERAGE:
      // Sum all total sleep hours and divide by number of records
      // Formula: Σ(total_sleep_hours) / n
      avgSleepHours = sleepData.reduce((sum: number, data: any) => sum + (data.total_sleep_hours || 0), 0) / sleepData.length

      // ===== NEW METRICS AVERAGES =====
      // Calculate averages for new sleep metrics
      
      // HRV AVERAGE (only include records with HRV data):
      const validHrvData = sleepData.filter((data: any) => data.hrv_overnight !== null && data.hrv_overnight !== undefined)
      const avgHrv = validHrvData.length > 0 
        ? validHrvData.reduce((sum: number, data: any) => sum + data.hrv_overnight, 0) / validHrvData.length 
        : undefined

      // SLEEP LATENCY AVERAGE (only include records with latency data):
      const validLatencyData = sleepData.filter((data: any) => data.sleep_latency_minutes !== null && data.sleep_latency_minutes !== undefined)
      const avgSleepLatency = validLatencyData.length > 0 
        ? validLatencyData.reduce((sum: number, data: any) => sum + data.sleep_latency_minutes, 0) / validLatencyData.length 
        : undefined

      // TIMING CONSISTENCY AVERAGE (only include records with timing data):
      const validTimingData = sleepData.filter((data: any) => data.timing_consistency_hours !== null && data.timing_consistency_hours !== undefined)
      const avgTimingConsistency = validTimingData.length > 0 
        ? validTimingData.reduce((sum: number, data: any) => sum + data.timing_consistency_hours, 0) / validTimingData.length 
        : undefined

      // CHRONOTYPE ALIGNMENT PERCENTAGE (calculate percentage of days with good alignment):
      const validAlignmentData = sleepData.filter((data: any) => data.chronotype_alignment !== null && data.chronotype_alignment !== undefined)
      const chronotypeAlignment = validAlignmentData.length > 0 
        ? (validAlignmentData.filter((data: any) => data.chronotype_alignment === true).length / validAlignmentData.length) * 100
        : undefined

      // ===== SHIELD SCORE AVERAGE =====
      // Calculate average SHIELD score from stored daily scores
      // Only include records with valid (non-null) SHIELD scores
      const validShieldScores = sleepData.filter(
        (data: any) => data.shield_score !== null && data.shield_score !== undefined,
      )
      if (validShieldScores.length > 0) {
        // Formula: Σ(shield_score) / n (where n = valid scores only)
        avgShieldScore = validShieldScores.reduce((sum: number, data: any) => sum + data.shield_score, 0) / validShieldScores.length
      }

      // ===== DAILY SHIELD SCORES PREPARATION =====
      // Prepare daily SHIELD scores for chart visualization (already filtered to last 7 days)
      dailyShieldScores = sleepData
        .slice() // Create a copy to avoid mutating the original array
        .reverse() // Show oldest to newest for chronological chart display
        .map((data: any) => ({
          date: data.date,
          score: data.shield_score || 0,
          day: new Date(data.date).toLocaleDateString("en-US", { weekday: "short" }),  // Convert to short day name (Mon, Tue, etc.)
        }))

      // ===== BIO-AGE DELTA CALCULATION =====
      // Calculate how sleep quality affects biological vs chronological age
      // Now includes new metrics: HRV, sleep latency, timing consistency, chronotype alignment
      bioAgeResult = calculateBioAgeWithBreakdown(
        chronologicalAge, 
        avgSleepEfficiency, 
        avgRemPercentage, 
        avgSleepHours,
        avgHrv,
        avgSleepLatency,
        avgTimingConsistency,
        chronotypeAlignment
      )
      bioAgeDelta = bioAgeResult.delta
      
      console.log('Bio-age calculation completed:', {
        chronologicalAge,
        avgSleepEfficiency,
        avgRemPercentage,
        avgSleepHours,
        avgHrv,
        avgSleepLatency,
        avgTimingConsistency,
        chronotypeAlignment,
        bioAgeDelta,
        hasBreakdown: !!bioAgeResult,
        breakdownData: bioAgeResult?.breakdown,
        recommendationsCount: bioAgeResult?.recommendations?.length || 0
      })
    }

    return NextResponse.json({
      metrics: {
        chronologicalAge,
        biologicalAge: chronologicalAge + bioAgeDelta,
        bioAgeDelta,
        avgShieldScore: Math.round(avgShieldScore),
        avgSleepEfficiency,
        avgRemPercentage,
        avgSleepHours,
        sleepDataCount: sleepData?.length || 0,
        dailyShieldScores,
        bioAgeBreakdown: bioAgeResult && sleepData?.length > 0 ? {
          breakdown: bioAgeResult.breakdown,
          recommendations: bioAgeResult.recommendations
        } : null,
      },
    })
  } catch (error) {
    // Error logging is handled by the security wrapper
    throw error
  }
}

// Export the secured endpoint
export const GET = withAPISecurity(secureMetricsHandler, {
  allowedMethods: ['GET'],
  auditEventType: 'data_access',
  riskLevel: 'low',
  requireAuth: true
})

// ===== BIO-AGE MODIFIER CALCULATION WITH BREAKDOWN =====
// Enhanced function that provides detailed breakdown of bio-age calculation
// Based on peer-reviewed research on sleep, circadian health, recovery, and longevity
function calculateBioAgeWithBreakdown(
  chronologicalAge: number,
  sleepEfficiency: number,
  remPercentage: number,
  avgSleepHours: number,
  avgHrv?: number,
  avgSleepLatency?: number,
  avgTimingConsistency?: number,
  chronotypeAlignment?: number // percentage of days with good alignment
): {
  delta: number
  breakdown: {
    sleepQualityPercentage: number
    hrvScore: number
    tstScore: number
    efficiencyScore: number
    remScore: number
    latencyScore: number
    timingConsistencyScore: number
    chronotypeAlignmentScore: number
    ageAdjustmentFactor: number
    baseModifier: number
    adjustedModifier: number
  }
  recommendations: Array<{
    category: string
    current: string
    target: string
    priority: 'high' | 'medium' | 'low'
    impact: string
    tips: string[]
  }>
} {
  // ===== VALIDATION =====
  if (chronologicalAge <= 0 || sleepEfficiency < 0 || remPercentage < 0 || avgSleepHours < 0) {
    return {
      delta: 0,
      breakdown: {
        sleepQualityPercentage: 0,
        hrvScore: 0,
        tstScore: 0,
        efficiencyScore: 0,
        remScore: 0,
        latencyScore: 0,
        timingConsistencyScore: 0,
        chronotypeAlignmentScore: 0,
        ageAdjustmentFactor: 1,
        baseModifier: 0,
        adjustedModifier: 0
      },
      recommendations: []
    }
  }

  let totalScore = 0;
  let maxPossibleScore = 0;

  // ===== HRV SCORING (Weight: 25%) =====
  // Source: Mandsager et al., JAMA 2018 - HRV highly predictive of resilience, recovery, and mortality
  const hrvWeight = 0.25;
  let hrvScore = 0;
  
  if (avgHrv !== undefined && avgHrv > 0) {
    // Optimal range: > 50ms (research-based threshold)
    if (avgHrv >= 80) hrvScore = 100;        // Exceptional HRV
    else if (avgHrv >= 70) hrvScore = 95;    // Excellent HRV
    else if (avgHrv >= 60) hrvScore = 90;    // Very good HRV
    else if (avgHrv >= 50) hrvScore = 85;    // Good HRV (meets optimal threshold)
    else if (avgHrv >= 40) hrvScore = 70;    // Below optimal but acceptable
    else if (avgHrv >= 30) hrvScore = 50;    // Poor HRV
    else if (avgHrv >= 20) hrvScore = 30;    // Very poor HRV
    else hrvScore = 10;                      // Critically low HRV
  } else {
    // If HRV not available, use neutral score (no penalty/benefit)
    hrvScore = 75; // Slightly above neutral to not penalize users without HRV data
  }
  
  totalScore += hrvScore * hrvWeight;
  maxPossibleScore += 100 * hrvWeight;

  // ===== TOTAL SLEEP TIME SCORING (Weight: 20%) =====
  // Source: AASM, NIH - Sleep duration correlates with mortality U-curve
  const tstWeight = 0.2;
  let tstScore = 0;
  
  // Optimal range: 7-8.5 hours (research-based)
  if (avgSleepHours >= 7.5 && avgSleepHours <= 8) tstScore = 100;      // Optimal sweet spot
  else if (avgSleepHours >= 7 && avgSleepHours < 7.5) tstScore = 95;   // Very good
  else if (avgSleepHours > 8 && avgSleepHours <= 8.5) tstScore = 95;   // Very good
  else if (avgSleepHours >= 6.5 && avgSleepHours < 7) tstScore = 80;   // Acceptable but suboptimal
  else if (avgSleepHours > 8.5 && avgSleepHours <= 9) tstScore = 80;   // Acceptable but suboptimal
  else if (avgSleepHours >= 6 && avgSleepHours < 6.5) tstScore = 60;   // Mild sleep deprivation
  else if (avgSleepHours > 9 && avgSleepHours <= 9.5) tstScore = 60;   // Mild oversleeping
  else if (avgSleepHours >= 5.5 && avgSleepHours < 6) tstScore = 40;   // Moderate sleep deprivation
  else if (avgSleepHours > 9.5 && avgSleepHours <= 10) tstScore = 40;  // Moderate oversleeping
  else if (avgSleepHours >= 5 && avgSleepHours < 5.5) tstScore = 20;   // Severe sleep deprivation
  else if (avgSleepHours > 10) tstScore = 20;                          // Excessive sleep
  else tstScore = 10;                                                  // Critically insufficient sleep
  
  totalScore += tstScore * tstWeight;
  maxPossibleScore += 100 * tstWeight;

  // ===== SLEEP EFFICIENCY SCORING (Weight: 15%) =====
  // Source: AASM - Reflects sleep quality & fragmentation
  const efficiencyWeight = 0.15;
  let efficiencyScore = 0;
  
  // Optimal range: ≥ 85% (research-based threshold)
  if (sleepEfficiency >= 95) efficiencyScore = 100;      // Exceptional efficiency
  else if (sleepEfficiency >= 90) efficiencyScore = 95;  // Excellent efficiency
  else if (sleepEfficiency >= 85) efficiencyScore = 85;  // Good efficiency (meets threshold)
  else if (sleepEfficiency >= 80) efficiencyScore = 70;  // Below optimal
  else if (sleepEfficiency >= 75) efficiencyScore = 55;  // Poor efficiency
  else if (sleepEfficiency >= 70) efficiencyScore = 40;  // Very poor efficiency
  else efficiencyScore = 20;                             // Critically poor efficiency
  
  totalScore += efficiencyScore * efficiencyWeight;
  maxPossibleScore += 100 * efficiencyWeight;

  // ===== REM SLEEP SCORING (Weight: 10%) =====
  // Source: Sleep Science Textbooks - Supports cognitive aging & emotional regulation
  const remWeight = 0.1;
  let remScore = 0;
  
  // Optimal range: 20-25% (research-based)
  if (remPercentage >= 20 && remPercentage <= 25) remScore = 100;      // Optimal REM range
  else if (remPercentage >= 18 && remPercentage < 20) remScore = 85;   // Slightly low but acceptable
  else if (remPercentage > 25 && remPercentage <= 27) remScore = 85;   // Slightly high but acceptable
  else if (remPercentage >= 15 && remPercentage < 18) remScore = 70;   // Low REM
  else if (remPercentage > 27 && remPercentage <= 30) remScore = 70;   // High REM
  else if (remPercentage >= 12 && remPercentage < 15) remScore = 50;   // Very low REM
  else if (remPercentage > 30 && remPercentage <= 35) remScore = 50;   // Very high REM
  else remScore = 30;                                                  // Severely abnormal REM
  
  totalScore += remScore * remWeight;
  maxPossibleScore += 100 * remWeight;

  // ===== SLEEP LATENCY SCORING (Weight: 10%) =====
  // Source: Sleep Medicine Guidelines - High latency indicates anxiety or hormonal disruption
  const latencyWeight = 0.1;
  let latencyScore = 0;
  
  if (avgSleepLatency !== undefined && avgSleepLatency >= 0) {
    // Optimal range: < 20 minutes (research-based threshold)
    if (avgSleepLatency <= 10) latencyScore = 100;        // Excellent sleep onset
    else if (avgSleepLatency <= 15) latencyScore = 95;    // Very good sleep onset
    else if (avgSleepLatency <= 20) latencyScore = 85;    // Good sleep onset (meets threshold)
    else if (avgSleepLatency <= 30) latencyScore = 70;    // Mild difficulty falling asleep
    else if (avgSleepLatency <= 45) latencyScore = 50;    // Moderate difficulty
    else if (avgSleepLatency <= 60) latencyScore = 30;    // Significant difficulty
    else latencyScore = 15;                               // Severe insomnia symptoms
  } else {
    // If latency not available, use neutral score
    latencyScore = 75; // Slightly above neutral
  }
  
  totalScore += latencyScore * latencyWeight;
  maxPossibleScore += 100 * latencyWeight;

  // ===== TIMING CONSISTENCY SCORING (Weight: 10%) =====
  // Source: Circadian Biology - Disrupted circadian patterns accelerate aging
  const timingWeight = 0.1;
  let timingConsistencyScore = 0;
  
  if (avgTimingConsistency !== undefined && avgTimingConsistency >= 0) {
    // Optimal range: < 1 hour variation (research-based threshold)
    if (avgTimingConsistency <= 0.5) timingConsistencyScore = 100;      // Excellent consistency
    else if (avgTimingConsistency <= 1) timingConsistencyScore = 85;    // Good consistency (meets threshold)
    else if (avgTimingConsistency <= 1.5) timingConsistencyScore = 70;  // Mild inconsistency
    else if (avgTimingConsistency <= 2) timingConsistencyScore = 55;    // Moderate inconsistency
    else if (avgTimingConsistency <= 3) timingConsistencyScore = 40;    // Poor consistency
    else if (avgTimingConsistency <= 4) timingConsistencyScore = 25;    // Very poor consistency
    else timingConsistencyScore = 10;                                   // Severely disrupted circadian rhythm
  } else {
    // If timing consistency not available, use neutral score
    timingConsistencyScore = 75; // Slightly above neutral
  }
  
  totalScore += timingConsistencyScore * timingWeight;
  maxPossibleScore += 100 * timingWeight;

  // ===== CHRONOTYPE ALIGNMENT SCORING (Weight: 10%) =====
  // Source: Roenneberg et al. - Social jet lag linked to metabolic dysfunction
  const chronotypeWeight = 0.1;
  let chronotypeAlignmentScore = 0;
  
  if (chronotypeAlignment !== undefined && chronotypeAlignment >= 0) {
    // Optimal: Matched to activity (high alignment percentage)
    if (chronotypeAlignment >= 90) chronotypeAlignmentScore = 100;      // Excellent alignment
    else if (chronotypeAlignment >= 80) chronotypeAlignmentScore = 90;  // Very good alignment
    else if (chronotypeAlignment >= 70) chronotypeAlignmentScore = 80;  // Good alignment
    else if (chronotypeAlignment >= 60) chronotypeAlignmentScore = 70;  // Acceptable alignment
    else if (chronotypeAlignment >= 50) chronotypeAlignmentScore = 60;  // Poor alignment
    else if (chronotypeAlignment >= 40) chronotypeAlignmentScore = 45;  // Very poor alignment
    else if (chronotypeAlignment >= 30) chronotypeAlignmentScore = 30;  // Severe misalignment
    else chronotypeAlignmentScore = 15;                                 // Critical misalignment (social jet lag)
  } else {
    // If chronotype alignment not available, use neutral score
    chronotypeAlignmentScore = 75; // Slightly above neutral
  }
  
  totalScore += chronotypeAlignmentScore * chronotypeWeight;
  maxPossibleScore += 100 * chronotypeWeight;

  // ===== CALCULATE OVERALL SLEEP QUALITY PERCENTAGE =====
  const sleepQualityPercentage = (totalScore / maxPossibleScore) * 100;

  // ===== CONVERT TO BIO-AGE DELTA =====
  // Map sleep quality percentage to biological age impact (-5 to +5 years)
  // Based on research linking sleep quality deviations to biological aging acceleration
  let bioAgeModifier = 0;
  
  if (sleepQualityPercentage >= 95) bioAgeModifier = -5;      // Exceptional sleep: 5 years younger
  else if (sleepQualityPercentage >= 90) bioAgeModifier = -4; // Excellent sleep: 4 years younger
  else if (sleepQualityPercentage >= 85) bioAgeModifier = -3; // Very good sleep: 3 years younger
  else if (sleepQualityPercentage >= 80) bioAgeModifier = -2; // Good sleep: 2 years younger
  else if (sleepQualityPercentage >= 75) bioAgeModifier = -1; // Above average sleep: 1 year younger
  else if (sleepQualityPercentage >= 65) bioAgeModifier = 0;  // Average sleep: neutral aging
  else if (sleepQualityPercentage >= 55) bioAgeModifier = 1;  // Below average sleep: 1 year older
  else if (sleepQualityPercentage >= 45) bioAgeModifier = 2;  // Poor sleep: 2 years older
  else if (sleepQualityPercentage >= 35) bioAgeModifier = 3;  // Very poor sleep: 3 years older
  else if (sleepQualityPercentage >= 25) bioAgeModifier = 4;  // Severely poor sleep: 4 years older
  else bioAgeModifier = 5;                                   // Critically poor sleep: 5 years older

  // ===== AGE-ADJUSTED IMPACT =====
  // Younger people are more resilient to poor sleep, older people more vulnerable
  let ageAdjustmentFactor = 1.0;
  
  if (chronologicalAge < 25) ageAdjustmentFactor = 0.7;      // Young adults: 30% less impact
  else if (chronologicalAge < 35) ageAdjustmentFactor = 0.85; // Adults: 15% less impact
  else if (chronologicalAge >= 50 && chronologicalAge < 65) ageAdjustmentFactor = 1.15; // Middle-aged: 15% more impact
  else if (chronologicalAge >= 65) ageAdjustmentFactor = 1.3;  // Seniors: 30% more impact
  // Ages 35-49 use default factor of 1.0

  const adjustedBioAgeModifier = Math.round(bioAgeModifier * ageAdjustmentFactor);
  
  // ===== CLAMP TO ±10 YEARS =====
  // Ensure modifier stays within reasonable biological bounds
  const finalDelta = Math.max(-10, Math.min(10, adjustedBioAgeModifier));

  // ===== GENERATE RECOMMENDATIONS =====
  const recommendations = generateEnhancedSleepRecommendations(
    sleepEfficiency, remPercentage, avgSleepHours, chronologicalAge,
    avgHrv, avgSleepLatency, avgTimingConsistency, chronotypeAlignment
  );

  return {
    delta: finalDelta,
    breakdown: {
      sleepQualityPercentage: Math.round(sleepQualityPercentage * 10) / 10,
      hrvScore,
      tstScore,
      efficiencyScore,
      remScore,
      latencyScore,
      timingConsistencyScore,
      chronotypeAlignmentScore,
      ageAdjustmentFactor,
      baseModifier: bioAgeModifier,
      adjustedModifier: adjustedBioAgeModifier
    },
    recommendations
  };
}

// ===== SLEEP RECOMMENDATIONS GENERATOR =====
function generateSleepRecommendations(
  sleepEfficiency: number,
  remPercentage: number,
  avgSleepHours: number,
  chronologicalAge: number
): Array<{
  category: string
  current: string
  target: string
  priority: 'high' | 'medium' | 'low'
  impact: string
  tips: string[]
}> {
  const recommendations: Array<{
    category: string
    current: string
    target: string
    priority: 'high' | 'medium' | 'low'
    impact: string
    tips: string[]
  }> = [];

  // Sleep Efficiency Recommendations
  if (sleepEfficiency < 85) {
    const priority = sleepEfficiency < 75 ? 'high' : sleepEfficiency < 80 ? 'medium' : 'low';
    const impact = sleepEfficiency < 75 ? 'High impact on aging' : sleepEfficiency < 80 ? 'Moderate impact' : 'Minor impact';
    
    recommendations.push({
      category: 'Sleep Efficiency',
      current: `${sleepEfficiency.toFixed(1)}%`,
      target: '85-95%',
      priority,
      impact,
      tips: [
        'Maintain consistent sleep/wake times',
        'Avoid screens 1 hour before bed',
        'Keep bedroom cool (65-68°F)',
        'Use blackout curtains or eye mask',
        'Limit caffeine after 2 PM',
        'Create a relaxing bedtime routine'
      ]
    });
  }

  // REM Sleep Recommendations
  if (remPercentage < 18 || remPercentage > 28) {
    const isLow = remPercentage < 18;
    const priority = (remPercentage < 15 || remPercentage > 30) ? 'high' : 'medium';
    
    recommendations.push({
      category: 'REM Sleep',
      current: `${remPercentage.toFixed(1)}%`,
      target: '20-25%',
      priority,
      impact: isLow ? 'Affects memory and cognitive health' : 'May indicate sleep disorders',
      tips: isLow ? [
        'Avoid alcohol before bed',
        'Manage stress through meditation',
        'Exercise regularly (but not before bed)',
        'Consider magnesium supplementation',
        'Maintain consistent sleep schedule'
      ] : [
        'Consult sleep specialist if persistent',
        'Check for sleep disorders',
        'Reduce stress and anxiety',
        'Avoid stimulants',
        'Review medications with doctor'
      ]
    });
  }

  // Sleep Duration Recommendations
  if (avgSleepHours < 7 || avgSleepHours > 9) {
    const isShort = avgSleepHours < 7;
    const priority = (avgSleepHours < 6 || avgSleepHours > 10) ? 'high' : 'medium';
    
    recommendations.push({
      category: 'Sleep Duration',
      current: `${avgSleepHours.toFixed(1)} hours`,
      target: '7.5-8.5 hours',
      priority,
      impact: isShort ? 'Strong correlation with accelerated aging' : 'May indicate underlying health issues',
      tips: isShort ? [
        'Go to bed 30 minutes earlier',
        'Prioritize sleep over other activities',
        'Improve sleep efficiency first',
        'Avoid late-night activities',
        'Set a consistent bedtime alarm'
      ] : [
        'Consult healthcare provider',
        'Check for sleep disorders',
        'Improve sleep quality over quantity',
        'Consider underlying health conditions',
        'Monitor energy levels during day'
      ]
    });
  }

  // Age-specific recommendations
  if (chronologicalAge >= 50) {
    recommendations.push({
      category: 'Age-Related Sleep',
      current: `${chronologicalAge} years old`,
      target: 'Optimized for age',
      priority: 'medium',
      impact: 'Sleep becomes more important with age',
      tips: [
        'Consider earlier bedtime',
        'Monitor for sleep apnea',
        'Maintain regular exercise',
        'Limit daytime naps to 20 minutes',
        'Consider melatonin supplementation',
        'Regular health checkups'
      ]
    });
  }

  // Sort by priority
  const priorityOrder: Record<'high' | 'medium' | 'low', number> = { high: 3, medium: 2, low: 1 };
  return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
}

// ===== SLEEP RECOMMENDATIONS GENERATOR =====
function generateEnhancedSleepRecommendations(
  sleepEfficiency: number,
  remPercentage: number,
  avgSleepHours: number,
  chronologicalAge: number,
  avgHrv?: number,
  avgSleepLatency?: number,
  avgTimingConsistency?: number,
  chronotypeAlignment?: number
): Array<{
  category: string
  current: string
  target: string
  priority: 'high' | 'medium' | 'low'
  impact: string
  tips: string[]
}> {
  const recommendations: Array<{
    category: string
    current: string
    target: string
    priority: 'high' | 'medium' | 'low'
    impact: string
    tips: string[]
  }> = [];

  // Sleep Efficiency Recommendations
  if (sleepEfficiency < 85) {
    const priority = sleepEfficiency < 75 ? 'high' : sleepEfficiency < 80 ? 'medium' : 'low';
    const impact = sleepEfficiency < 75 ? 'High impact on aging' : sleepEfficiency < 80 ? 'Moderate impact' : 'Minor impact';
    
    recommendations.push({
      category: 'Sleep Efficiency',
      current: `${sleepEfficiency.toFixed(1)}%`,
      target: '85-95%',
      priority,
      impact,
      tips: [
        'Maintain consistent sleep/wake times',
        'Avoid screens 1 hour before bed',
        'Keep bedroom cool (65-68°F)',
        'Use blackout curtains or eye mask',
        'Limit caffeine after 2 PM',
        'Create a relaxing bedtime routine'
      ]
    });
  }

  // REM Sleep Recommendations
  if (remPercentage < 18 || remPercentage > 28) {
    const isLow = remPercentage < 18;
    const priority = (remPercentage < 15 || remPercentage > 30) ? 'high' : 'medium';
    
    recommendations.push({
      category: 'REM Sleep',
      current: `${remPercentage.toFixed(1)}%`,
      target: '20-25%',
      priority,
      impact: isLow ? 'Affects memory and cognitive health' : 'May indicate sleep disorders',
      tips: isLow ? [
        'Avoid alcohol before bed',
        'Manage stress through meditation',
        'Exercise regularly (but not before bed)',
        'Consider magnesium supplementation',
        'Maintain consistent sleep schedule'
      ] : [
        'Consult sleep specialist if persistent',
        'Check for sleep disorders',
        'Reduce stress and anxiety',
        'Avoid stimulants',
        'Review medications with doctor'
      ]
    });
  }

  // Sleep Duration Recommendations
  if (avgSleepHours < 7 || avgSleepHours > 9) {
    const isShort = avgSleepHours < 7;
    const priority = (avgSleepHours < 6 || avgSleepHours > 10) ? 'high' : 'medium';
    
    recommendations.push({
      category: 'Sleep Duration',
      current: `${avgSleepHours.toFixed(1)} hours`,
      target: '7.5-8.5 hours',
      priority,
      impact: isShort ? 'Strong correlation with accelerated aging' : 'May indicate underlying health issues',
      tips: isShort ? [
        'Go to bed 30 minutes earlier',
        'Prioritize sleep over other activities',
        'Improve sleep efficiency first',
        'Avoid late-night activities',
        'Set a consistent bedtime alarm'
      ] : [
        'Consult healthcare provider',
        'Check for sleep disorders',
        'Improve sleep quality over quantity',
        'Consider underlying health conditions',
        'Monitor energy levels during day'
      ]
    });
  }

  // Age-specific recommendations
  if (chronologicalAge >= 50) {
    recommendations.push({
      category: 'Age-Related Sleep',
      current: `${chronologicalAge} years old`,
      target: 'Optimized for age',
      priority: 'medium',
      impact: 'Sleep becomes more important with age',
      tips: [
        'Consider earlier bedtime',
        'Monitor for sleep apnea',
        'Maintain regular exercise',
        'Limit daytime naps to 20 minutes',
        'Consider melatonin supplementation',
        'Regular health checkups'
      ]
    });
  }

  // Sort by priority
  const priorityOrder: Record<'high' | 'medium' | 'low', number> = { high: 3, medium: 2, low: 1 };
  return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
}

// ===== LEGACY FUNCTION FOR BACKWARD COMPATIBILITY =====
function calculateBioAgeDelta(
  chronologicalAge: number,
  sleepEfficiency: number,
  remPercentage: number,
  avgSleepHours: number,
): number {
  // ===== VALIDATION =====
  // Ensure we have valid data for calculations
  if (chronologicalAge <= 0 || sleepEfficiency < 0 || remPercentage < 0 || avgSleepHours < 0) {
    return 0; // Return neutral if invalid data
  }

  // ===== WEIGHTED SCORING SYSTEM =====
  // Use a weighted approach where each factor contributes to overall biological age
  let totalScore = 0;
  let maxPossibleScore = 0;

  // ===== SLEEP EFFICIENCY SCORING (Weight: 40%) =====
  // Sleep efficiency is the most important factor for sleep quality
  const efficiencyWeight = 0.4;
  let efficiencyScore = 0;
  
  if (sleepEfficiency >= 95) {
    efficiencyScore = 100; // Exceptional
  } else if (sleepEfficiency >= 90) {
    efficiencyScore = 90;  // Excellent
  } else if (sleepEfficiency >= 85) {
    efficiencyScore = 80;  // Very good
  } else if (sleepEfficiency >= 80) {
    efficiencyScore = 70;  // Good
  } else if (sleepEfficiency >= 75) {
    efficiencyScore = 60;  // Fair
  } else if (sleepEfficiency >= 70) {
    efficiencyScore = 40;  // Poor
  } else {
    efficiencyScore = 20;  // Very poor
  }
  
  totalScore += efficiencyScore * efficiencyWeight;
  maxPossibleScore += 100 * efficiencyWeight;

  // ===== REM SLEEP SCORING (Weight: 30%) =====
  // REM sleep is crucial for cognitive health and memory consolidation
  const remWeight = 0.3;
  let remScore = 0;
  
  if (remPercentage >= 20 && remPercentage <= 25) {
    remScore = 100; // Optimal REM range
  } else if (remPercentage >= 18 && remPercentage < 20) {
    remScore = 85;  // Slightly low but acceptable
  } else if (remPercentage > 25 && remPercentage <= 28) {
    remScore = 85;  // Slightly high but acceptable
  } else if (remPercentage >= 15 && remPercentage < 18) {
    remScore = 70;  // Low REM
  } else if (remPercentage > 28 && remPercentage <= 32) {
    remScore = 70;  // High REM
  } else if (remPercentage >= 12 && remPercentage < 15) {
    remScore = 50;  // Very low REM
  } else if (remPercentage > 32 && remPercentage <= 35) {
    remScore = 50;  // Very high REM
  } else {
    remScore = 30;  // Severely abnormal REM
  }
  
  totalScore += remScore * remWeight;
  maxPossibleScore += 100 * remWeight;

  // ===== SLEEP DURATION SCORING (Weight: 30%) =====
  // Sleep duration has strong correlation with mortality and health outcomes
  const durationWeight = 0.3;
  let durationScore = 0;
  
  if (avgSleepHours >= 7.5 && avgSleepHours <= 8.5) {
    durationScore = 100; // Optimal duration
  } else if (avgSleepHours >= 7 && avgSleepHours < 7.5) {
    durationScore = 90;  // Good duration
  } else if (avgSleepHours > 8.5 && avgSleepHours <= 9) {
    durationScore = 90;  // Good duration
  } else if (avgSleepHours >= 6.5 && avgSleepHours < 7) {
    durationScore = 75;  // Acceptable but suboptimal
  } else if (avgSleepHours > 9 && avgSleepHours <= 9.5) {
    durationScore = 75;  // Acceptable but suboptimal
  } else if (avgSleepHours >= 6 && avgSleepHours < 6.5) {
    durationScore = 60;  // Mild sleep deprivation
  } else if (avgSleepHours > 9.5 && avgSleepHours <= 10) {
    durationScore = 60;  // Mild oversleeping
  } else if (avgSleepHours >= 5.5 && avgSleepHours < 6) {
    durationScore = 40;  // Moderate sleep deprivation
  } else if (avgSleepHours > 10 && avgSleepHours <= 11) {
    durationScore = 40;  // Moderate oversleeping
  } else if (avgSleepHours >= 5 && avgSleepHours < 5.5) {
    durationScore = 25;  // Severe sleep deprivation
  } else {
    durationScore = 15;  // Extremely poor duration
  }
  
  totalScore += durationScore * durationWeight;
  maxPossibleScore += 100 * durationWeight;

  // ===== CALCULATE OVERALL SLEEP QUALITY PERCENTAGE =====
  const sleepQualityPercentage = (totalScore / maxPossibleScore) * 100;

  // ===== CONVERT TO BIO-AGE DELTA =====
  // Map sleep quality percentage to biological age impact
  // Scale: 0-100% sleep quality maps to -5 to +5 years biological age impact
  let bioAgeModifier = 0;
  
  if (sleepQualityPercentage >= 95) {
    bioAgeModifier = -3;   // Exceptional sleep: 3 years younger
  } else if (sleepQualityPercentage >= 90) {
    bioAgeModifier = -2;   // Excellent sleep: 2 years younger
  } else if (sleepQualityPercentage >= 85) {
    bioAgeModifier = -1;   // Very good sleep: 1 year younger
  } else if (sleepQualityPercentage >= 75) {
    bioAgeModifier = 0;    // Good sleep: neutral aging
  } else if (sleepQualityPercentage >= 65) {
    bioAgeModifier = 1;    // Fair sleep: 1 year older
  } else if (sleepQualityPercentage >= 55) {
    bioAgeModifier = 2;    // Poor sleep: 2 years older
  } else if (sleepQualityPercentage >= 45) {
    bioAgeModifier = 3;    // Very poor sleep: 3 years older
  } else if (sleepQualityPercentage >= 35) {
    bioAgeModifier = 4;    // Severely poor sleep: 4 years older
  } else {
    bioAgeModifier = 5;    // Extremely poor sleep: 5 years older
  }

  // ===== AGE-ADJUSTED IMPACT =====
  // Younger people are more resilient to poor sleep, older people more vulnerable
  let ageAdjustmentFactor = 1.0;
  
  if (chronologicalAge < 25) {
    ageAdjustmentFactor = 0.7;  // Young adults: 30% less impact
  } else if (chronologicalAge < 35) {
    ageAdjustmentFactor = 0.85; // Adults: 15% less impact
  } else if (chronologicalAge >= 50 && chronologicalAge < 65) {
    ageAdjustmentFactor = 1.15; // Middle-aged: 15% more impact
  } else if (chronologicalAge >= 65) {
    ageAdjustmentFactor = 1.3;  // Seniors: 30% more impact
  }
  // Ages 35-49 use default factor of 1.0

  // Apply age adjustment
  const adjustedBioAgeModifier = Math.round(bioAgeModifier * ageAdjustmentFactor);

  // ===== FINAL CALCULATION =====
  // Return the bio-age modifier directly
  // Positive modifier = biologically older, Negative modifier = biologically younger
  
  // ===== BOUNDS CHECKING =====
  // Ensure modifier is within reasonable bounds (-10 to +10 years)
  return Math.max(-10, Math.min(10, adjustedBioAgeModifier));
  
  // ===== INTERPRETATION =====
  // bioAgeDelta > 0: Sleep quality accelerates biological aging (older)
  // bioAgeDelta = 0: Sleep quality has neutral effect on aging
  // bioAgeDelta < 0: Sleep quality slows biological aging (younger)
  //
  // USAGE:
  // biologicalAge = chronologicalAge + bioAgeDelta
  // Example: 25 years old + 2 bioAgeDelta = 27 biological age (2 years older)
}

