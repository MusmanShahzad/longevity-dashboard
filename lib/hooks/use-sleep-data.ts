import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query'

export interface SleepData {
  id: string
  user_id: string
  date: string
  total_sleep_hours: number
  time_in_bed: number
  rem_percentage: number
  shield_score: number
  created_at: string
  updated_at: string
}

export interface SleepDataResponse {
  sleepData: SleepData[]
}

export interface CreateSleepDataRequest {
  user_id: string
  date: string
  total_sleep_hours: number
  time_in_bed: number
  rem_percentage: number
}

export interface CreateSleepDataResponse {
  sleepData: SleepData
  suggestions: Array<{
    type: 'warning' | 'info' | 'success'
    title: string
    description: string
    suggestion: string
  }>
  message: string
}

// Fetch sleep data for a user
export async function fetchSleepData(userId: string): Promise<SleepDataResponse> {
  const response = await fetch(`/api/sleep-data?user_id=${userId}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch sleep data')
  }
  
  return response.json()
}

// Create sleep data
export async function createSleepData(data: CreateSleepDataRequest): Promise<CreateSleepDataResponse> {
  const response = await fetch('/api/sleep-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to save sleep data')
  }
  
  return response.json()
}

// React Query hook to fetch sleep data
export function useSleepData(userId: string): UseQueryResult<SleepDataResponse, Error> {
  return useQuery({
    queryKey: ['sleepData', userId],
    queryFn: () => fetchSleepData(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes - sleep data can change frequently
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

// React Query hook to create sleep data
export function useCreateSleepData() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createSleepData,
    onSuccess: (data, variables) => {
      // Invalidate and refetch sleep data for this user
      queryClient.invalidateQueries({ queryKey: ['sleepData', variables.user_id] })
      
      // Also invalidate metrics and health alerts since new sleep data affects them
      queryClient.invalidateQueries({ queryKey: ['metrics', variables.user_id] })
      queryClient.invalidateQueries({ queryKey: ['healthAlerts', variables.user_id] })
    },
    onError: (error) => {
      console.error('Failed to create sleep data:', error)
    },
  })
}

// Hook with additional utilities
export function useSleepDataWithMutation(userId: string) {
  const sleepDataQuery = useSleepData(userId)
  const createMutation = useCreateSleepData()
  
  const createSleepDataEntry = async (data: Omit<CreateSleepDataRequest, 'user_id'>) => {
    return createMutation.mutateAsync({
      ...data,
      user_id: userId,
    })
  }
  
  // Helper to find existing data for a specific date
  const findDataForDate = (date: string) => {
    return sleepDataQuery.data?.sleepData.find(record => record.date === date)
  }
  
  return {
    ...sleepDataQuery,
    createSleepDataEntry,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    createSuccess: createMutation.isSuccess,
    findDataForDate,
  }
} 