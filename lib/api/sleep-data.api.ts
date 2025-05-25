import type { SleepData } from '@/lib/supabase'

// API Response types
interface SleepDataResponse {
  sleepData: SleepData[]
}

interface SleepDataCreateResponse {
  sleepData: SleepData
  message: string
  suggestions?: Array<{
    type: string
    title: string
    description: string
    suggestion: string
  }>
}

interface SleepDataCreateRequest {
  user_id: string
  date: string
  total_sleep_hours: number
  time_in_bed: number
  rem_percentage: number
}

// Sleep Data API functions
export const sleepDataApi = {
  // Get all sleep data for a user
  getByUserId: async (userId: string): Promise<SleepDataResponse> => {
    const response = await fetch(`/api/sleep-data?user_id=${userId}`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch sleep data' }))
      throw new Error(error.error || 'Failed to fetch sleep data')
    }
    return response.json()
  },

  // Create new sleep data entry
  create: async (sleepData: SleepDataCreateRequest): Promise<SleepDataCreateResponse> => {
    const response = await fetch('/api/sleep-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sleepData),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create sleep data' }))
      throw new Error(error.error || 'Failed to create sleep data')
    }
    return response.json()
  },

  // Update sleep data entry
  update: async (id: string, sleepData: Partial<SleepDataCreateRequest>): Promise<{ sleepData: SleepData }> => {
    const response = await fetch(`/api/sleep-data/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sleepData),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update sleep data' }))
      throw new Error(error.error || 'Failed to update sleep data')
    }
    return response.json()
  },

  // Delete sleep data entry
  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await fetch(`/api/sleep-data/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete sleep data' }))
      throw new Error(error.error || 'Failed to delete sleep data')
    }
    return response.json()
  },
} 