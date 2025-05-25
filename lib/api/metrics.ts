// API functions for metrics
export interface Metrics {
  chronologicalAge: number
  biologicalAge: number
  bioAgeDelta: number
  avgShieldScore: number
  avgSleepEfficiency: number
  avgRemPercentage: number
  avgSleepHours: number
  sleepDataCount: number
  dailyShieldScores: Array<{ date: string; score: number; day: string }>
}

export const fetchUserMetrics = async (userId: string): Promise<Metrics> => {
  const response = await fetch(`/api/users/${userId}/metrics`)
  if (!response.ok) {
    throw new Error(`Failed to fetch metrics: ${response.statusText}`)
  }
  const data = await response.json()
  return data.metrics
}