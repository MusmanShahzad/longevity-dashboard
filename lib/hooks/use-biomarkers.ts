// React Query hook for biomarker data
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { fetchBiomarkers, type BiomarkerResponse } from '@/lib/api/biomarkers'

export function useBiomarkers(userId: string): UseQueryResult<BiomarkerResponse, Error> {
  return useQuery({
    queryKey: ['biomarkers', userId],
    queryFn: () => fetchBiomarkers(userId),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes - biomarker data doesn't change frequently
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

// Hook for real-time biomarker updates (when new lab reports are processed)
export function useBiomarkersWithRefresh(userId: string) {
  const query = useBiomarkers(userId)
  
  // Function to manually refresh biomarker data
  const refreshBiomarkers = () => {
    query.refetch()
  }
  
  return {
    ...query,
    refreshBiomarkers
  }
} 