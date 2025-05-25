import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  fetchUsers, 
  fetchUser, 
  createUser, 
  updateUser, 
  deleteUser, 
  type UserInput,
  type User,
} from '@/lib/api/users'
import { usersApi } from '../api/users.api'
import { queryKeys } from '../query-client'
// Get all users
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  })
}

// Get user by ID
export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}

// Get user metrics
export const useUserMetrics = (id: string) => {
  return useQuery({
    queryKey: queryKeys.users.metrics(id),
    queryFn: () => usersApi.getMetrics(id),
    select: (data) => data.metrics,
    enabled: !!id,
  })
}

// Create user mutation
export const useCreateUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createUser,
    onSuccess: (newUser) => {
      // Add the new user to the users list cache
      queryClient.setQueryData(['users'], (oldUsers: User[] | undefined) => {
        return oldUsers ? [...oldUsers, newUser] : [newUser]
      })
    },
    onError: (error) => {
      console.error('Failed to create user:', error)
    },
  })
}

// Update user mutation
export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, userData }: { id: string; userData: Partial<UserInput> }) =>
      updateUser(id, userData),
    onSuccess: (updatedUser, variables) => {
      // Update the user in the cache
      queryClient.setQueryData(['users', variables.id], updatedUser)
      
      // Update the user in the users list cache
      queryClient.setQueryData(['users'], (oldUsers: User[] | undefined) => {
        return oldUsers?.map(user => 
          user.id === variables.id ? updatedUser : user
        )
      })
    },
    onError: (error) => {
      console.error('Failed to update user:', error)
    },
  })
}

// Delete user mutation
export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: (_, userId) => {
      // Remove the user from the users list cache
      queryClient.setQueryData(['users'], (oldUsers: User[] | undefined) => {
        return oldUsers?.filter(user => user.id !== userId)
      })
      
      // Remove the individual user cache
      queryClient.removeQueries({ queryKey: ['users', userId] })
      
      // Clean up related data
      queryClient.removeQueries({ queryKey: ['sleepData', userId] })
      queryClient.removeQueries({ queryKey: ['metrics', userId] })
      queryClient.removeQueries({ queryKey: ['healthAlerts', userId] })
    },
    onError: (error) => {
      console.error('Failed to delete user:', error)
    },
  })
} 