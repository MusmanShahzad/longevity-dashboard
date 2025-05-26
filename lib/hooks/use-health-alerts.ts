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
  const response = await fetch(`/api/health-alerts?user_id=${userId}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch health alerts')
  }
  
  return response.json()
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
      if (error.message.includes('400') || error.message.includes('404')) {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
} 