import type { User, User as UserType } from "@/lib/supabase"

export interface UserInput {
  name: string
  email: string
  date_of_birth: string
}

export const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch('/api/users')
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`)
  }
  const data = await response.json()
  // Handle both old and new API response formats
  return data.data?.users || data.users || []
}

export const fetchUser = async (userId: string): Promise<User> => {
  const response = await fetch(`/api/users/${userId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`)
  }
  const data = await response.json()
  // Handle both old and new API response formats
  return data.data?.user || data.user
}

export const createUser = async (userData: UserInput): Promise<User> => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || `Failed to create user: ${response.statusText}`)
  }
  
  const data = await response.json()
  // Handle both old and new API response formats
  return data.data?.user || data.user
}

export const updateUser = async (userId: string, userData: Partial<UserInput>): Promise<{user: User}> => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || `Failed to update user: ${response.statusText}`)
  }
  
  const data = await response.json()
  // Handle both old and new API response formats
  return data.data?.user || data.user
}

export const deleteUser = async (userId: string): Promise<void> => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || `Failed to delete user: ${response.statusText}`)
  }
}