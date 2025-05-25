import type { LabReport } from '@/lib/supabase'

// API Response types
interface LabReportsResponse {
  labReports: LabReport[]
}

interface LabReportResponse {
  labReport: LabReport
  message: string
}

// Lab Reports API functions
export const labReportsApi = {
  // Get all lab reports for a user
  getByUserId: async (userId: string): Promise<LabReportsResponse> => {
    const response = await fetch(`/api/lab-reports?user_id=${userId}`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch lab reports' }))
      throw new Error(error.error || 'Failed to fetch lab reports')
    }
    return response.json()
  },

  // Upload new lab report
  upload: async (file: File, userId: string): Promise<LabReportResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', userId)

    const response = await fetch('/api/lab-reports', {
      method: 'POST',
      body: formData, // Don't set Content-Type header for FormData
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to upload lab report' }))
      throw new Error(error.error || 'Failed to upload lab report')
    }
    return response.json()
  },

  // Update lab report status
  updateStatus: async (reportId: string, status: string): Promise<{ labReport: LabReport }> => {
    const response = await fetch(`/api/lab-reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update lab report' }))
      throw new Error(error.error || 'Failed to update lab report')
    }
    return response.json()
  },

  // Delete lab report
  delete: async (reportId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`/api/lab-reports/${reportId}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete lab report' }))
      throw new Error(error.error || 'Failed to delete lab report')
    }
    return response.json()
  },
} 