import { type NextRequest, NextResponse } from "next/server"
import { supabase, calculateAge } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, date, total_sleep_hours, time_in_bed, rem_percentage } = body

    // Validate required fields
    if (!user_id || !date || total_sleep_hours === undefined || time_in_bed === undefined) {
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
      return NextResponse.json({ error: "Failed to get user data" }, { status: 400 })
    }

    // Calculate sleep efficiency
    const sleep_efficiency = time_in_bed > 0 ? (total_sleep_hours / time_in_bed) * 100 : 0

    // Calculate other sleep stages (simplified calculation)
    const deep_sleep_percentage = Math.max(0, 25 - (rem_percentage || 0) * 0.3)
    const light_sleep_percentage = Math.max(
      0,
      100 - (rem_percentage || 0) - deep_sleep_percentage - (100 - sleep_efficiency),
    )
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
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

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
    console.error("Sleep data API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
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
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Filter to get only the latest record per unique date
    const uniqueDateRecords = new Map<string, any>();
    
    if (allSleepData) {
      allSleepData.forEach((record: any) => {
        const dateKey = record.date;
        const currentRecordTime = new Date(record.created_at).getTime();
        
        // If we haven't seen this date before, or if this record is newer than the stored one
        if (!uniqueDateRecords.has(dateKey)) {
          uniqueDateRecords.set(dateKey, record);
        } else {
          const existingRecordTime = new Date(uniqueDateRecords.get(dateKey)!.created_at).getTime();
          if (currentRecordTime > existingRecordTime) {
            uniqueDateRecords.set(dateKey, record);
          }
        }
      });
    }

    // Convert Map to array and sort by date (most recent first)
    const sleepData = Array.from(uniqueDateRecords.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ sleepData })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// SHIELD Score calculation function based on your specific rules
function calculateShieldScore(
  totalSleepHours: number,
  sleepEfficiency: number,
  remPercentage: number,
  userAge: number,
): number {
  // Start with base score of 100
  let score = 100

  // Rule 1: IF total_sleep_hours < 6 THEN deduct 10 points
  if (totalSleepHours < 6) {
    score -= 10
  }

  // Rule 2: IF sleep_efficiency < 85 THEN deduct 5 points
  if (sleepEfficiency < 85) {
    score -= 5
  }

  // Rule 3: IF REM < 15% THEN deduct 5 points
  if (remPercentage < 15) {
    score -= 5
  }

  // Rule 4: IF age > 50 AND sleep_hours < 6 THEN deduct 5 more points
  if (userAge > 50 && totalSleepHours < 6) {
    score -= 5
  }

  // Ensure score doesn't go below 0
  return Math.max(0, score)
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
