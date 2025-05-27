import { useQuery, UseQueryResult } from '@tanstack/react-query'

export interface HealthAlert {
  id: string
  user_id: string
  type: 'warning' | 'info' | 'success'
  title: string
  description: string
  suggestion: string
  created_at: string
  sleep_date?: string
}

export interface HealthAlertsResponse {
  alerts: HealthAlert[]
}

export async function fetchHealthAlerts(userId: string): Promise<HealthAlertsResponse> {
  if (!userId) {
    throw new Error('User ID is required')
  }

  const response = await fetch(`/api/health-alerts?user_id=${userId}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }))
    throw new Error(error.error || 'Failed to fetch health alerts')
  }
  
  const data = await response.json()
  console.log('📥 Health alerts API response:', data)
  
  // Handle both old and new response formats
  if (data.success && data.data) {
    // New format: { success: true, data: { alerts: [...] } }
    return data.data
  } else if (data.alerts) {
    // Old format: { alerts: [...] }
    return data
  } else {
    // Fallback
    console.warn('Unexpected health alerts response format:', data)
    return { alerts: [] }
  }
}

export function useHealthAlerts(userId: string): UseQueryResult<HealthAlertsResponse, Error> {
  return useQuery({
    queryKey: ['healthAlerts', userId],
    queryFn: () => fetchHealthAlerts(userId),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes - health alerts don't change very frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error.message.includes('400') || error.message.includes('404') || error.message.includes('User ID is required')) {
        return false
      }
      return failureCount < 2 // Reduce retry attempts to prevent multiple calls
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false, // Prevent refetch on window focus to reduce API calls
    refetchOnMount: false, // Prevent refetch on mount if data exists
  })
} 