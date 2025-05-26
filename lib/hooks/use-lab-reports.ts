import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query'

export interface LabReport {
  id: string
  user_id: string
  name: string
  file_url: string
  status: 'processing' | 'processed' | 'error'
  uploaded_at: string
  processed_at?: string
  biomarkers?: any[]
  health_insights?: string[]
  extraction_confidence?: number
}

export interface LabReportsResponse {
  labReports: LabReport[]
}

// Fetch lab reports for a user
export async function fetchLabReports(userId: string): Promise<LabReportsResponse> {
  const response = await fetch(`/api/lab-reports?user_id=${userId}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch lab reports')
  }
  
  return response.json()
}

// Upload lab report
export async function uploadLabReport(formData: FormData): Promise<{ labReport: LabReport; message: string }> {
  const response = await fetch('/api/lab-reports', {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to upload lab report')
  }
  
  return response.json()
}

// React Query hook to fetch lab reports
export function useLabReports(userId: string): UseQueryResult<LabReportsResponse, Error> {
  return useQuery({
    queryKey: ['labReports', userId],
    queryFn: () => fetchLabReports(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes - lab reports don't change frequently
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

// React Query hook to upload lab reports
export function useUploadLabReport() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: uploadLabReport,
    onSuccess: (data, variables) => {
      // Extract userId from FormData
      const userId = variables.get('user_id') as string
      
      // Invalidate and refetch lab reports for this user
      queryClient.invalidateQueries({ queryKey: ['labReports', userId] })
      
      // Also invalidate biomarkers since new lab report might affect biomarker data
      queryClient.invalidateQueries({ queryKey: ['biomarkers', userId] })
    },
    onError: (error) => {
      console.error('Failed to upload lab report:', error)
    },
  })
}

// Hook with additional utilities
export function useLabReportsWithUpload(userId: string) {
  const labReportsQuery = useLabReports(userId)
  const uploadMutation = useUploadLabReport()
  
  const uploadLabReport = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', userId)
    
    return uploadMutation.mutateAsync(formData)
  }
  
  return {
    ...labReportsQuery,
    uploadLabReport,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
    uploadSuccess: uploadMutation.isSuccess,
  }
}

// Note: Update and delete mutations can be added here if needed in the future 