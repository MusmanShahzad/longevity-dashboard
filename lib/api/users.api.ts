import type { User } from '@/lib/supabase'

// API Response types
interface ApiResponse<T> {
  success?: boolean
  message?: string
  data?: T
}

interface UsersResponse extends ApiResponse<User[]> {
  users: User[]
}

interface UserResponse extends ApiResponse<User> {
  user: User
}

interface MetricsResponse extends ApiResponse<any> {
  metrics: {
    chronologicalAge: number
    biologicalAge: number
    bioAgeDelta: number
    avgShieldScore: number
    avgSleepEfficiency: number
    avgRemPercentage: number
    avgSleepHours: number
    sleepDataCount: number
    dailyShieldScores: Array<{ date: string; score: number; day: string }>
  }
}

// User API functions
export const usersApi = {
  // Get all users
  getAll: async (): Promise<UsersResponse> => {
    const response = await fetch('/api/users')
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch users' }))
      throw new Error(error.error || 'Failed to fetch users')
    }
    return response.json()
  },

  // Get user by ID
  getById: async (id: string): Promise<UserResponse> => {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch user' }))
      throw new Error(error.error || 'Failed to fetch user')
    }
    return response.json()
  },

  // Create new user
  create: async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<UserResponse> => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create user' }))
      throw new Error(error.error || 'Failed to create user')
    }
    return response.json()
  },

  // Update user
  update: async (id: string, userData: Partial<User>): Promise<UserResponse> => {
    const response = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update user' }))
      throw new Error(error.error || 'Failed to update user')
    }
    return response.json()
  },

  // Delete user
  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete user' }))
      throw new Error(error.error || 'Failed to delete user')
    }
    return response.json()
  },

  // Get user metrics
  getMetrics: async (id: string): Promise<MetricsResponse> => {
    const response = await fetch(`/api/users/${id}/metrics`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch metrics' }))
      throw new Error(error.error || 'Failed to fetch metrics')
    }
    return response.json()
  },
} 