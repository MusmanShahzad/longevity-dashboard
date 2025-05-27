import { type NextRequest, NextResponse } from "next/server"
import { supabase, calculateAge } from "@/lib/supabase"
import { withAPISecurity, commonSchemas, type SecurityContext } from "@/lib/api-security"
import { HIPAAAuditLogger } from "@/lib/hipaa-compliance"

async function secureSleepDataHandler(
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { user_id, date, total_sleep_hours, time_in_bed, rem_percentage } = body

    // Set user context for audit logging
    context.userId = user_id

    // Validate required fields
    if (!user_id || !date || total_sleep_hours === undefined || time_in_bed === undefined) {
      console.warn('Sleep data validation failed:', { user_id, date, missing_fields: 'user_id, date, total_sleep_hours, or time_in_bed' })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate data ranges
    if (total_sleep_hours < 0 || total_sleep_hours > 24) {
      return NextResponse.json({ error: "Sleep hours must be between 0 and 24" }, { status: 400 })
    }

    if (time_in_bed < 0 || time_in_bed > 24) {
      return NextResponse.json({ error: "Time in bed must be between 0 and 24" }, { status: 400 })
    }

    if (total_sleep_hours > time_in_bed) {
      return NextResponse.json({ error: "Sleep hours cannot exceed time in bed" }, { status: 400 })
    }

    // Get user data for age calculation
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("date_of_birth")
      .eq("id", user_id)
      .single()

    if (userError) {
      console.error('Failed to get user data:', { user_id, error: userError.message })
      return NextResponse.json({ error: "Failed to get user data" }, { status: 400 })
    }

    // ===== SLEEP EFFICIENCY CALCULATION =====
    // Sleep Efficiency = (Total Sleep Hours / Time in Bed) × 100
    // This measures how efficiently you sleep while in bed
    // Normal range: 85-95% (anything below 85% indicates sleep fragmentation)
    // Example: 7 hours sleep / 8 hours in bed = 87.5% efficiency
    const sleep_efficiency = time_in_bed > 0 ? (total_sleep_hours / time_in_bed) * 100 : 0

    // ===== SLEEP STAGE CALCULATIONS (Simplified Estimation) =====
    
    // DEEP SLEEP PERCENTAGE CALCULATION:
    // Formula: Deep Sleep = max(0, 25% - (REM% × 0.3))
    // Logic: Normal deep sleep is ~20-25% of total sleep
    // As REM increases, deep sleep typically decreases (inverse relationship)
    // The 0.3 factor represents this trade-off between REM and deep sleep
    // Example: If REM = 20%, then Deep = max(0, 25 - (20 × 0.3)) = max(0, 25 - 6) = 19%
    const deep_sleep_percentage = Math.max(0, 25 - (rem_percentage || 0) * 0.3)
    
    // LIGHT SLEEP PERCENTAGE CALCULATION:
    // Formula: Light Sleep = max(0, 100% - REM% - Deep% - Awake%)
    // Where Awake% = (100% - Sleep Efficiency%)
    // Logic: Light sleep fills the remaining sleep time after accounting for:
    //   - REM sleep (provided by user)
    //   - Deep sleep (calculated above)
    //   - Time awake in bed (derived from sleep efficiency)
    // Example: 100% - 20% REM - 19% Deep - 12.5% Awake = 48.5% Light Sleep
    const light_sleep_percentage = Math.max(
      0,
      100 - (rem_percentage || 0) - deep_sleep_percentage - (100 - sleep_efficiency),
    )
    
    // AWAKE PERCENTAGE CALCULATION:
    // Formula: Awake% = max(0, 100% - Sleep Efficiency%)
    // Logic: If sleep efficiency is 87.5%, then 12.5% of time in bed was spent awake
    // This includes time falling asleep, brief awakenings, and time before getting up
    const awake_percentage = Math.max(0, 100 - sleep_efficiency)

    // Calculate SHIELD score based on your specific rules
    const userAge = userData.date_of_birth ? calculateAge(userData.date_of_birth) : 0
    const shield_score = calculateShieldScore(total_sleep_hours, sleep_efficiency, rem_percentage || 0, userAge)

    // Check if record already exists
    const { data: existingData } = await supabase
      .from("sleep_data")
      .select("id")
      .eq("user_id", user_id)
      .eq("date", date)
      .single()

    const isUpdate = !!existingData

    // Use upsert to handle duplicate dates
    const { data, error } = await supabase
      .from("sleep_data")
      .upsert(
        {
          user_id,
          date,
          total_sleep_hours,
          time_in_bed,
          sleep_efficiency,
          rem_percentage,
          deep_sleep_percentage,
          light_sleep_percentage,
          awake_percentage,
          shield_score, // Add SHIELD score to the data
        },
        {
          onConflict: "user_id,date",
        },
      )
      .select()
      .single()

    if (error) {
      console.error("Database error:", { user_id, date, error: error.message, operation: isUpdate ? 'update' : 'create' })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log successful sleep data creation/update
    console.log('Sleep data saved successfully:', {
      user_id,
      date,
      shield_score: data.shield_score,
      sleep_efficiency: data.sleep_efficiency,
      operation: isUpdate ? 'update' : 'create'
    })

    // Generate health alerts and get suggestions for this specific date
    const suggestions = await generateHealthAlerts(user_id, data, date)

    return NextResponse.json(
      {
        sleepData: data,
        suggestions: suggestions,
        message: isUpdate ? "Sleep data updated successfully" : "Sleep data saved successfully",
        isUpdate,
      },
      { status: isUpdate ? 200 : 201 },
    )
  } catch (error) {
    // Error logging is handled by the security wrapper
    throw error
  }
}

// Export the secured POST endpoint
export const POST = withAPISecurity(secureSleepDataHandler, {
  allowedMethods: ['POST'],
  validateInput: commonSchemas.sleepData,
  auditEventType: 'data_modification',
  riskLevel: 'medium'
})

async function secureSleepDataGetHandler(
  request: NextRequest,
  context: SecurityContext
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      console.warn('Sleep data access failed: Missing user ID')
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Set user context for audit logging
    context.userId = userId

    // ===== DATE RANGE CALCULATION =====
    // Calculate date 7 days ago for filtering recent sleep data
    // This limits the dataset to the most recent week for performance and relevance
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);  // Subtract 7 days from current date
    const sevenDaysAgoString = sevenDaysAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    // Get sleep data for the last 7 days only, ordered by date and created_at
    const { data: allSleepData, error } = await supabase
      .from("sleep_data")
      .select("*")
      .eq("user_id", userId)
      .gte("date", sevenDaysAgoString)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error('Failed to fetch sleep data:', { userId, error: error.message })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log successful sleep data access
    console.log('Sleep data accessed successfully:', {
      userId,
      recordCount: allSleepData?.length || 0,
      dateRange: { from: sevenDaysAgoString, to: new Date().toISOString().split('T')[0] }
    })

    // ===== DUPLICATE RECORD FILTERING =====
    // Handle multiple records for the same date by keeping only the most recent
    // This prevents data inconsistencies when users update sleep data for the same day
    const uniqueDateRecords = new Map<string, any>();
    
    if (allSleepData) {
      allSleepData.forEach((record: any) => {
        const dateKey = record.date;  // Use date as unique identifier
        const currentRecordTime = new Date(record.created_at).getTime();  // Convert to timestamp for comparison
        
        // LOGIC: Keep the most recently created record for each unique date
        // If we haven't seen this date before, or if this record is newer than the stored one
        if (!uniqueDateRecords.has(dateKey)) {
          uniqueDateRecords.set(dateKey, record);  // First record for this date
        } else {
          const existingRecordTime = new Date(uniqueDateRecords.get(dateKey)!.created_at).getTime();
          if (currentRecordTime > existingRecordTime) {
            uniqueDateRecords.set(dateKey, record);  // Replace with newer record
          }
        }
      });
    }

    // ===== FINAL DATA SORTING =====
    // Convert Map to array and sort by date (most recent first)
    // This ensures the frontend receives data in chronological order for charts/displays
    const sleepData = Array.from(uniqueDateRecords.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ sleepData })
  } catch (error) {
    // Error logging is handled by the security wrapper
    throw error
  }
}

// Export the secured GET endpoint
export const GET = withAPISecurity(secureSleepDataGetHandler, {
  allowedMethods: ['GET'],
  auditEventType: 'data_access',
  riskLevel: 'low'
})

// ===== SHIELD SCORE CALCULATION =====
// SHIELD Score is a comprehensive sleep quality metric (0-100 scale)
// Higher scores indicate better sleep quality across multiple dimensions
function calculateShieldScore(
  totalSleepHours: number,
  sleepEfficiency: number,
  remPercentage: number,
  userAge: number,
): number {
  // ===== BASE SCORE =====
  // Start with perfect score of 100 and deduct points for suboptimal metrics
  let score = 100

  // ===== RULE 1: SLEEP DURATION PENALTY =====
  // Deduct 10 points if total sleep < 6 hours
  // Rationale: Less than 6 hours is associated with significant health risks
  // including impaired cognitive function, weakened immunity, and increased mortality risk
  if (totalSleepHours < 6) {
    score -= 10  // Major penalty for severe sleep deprivation
  }

  // ===== RULE 2: SLEEP EFFICIENCY PENALTY =====
  // Deduct 5 points if sleep efficiency < 85%
  // Rationale: Low efficiency indicates fragmented sleep, frequent awakenings
  // Normal healthy adults should achieve 85-95% efficiency
  if (sleepEfficiency < 85) {
    score -= 5   // Moderate penalty for poor sleep consolidation
  }

  // ===== RULE 3: REM SLEEP PENALTY =====
  // Deduct 5 points if REM sleep < 15%
  // Rationale: REM is crucial for memory consolidation, emotional regulation
  // Normal REM should be 15-25% of total sleep time
  if (remPercentage < 15) {
    score -= 5   // Moderate penalty for insufficient REM sleep
  }

  // ===== RULE 4: AGE-SPECIFIC PENALTY =====
  // Additional 5 point deduction for older adults (>50) with short sleep
  // Rationale: Older adults are more vulnerable to sleep deprivation effects
  // They have higher risk of cardiovascular disease, cognitive decline
  if (userAge > 50 && totalSleepHours < 6) {
    score -= 5   // Additional penalty for high-risk demographic
  }

  // ===== FINAL SCORE BOUNDS =====
  // Ensure score stays within valid range (0-100)
  // Minimum score of 0 represents severely compromised sleep
  return Math.max(0, score)
  
  // ===== SCORE INTERPRETATION =====
  // 95-100: Exceptional sleep quality
  // 85-94:  Good sleep quality  
  // 75-84:  Fair sleep quality
  // 65-74:  Poor sleep quality
  // <65:    Very poor sleep quality requiring intervention
}

async function generateHealthAlerts(userId: string, sleepData: any, sleepDate: string) {
  try {
    const suggestions = []

    // Check REM sleep
    if (sleepData.rem_percentage < 15) {
      suggestions.push({
        user_id: userId,
        type: "warning",
        title: "REM Sleep Below Optimal",
        description: `Your REM sleep percentage is ${sleepData.rem_percentage}%, which is below the recommended 15-25%.`,
        suggestion: "Consider reducing screen time 2 hours before bed and maintaining a consistent sleep schedule.",
        sleep_date: sleepDate,
      })
    } else if (sleepData.rem_percentage >= 20 && sleepData.rem_percentage <= 25) {
      suggestions.push({
        user_id: userId,
        type: "success",
        title: "Optimal REM Sleep",
        description: `Your REM sleep is ${sleepData.rem_percentage}%, which is in the optimal range!`,
        suggestion: "Great job! Keep maintaining your current sleep habits for optimal cognitive function.",
        sleep_date: sleepDate,
      })
    }

    // Check sleep efficiency
    if (sleepData.sleep_efficiency < 85) {
      suggestions.push({
        user_id: userId,
        type: "warning",
        title: "Low Sleep Efficiency",
        description: `Your sleep efficiency is ${sleepData.sleep_efficiency.toFixed(1)}%, which is below the recommended 85%.`,
        suggestion: "Try to limit time in bed to actual sleep time. Consider a consistent bedtime routine.",
        sleep_date: sleepDate,
      })
    } else if (sleepData.sleep_efficiency >= 90) {
      suggestions.push({
        user_id: userId,
        type: "success",
        title: "Excellent Sleep Efficiency",
        description: `Your sleep efficiency is ${sleepData.sleep_efficiency.toFixed(1)}%, which is excellent!`,
        suggestion: "Keep up your current sleep habits and consider sharing your routine with others.",
        sleep_date: sleepDate,
      })
    }

    // Check total sleep hours
    if (sleepData.total_sleep_hours < 6) {
      suggestions.push({
        user_id: userId,
        type: "warning",
        title: "Insufficient Sleep Duration",
        description: `You slept for ${sleepData.total_sleep_hours} hours, which is below the recommended 7-9 hours.`,
        suggestion: "Try to go to bed earlier and maintain a consistent sleep schedule to improve your sleep duration.",
        sleep_date: sleepDate,
      })
    } else if (sleepData.total_sleep_hours >= 7 && sleepData.total_sleep_hours <= 9) {
      suggestions.push({
        user_id: userId,
        type: "success",
        title: "Optimal Sleep Duration",
        description: `You slept for ${sleepData.total_sleep_hours} hours, which is within the optimal range!`,
        suggestion: "Great job maintaining healthy sleep duration. Keep up the good work!",
        sleep_date: sleepDate,
      })
    } else if (sleepData.total_sleep_hours > 10) {
      suggestions.push({
        user_id: userId,
        type: "info",
        title: "Extended Sleep Duration",
        description: `You slept for ${sleepData.total_sleep_hours} hours, which is longer than typical.`,
        suggestion:
          "While occasional long sleep is normal, consistently sleeping over 10 hours may indicate underlying issues.",
        sleep_date: sleepDate,
      })
    }

    // Add SHIELD score feedback
    if (sleepData.shield_score >= 95) {
      suggestions.push({
        user_id: userId,
        type: "success",
        title: "Exceptional SHIELD Score",
        description: `Your SHIELD score is ${sleepData.shield_score}/100 - exceptional sleep quality!`,
        suggestion: "Outstanding! Your sleep habits are exemplary. Consider mentoring others on good sleep hygiene.",
        sleep_date: sleepDate,
      })
    } else if (sleepData.shield_score < 80) {
      suggestions.push({
        user_id: userId,
        type: "warning",
        title: "SHIELD Score Needs Improvement",
        description: `Your SHIELD score is ${sleepData.shield_score}/100. There's room for improvement.`,
        suggestion: "Focus on increasing sleep duration, improving sleep efficiency, and optimizing REM sleep.",
        sleep_date: sleepDate,
      })
    }

    // Always delete existing alerts for this specific sleep date first to avoid duplicates
    const { error: deleteError } = await supabase
      .from("health_alerts")
      .delete()
      .eq("user_id", userId)
      .eq("sleep_date", sleepDate)

    if (deleteError) {
      console.error("Failed to delete existing alerts:", deleteError)
    }

    // Insert new alerts with sleep_date (only if we have suggestions)
    if (suggestions.length > 0) {
      const { error: insertError } = await supabase
        .from("health_alerts")
        .insert(suggestions)

      if (insertError) {
        console.error("Failed to insert new alerts:", insertError)
      }
    }

    return suggestions
  } catch (error) {
    console.error("Failed to generate health alerts:", error)
    return []
  }
}
