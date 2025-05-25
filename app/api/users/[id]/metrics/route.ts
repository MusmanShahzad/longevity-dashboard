import { type NextRequest, NextResponse } from "next/server"
import { supabase, calculateAge } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const id = params.id;
    // Get user data
    const { data: user, error: userError } = await supabase.from("users").select("*").eq("id", id).single()

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 })
    }

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoString = sevenDaysAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    // Get sleep data for the last 7 days only, ordered by date and created_at
    const { data: allSleepData, error: sleepError } = await supabase
      .from("sleep_data")
      .select("*")
      .eq("user_id", id)
      .gte("date", sevenDaysAgoString)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })

    if (sleepError) {
      return NextResponse.json({ error: sleepError.message }, { status: 400 })
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

    // Calculate metrics
    const chronologicalAge = user.date_of_birth ? calculateAge(user.date_of_birth) : 0

    let avgShieldScore = 0
    let bioAgeDelta = 0
    let avgSleepEfficiency = 0
    let avgRemPercentage = 0
    let avgSleepHours = 0
    let dailyShieldScores: Array<{ date: string; score: number; day: string }> = []

    if (sleepData && sleepData.length > 0) {
      // Calculate averages
      avgSleepEfficiency = sleepData.reduce((sum: number, data: any) => sum + (data.sleep_efficiency || 0), 0) / sleepData.length
      avgRemPercentage = sleepData.reduce((sum: number, data: any) => sum + (data.rem_percentage || 0), 0) / sleepData.length
      avgSleepHours = sleepData.reduce((sum: number, data: any) => sum + (data.total_sleep_hours || 0), 0) / sleepData.length

      // Calculate average SHIELD score from stored daily scores
      const validShieldScores = sleepData.filter(
        (data: any) => data.shield_score !== null && data.shield_score !== undefined,
      )
      if (validShieldScores.length > 0) {
        avgShieldScore = validShieldScores.reduce((sum: number, data: any) => sum + data.shield_score, 0) / validShieldScores.length
      }

      // Prepare daily SHIELD scores for all unique dates (already filtered to last 7 days)
      dailyShieldScores = sleepData
        .slice() // Create a copy to avoid mutating the original array
        .reverse() // Show oldest to newest
        .map((data: any) => ({
          date: data.date,
          score: data.shield_score || 0,
          day: new Date(data.date).toLocaleDateString("en-US", { weekday: "short" }),
        }))

      // Calculate bio-age delta
      bioAgeDelta = calculateBioAgeDelta(chronologicalAge, avgSleepEfficiency, avgRemPercentage, avgSleepHours)
    }

    return NextResponse.json({
      metrics: {
        chronologicalAge,
        biologicalAge: chronologicalAge - bioAgeDelta,
        bioAgeDelta,
        avgShieldScore: Math.round(avgShieldScore),
        avgSleepEfficiency,
        avgRemPercentage,
        avgSleepHours,
        sleepDataCount: sleepData?.length || 0,
        dailyShieldScores,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Bio-age delta calculation (keeping existing logic)
function calculateBioAgeDelta(
  chronologicalAge: number,
  sleepEfficiency: number,
  remPercentage: number,
  avgSleepHours: number,
): number {
  let bioAgeModifier = 0

  // Sleep efficiency impact
  if (sleepEfficiency >= 90) bioAgeModifier -= 2
  else if (sleepEfficiency >= 85) bioAgeModifier -= 1
  else if (sleepEfficiency < 75) bioAgeModifier += 2
  else if (sleepEfficiency < 80) bioAgeModifier += 1

  // REM sleep impact
  if (remPercentage >= 20 && remPercentage <= 25) bioAgeModifier -= 1
  else if (remPercentage < 15) bioAgeModifier += 2
  else if (remPercentage > 30) bioAgeModifier += 1

  // Sleep duration impact
  if (avgSleepHours >= 7 && avgSleepHours <= 9) bioAgeModifier -= 1
  else if (avgSleepHours < 6) bioAgeModifier += 3
  else if (avgSleepHours > 10) bioAgeModifier += 1

  const biologicalAge = chronologicalAge + bioAgeModifier
  return chronologicalAge - biologicalAge
}
