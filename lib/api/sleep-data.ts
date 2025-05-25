// API functions for sleep data
export interface SleepData {
  id: string
  user_id: string
  date: string
  total_sleep_hours: number
  time_in_bed?: number
  sleep_efficiency: number
  rem_percentage: number
  deep_sleep_percentage: number
  light_sleep_percentage: number
  awake_percentage: number
  sleep_onset_time?: number
  wake_up_time?: number
  shield_score: number
  created_at: string
  updated_at: string
}

export interface SleepDataInput {
  user_id: string
  date: string
  total_sleep_hours: number
  time_in_bed: number
  rem_percentage?: number
}

export interface SleepDataResponse {
  sleepData: SleepData
  suggestions: any[]
  message: string
  isUpdate: boolean
}

export const fetchSleepData = async (userId: string): Promise<SleepData[]> => {
  const response = await fetch(`/api/sleep-data?user_id=${userId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch sleep data: ${response.statusText}`)
  }
  const data = await response.json()
  return data.sleepData
}

export const createSleepData = async (sleepData: SleepDataInput): Promise<SleepDataResponse> => {
  const response = await fetch('/api/sleep-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sleepData),
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || `Failed to create sleep data: ${response.statusText}`)
  }
  
  return response.json()
} 