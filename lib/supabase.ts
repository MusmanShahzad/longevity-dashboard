import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface User {
  id: string
  full_name: string
  email?: string
  date_of_birth?: string
  sex?: string
  location?: string
  created_at: string
  updated_at: string
}

export interface SleepData {
  id: string
  user_id: string
  date: string
  total_sleep_hours?: number
  time_in_bed?: number
  sleep_efficiency?: number
  rem_percentage?: number
  deep_sleep_percentage?: number
  light_sleep_percentage?: number
  awake_percentage?: number
  // Enhanced metrics
  sleep_latency_minutes?: number
  hrv_overnight?: number
  chronotype?: 'morning' | 'evening' | 'intermediate'
  timing_consistency_hours?: number
  chronotype_alignment?: number
  shield_score?: number
  created_at: string
}

export interface HealthAlert {
  id: string
  user_id: string
  type: string
  title: string
  description?: string
  suggestion?: string
  sleep_date?: string // Add sleep_date field
  is_read: boolean
  created_at: string
}

export interface LabReport {
  id: string
  user_id: string
  name: string
  file_url?: string
  status: string
  uploaded_at: string
}

// Utility function to calculate age from date of birth
export function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

// Utility function to calculate biological age delta
export function calculateBioAgeDelta(
  chronologicalAge: number,
  sleepEfficiency: number,
  remPercentage: number,
  avgSleepHours: number,
): number {
  // Simplified bio-age calculation based on sleep metrics
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
  return chronologicalAge - biologicalAge // Positive means younger than chronological age
}
