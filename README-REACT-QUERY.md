# React Query Implementation Guide

This document outlines the React Query (TanStack Query) implementation in the Longevity Dashboard project.

## Overview

React Query has been implemented to provide:
- **Intelligent caching** - Automatic background updates and cache management
- **Loading states** - Built-in loading, error, and success states
- **Optimistic updates** - Immediate UI updates with automatic rollback on failure
- **Background refetching** - Keep data fresh automatically
- **Mutation management** - Handle create, update, delete operations with cache invalidation

## Project Structure

```
lib/
├── query-client.ts          # Query client configuration and query keys
├── api/                     # API service functions
│   ├── users.api.ts
│   ├── sleep-data.api.ts
│   ├── health-alerts.api.ts
│   └── lab-reports.api.ts
└── hooks/                   # Custom React Query hooks
    ├── use-users.ts
    ├── use-sleep-data.ts
    ├── use-health-alerts.ts
    └── use-lab-reports.ts

components/
└── providers/
    └── query-provider.tsx   # Query client provider wrapper
```

## Configuration

### Query Client Setup (`lib/query-client.ts`)

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes cache time
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
```

### Query Keys Factory

Centralized query key management for consistency:

```typescript
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
  // ... more query keys
}
```

## API Services

### Service Pattern (`lib/api/*.api.ts`)

Each API service follows a consistent pattern:

```typescript
export const usersApi = {
  getAll: async (): Promise<UsersResponse> => {
    const response = await fetch('/api/users')
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch users' }))
      throw new Error(error.error || 'Failed to fetch users')
    }
    return response.json()
  },
  
  create: async (userData: CreateUserData): Promise<UserResponse> => {
    // ... implementation
  },
  
  // ... other methods
}
```

## Custom Hooks

### Query Hooks (`lib/hooks/use-*.ts`)

#### Basic Query Hook
```typescript
export const useUsers = () => {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: usersApi.getAll,
    select: (data) => data.users, // Transform response data
  })
}
```

#### Conditional Query Hook
```typescript
export const useUser = (id: string) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.getById(id),
    select: (data) => data.user,
    enabled: !!id, // Only run when id is provided
  })
}
```

#### Mutation Hook with Cache Updates
```typescript
export const useCreateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: (data) => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      
      // Add the new user to the cache
      queryClient.setQueryData(queryKeys.users.detail(data.user.id), data)
    },
  })
}
```

## Usage in Components

### Basic Data Fetching

```typescript
import { useUsers } from '@/lib/hooks/use-users'

function UserList() {
  const { data: users = [], isLoading, error } = useUsers()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error.message} />

  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}
```

### Mutations with Loading States

```typescript
import { useCreateUser } from '@/lib/hooks/use-users'

function CreateUserForm() {
  const createUser = useCreateUser()

  const handleSubmit = async (userData) => {
    try {
      await createUser.mutateAsync(userData)
      // Success handling
    } catch (error) {
      // Error handling
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button 
        type="submit" 
        disabled={createUser.isPending}
      >
        {createUser.isPending ? 'Creating...' : 'Create User'}
      </button>
      {createUser.error && (
        <ErrorMessage error={createUser.error.message} />
      )}
    </form>
  )
}
```

## Cache Management Strategies

### 1. Optimistic Updates
For immediate UI feedback:

```typescript
const updateUser = useMutation({
  mutationFn: usersApi.update,
  onMutate: async (variables) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(variables.id) })
    
    // Snapshot previous value
    const previousUser = queryClient.getQueryData(queryKeys.users.detail(variables.id))
    
    // Optimistically update
    queryClient.setQueryData(queryKeys.users.detail(variables.id), (old) => ({
      ...old,
      user: { ...old.user, ...variables.userData }
    }))
    
    return { previousUser }
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previousUser) {
      queryClient.setQueryData(queryKeys.users.detail(variables.id), context.previousUser)
    }
  },
  onSettled: (data, error, variables) => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) })
  },
})
```

### 2. Related Data Invalidation
When data changes affect multiple queries:

```typescript
const createSleepData = useMutation({
  mutationFn: sleepDataApi.create,
  onSuccess: (data, variables) => {
    // Invalidate sleep data for this user
    queryClient.invalidateQueries({ queryKey: queryKeys.sleepData.all(variables.user_id) })
    
    // Invalidate user metrics (affected by new sleep data)
    queryClient.invalidateQueries({ queryKey: queryKeys.users.metrics(variables.user_id) })
    
    // Invalidate health alerts (new sleep data might generate alerts)
    queryClient.invalidateQueries({ queryKey: queryKeys.healthAlerts.all(variables.user_id) })
  },
})
```

### 3. Selective Cache Updates
For precise cache management:

```typescript
const markAlertAsRead = useMutation({
  mutationFn: healthAlertsApi.markAsRead,
  onSuccess: (_, alertId) => {
    // Update specific alert in all relevant queries
    queryClient.setQueriesData(
      { queryKey: ['health-alerts'] },
      (oldData: any) => {
        if (!oldData?.alerts) return oldData
        
        return {
          ...oldData,
          alerts: oldData.alerts.map((alert: any) =>
            alert.id === alertId ? { ...alert, is_read: true } : alert
          ),
        }
      }
    )
  },
})
```

## Error Handling

### Global Error Handling
Configured in the query client:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.includes('4')) {
          return false
        }
        return failureCount < 3
      },
    },
  },
})
```

### Component-Level Error Handling
```typescript
const { data, error, isLoading } = useUsers()

if (error) {
  return (
    <ErrorBoundary>
      <ErrorMessage 
        title="Failed to load users"
        message={error.message}
        onRetry={() => queryClient.invalidateQueries({ queryKey: queryKeys.users.all })}
      />
    </ErrorBoundary>
  )
}
```

## Development Tools

### React Query Devtools
Enabled in development mode:

```typescript
// components/providers/query-provider.tsx
{process.env.NODE_ENV === 'development' && (
  <ReactQueryDevtools initialIsOpen={false} />
)}
```

Access devtools by clicking the React Query icon in the bottom corner of your app during development.

## Best Practices

### 1. Query Key Consistency
- Use the centralized `queryKeys` factory
- Follow hierarchical key structure: `['resource', 'id', 'sub-resource']`

### 2. Error Boundaries
- Wrap components with error boundaries
- Provide retry mechanisms for failed queries

### 3. Loading States
- Always handle loading states in UI
- Use skeleton loaders for better UX

### 4. Cache Invalidation
- Invalidate related queries after mutations
- Use selective updates for better performance

### 5. TypeScript Integration
- Define proper types for API responses
- Use generic types for reusable patterns

## Migration from Manual Fetch

### Before (Manual Fetch)
```typescript
const [users, setUsers] = useState([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)

useEffect(() => {
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      setUsers(data.users)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  fetchUsers()
}, [])
```

### After (React Query)
```typescript
const { data: users = [], isLoading, error } = useUsers()
```

## Performance Benefits

1. **Automatic Caching** - Eliminates redundant API calls
2. **Background Updates** - Keeps data fresh without user interaction
3. **Request Deduplication** - Multiple components requesting same data = single API call
4. **Intelligent Refetching** - Only refetch when necessary
5. **Memory Management** - Automatic garbage collection of unused cache entries

## Conclusion

React Query provides a robust foundation for data fetching and state management in the Longevity Dashboard. The implementation follows best practices for caching, error handling, and performance optimization while maintaining a clean and maintainable codebase. 