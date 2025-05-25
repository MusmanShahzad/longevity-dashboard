import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { labReportsApi } from '@/lib/api/lab-reports.api'
import { queryKeys } from '@/lib/query-client'

// Get lab reports for a user
export const useLabReports = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.labReports.all(userId),
    queryFn: () => labReportsApi.getByUserId(userId),
    select: (data) => data.labReports,
    enabled: !!userId,
  })
}

// Upload lab report mutation
export const useUploadLabReport = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, userId }: { file: File; userId: string }) =>
      labReportsApi.upload(file, userId),
    onSuccess: (data, variables) => {
      // Invalidate lab reports for this user
      queryClient.invalidateQueries({ queryKey: queryKeys.labReports.all(variables.userId) })
    },
  })
}

// Update lab report status mutation
export const useUpdateLabReportStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: string }) =>
      labReportsApi.updateStatus(reportId, status),
    onSuccess: (data, variables) => {
      // Update the specific report in all relevant queries
      queryClient.setQueriesData(
        { queryKey: ['lab-reports'] },
        (oldData: any) => {
          if (!oldData?.labReports) return oldData
          
          return {
            ...oldData,
            labReports: oldData.labReports.map((report: any) =>
              report.id === variables.reportId ? data.labReport : report
            ),
          }
        }
      )
    },
  })
}

// Delete lab report mutation
export const useDeleteLabReport = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: labReportsApi.delete,
    onSuccess: (_, reportId) => {
      // Remove the report from all relevant queries
      queryClient.setQueriesData(
        { queryKey: ['lab-reports'] },
        (oldData: any) => {
          if (!oldData?.labReports) return oldData
          
          return {
            ...oldData,
            labReports: oldData.labReports.filter((report: any) => report.id !== reportId),
          }
        }
      )
    },
  })
} 