import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSleepData, createSleepData, type SleepData, type SleepDataInput } from '@/lib/api/sleep-data'

export const useSleepData = (userId: string) => {
  return useQuery({
    queryKey: ['sleepData', userId],
    queryFn: () => fetchSleepData(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  })
}

export const useCreateSleepData = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createSleepData,
    onSuccess: (data, variables) => {
      // Invalidate and refetch sleep data for this user
      queryClient.invalidateQueries({ queryKey: ['sleepData', variables.user_id] })
      // Also invalidate metrics as they depend on sleep data
      queryClient.invalidateQueries({ queryKey: ['metrics', variables.user_id] })
      // Invalidate health alerts as they may change
      queryClient.invalidateQueries({ queryKey: ['healthAlerts', variables.user_id] })
    },
    onError: (error) => {
      console.error('Failed to create sleep data:', error)
    },
  })
} 