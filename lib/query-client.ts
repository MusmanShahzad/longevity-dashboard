import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.includes('4')) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
})

// Query keys factory for consistent key management
export const queryKeys = {
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', id] as const,
    metrics: (id: string) => ['users', id, 'metrics'] as const,
  },
  sleepData: {
    all: (userId: string) => ['sleep-data', userId] as const,
    byDate: (userId: string, date: string) => ['sleep-data', userId, date] as const,
  },
  healthAlerts: {
    all: (userId: string) => ['health-alerts', userId] as const,
  },
  labReports: {
    all: (userId: string) => ['lab-reports', userId] as const,
  },
} as const 