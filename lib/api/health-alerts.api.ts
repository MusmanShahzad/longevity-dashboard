import type { HealthAlert } from '@/lib/supabase'

// API Response types
interface HealthAlertsResponse {
  alerts: HealthAlert[]
}

// Health Alerts API functions
export const healthAlertsApi = {
  // Get all health alerts for a user
  getByUserId: async (userId: string): Promise<HealthAlertsResponse> => {
    const response = await fetch(`/api/health-alerts?user_id=${userId}`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch health alerts' }))
      throw new Error(error.error || 'Failed to fetch health alerts')
    }
    return response.json()
  },

  // Mark alert as read
  markAsRead: async (alertId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`/api/health-alerts/${alertId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_read: true }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to mark alert as read' }))
      throw new Error(error.error || 'Failed to mark alert as read')
    }
    return response.json()
  },

  // Delete health alert
  delete: async (alertId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`/api/health-alerts/${alertId}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete health alert' }))
      throw new Error(error.error || 'Failed to delete health alert')
    }
    return response.json()
  },
} 