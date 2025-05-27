import { z } from "zod"

// =====================================================
// SLEEP DATA TYPES AND VALIDATION
// =====================================================

export const SleepDataSchema = z.object({
  user_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  total_sleep_hours: z.number().min(0).max(24),
  sleep_efficiency: z.number().min(0).max(100),
  rem_percentage: z.number().min(0).max(100),
  deep_sleep_percentage: z.number().min(0).max(100),
  light_sleep_percentage: z.number().min(0).max(100),
  awake_percentage: z.number().min(0).max(100),
  sleep_onset_minutes: z.number().min(0).optional(),
  times_awakened: z.number().min(0).optional(),
  shield_score: z.number().min(0).max(100).optional(),
  notes: z.string().optional()
})

export type SleepData = z.infer<typeof SleepDataSchema>

export interface SleepDataResponse {
  success: boolean
  operation: 'create' | 'update'
  data: SleepData & {
    id: string
    created_at: string
    updated_at?: string
  }
  message: string
}

export interface SleepMetrics {
  chronologicalAge: number
  biologicalAge: number
  bioAgeDelta: number
  avgShieldScore: number
  avgSleepEfficiency: number
  avgRemPercentage: number
  avgSleepHours: number
  sleepDataCount: number
  dailyShieldScores: Array<{
    date: string
    score: number
    day: string
  }>
  bioAgeBreakdown?: {
    breakdown: {
      sleepQualityPercentage: number
      efficiencyScore: number
      remScore: number
      durationScore: number
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
  } | null
}

// =====================================================
// SLEEP DATA SERVICE CLASS
// =====================================================

export class SleepDataService {
  private baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  /**
   * Upsert sleep data for a specific user and date
   * Creates new record if none exists, updates existing record if found
   */
  async upsertSleepData(sleepData: SleepData): Promise<SleepDataResponse> {
    try {
      // Validate input data
      const validatedData = SleepDataSchema.parse(sleepData)

      // Validate that sleep percentages add up to approximately 100%
      const totalPercentage = 
        validatedData.rem_percentage + 
        validatedData.deep_sleep_percentage + 
        validatedData.light_sleep_percentage + 
        validatedData.awake_percentage

      if (Math.abs(totalPercentage - 100) > 5) {
        throw new Error(`Sleep percentages must add up to 100% (current total: ${totalPercentage.toFixed(1)}%)`)
      }

      const response = await fetch(`${this.baseUrl}/sleep-data/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result: SleepDataResponse = await response.json()
      return result

    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Get sleep metrics for a specific user
   */
  async getUserMetrics(userId: string): Promise<{ metrics: SleepMetrics }> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      return await response.json()

    } catch (error) {
      throw error
    }
  }

  /**
   * Get sleep data for a specific user and date range
   */
  async getSleepData(
    userId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<SleepData[]> {
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const response = await fetch(
        `${this.baseUrl}/users/${userId}/sleep-data?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data || []

    } catch (error) {
      throw error
    }
  }

  /**
   * Calculate SHIELD score based on sleep metrics
   * This is a client-side calculation for immediate feedback
   */
  calculateShieldScore(sleepData: Partial<SleepData>): number {
    const {
      sleep_efficiency = 0,
      rem_percentage = 0,
      deep_sleep_percentage = 0,
      total_sleep_hours = 0,
      times_awakened = 0
    } = sleepData

    let score = 0
    let maxScore = 0

    // Sleep Efficiency (30% weight)
    const efficiencyWeight = 30
    if (sleep_efficiency >= 90) score += efficiencyWeight
    else if (sleep_efficiency >= 85) score += efficiencyWeight * 0.9
    else if (sleep_efficiency >= 80) score += efficiencyWeight * 0.8
    else if (sleep_efficiency >= 75) score += efficiencyWeight * 0.6
    else if (sleep_efficiency >= 70) score += efficiencyWeight * 0.4
    else score += efficiencyWeight * 0.2
    maxScore += efficiencyWeight

    // REM Sleep (25% weight)
    const remWeight = 25
    if (rem_percentage >= 20 && rem_percentage <= 25) score += remWeight
    else if (rem_percentage >= 18 && rem_percentage <= 27) score += remWeight * 0.9
    else if (rem_percentage >= 15 && rem_percentage <= 30) score += remWeight * 0.7
    else if (rem_percentage >= 12 && rem_percentage <= 32) score += remWeight * 0.5
    else score += remWeight * 0.3
    maxScore += remWeight

    // Deep Sleep (25% weight)
    const deepWeight = 25
    if (deep_sleep_percentage >= 15 && deep_sleep_percentage <= 20) score += deepWeight
    else if (deep_sleep_percentage >= 12 && deep_sleep_percentage <= 23) score += deepWeight * 0.9
    else if (deep_sleep_percentage >= 10 && deep_sleep_percentage <= 25) score += deepWeight * 0.7
    else if (deep_sleep_percentage >= 8 && deep_sleep_percentage <= 28) score += deepWeight * 0.5
    else score += deepWeight * 0.3
    maxScore += deepWeight

    // Sleep Duration (20% weight)
    const durationWeight = 20
    if (total_sleep_hours >= 7.5 && total_sleep_hours <= 8.5) score += durationWeight
    else if (total_sleep_hours >= 7 && total_sleep_hours <= 9) score += durationWeight * 0.9
    else if (total_sleep_hours >= 6.5 && total_sleep_hours <= 9.5) score += durationWeight * 0.7
    else if (total_sleep_hours >= 6 && total_sleep_hours <= 10) score += durationWeight * 0.5
    else score += durationWeight * 0.3
    maxScore += durationWeight

    // Bonus/Penalty for awakenings
    if (times_awakened !== undefined) {
      if (times_awakened <= 1) score += 5 // Bonus for minimal awakenings
      else if (times_awakened >= 4) score -= 5 // Penalty for frequent awakenings
    }

    return Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)))
  }

  /**
   * Validate sleep data before submission
   */
  validateSleepData(sleepData: Partial<SleepData>): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      SleepDataSchema.parse(sleepData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => e.message))
      }
    }

    // Additional business logic validation
    if (sleepData.rem_percentage !== undefined && sleepData.deep_sleep_percentage !== undefined && 
        sleepData.light_sleep_percentage !== undefined && sleepData.awake_percentage !== undefined) {
      
      const total = sleepData.rem_percentage + sleepData.deep_sleep_percentage + 
                   sleepData.light_sleep_percentage + sleepData.awake_percentage
      
      if (Math.abs(total - 100) > 5) {
        errors.push(`Sleep percentages must add up to 100% (current: ${total.toFixed(1)}%)`)
      } else if (Math.abs(total - 100) > 1) {
        warnings.push(`Sleep percentages should add up to exactly 100% (current: ${total.toFixed(1)}%)`)
      }
    }

    // Warnings for unusual values
    if (sleepData.sleep_efficiency !== undefined && sleepData.sleep_efficiency > 95) {
      warnings.push('Sleep efficiency over 95% is unusually high')
    }

    if (sleepData.total_sleep_hours !== undefined && sleepData.total_sleep_hours > 12) {
      warnings.push('Sleep duration over 12 hours may indicate a health issue')
    }

    if (sleepData.rem_percentage !== undefined && sleepData.rem_percentage > 30) {
      warnings.push('REM percentage over 30% is unusually high')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const sleepDataService = new SleepDataService()

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Format date for API consumption
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Parse date from API response
 */
export function parseDateFromAPI(dateString: string): Date {
  return new Date(dateString + 'T00:00:00.000Z')
}

/**
 * Get date range for the last N days
 */
export function getLastNDaysRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (days - 1))
  
  return {
    startDate: formatDateForAPI(startDate),
    endDate: formatDateForAPI(endDate)
  }
} 