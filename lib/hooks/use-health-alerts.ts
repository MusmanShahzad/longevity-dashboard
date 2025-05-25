import { useQuery } from '@tanstack/react-query'
import { fetchHealthAlerts, type HealthAlert } from '@/lib/api/health-alerts'

export const useHealthAlerts = (userId: string) => {
  return useQuery({
    queryKey: ['healthAlerts', userId],
    queryFn: () => fetchHealthAlerts(userId),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
  })
} 