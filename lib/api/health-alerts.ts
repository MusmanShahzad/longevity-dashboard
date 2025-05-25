// API functions for health alerts
export interface HealthAlert {
  id: string
  user_id: string
  type: 'warning' | 'info' | 'success'
  title: string
  description: string
  suggestion: string
  sleep_date?: string
  created_at: string
  updated_at: string
}

export const fetchHealthAlerts = async (userId: string): Promise<HealthAlert[]> => {
  const response = await fetch(`/api/health-alerts?user_id=${userId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch health alerts: ${response.statusText}`)
  }
  const data = await response.json()
  return data.alerts || []
} 