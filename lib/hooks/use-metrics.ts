import { useQuery } from '@tanstack/react-query'
import { fetchUserMetrics, type Metrics } from '@/lib/api/metrics'

export const useMetrics = (userId: string) => {
  return useQuery({
    queryKey: ['metrics', userId],
    queryFn: () => fetchUserMetrics(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
} 