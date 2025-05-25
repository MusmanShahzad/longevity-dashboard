# Routing Structure

## Overview
The application has been restructured to separate user management and individual user dashboards with proper routing.

## Routes

### `/` - User Management Page
- **Purpose**: Main landing page for managing users
- **Features**:
  - View all users
  - Create new users
  - Select users to view their dashboards
- **Navigation**: Clicking on a user navigates to `/user/[userId]`

### `/user/[userId]` - Individual User Dashboard
- **Purpose**: Dedicated dashboard page for each user
- **Features**:
  - User-specific dashboard with all metrics
  - Add health data
  - Edit user profile
  - Back navigation to user management
- **Context**: Uses `UserProvider` to share user data throughout the dashboard

## Context Structure

### UserContext (`app/contexts/user-context.tsx`)
Provides user data throughout the dashboard pages:

```typescript
interface UserContextType {
  currentUser: UserType | null
  setCurrentUser: (user: UserType | null) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  refreshUser: () => void
}
```

### Usage
- **Layout**: `app/user/layout.tsx` wraps all user routes with `UserProvider`
- **Dashboard**: Components can access user data via `useUser()` hook
- **Automatic Loading**: User data is fetched automatically based on URL parameter

## Component Updates

### Dashboard Component
- Now uses `useUser()` hook to get current user data
- Maintains backward compatibility with prop-based user data
- Shows appropriate loading/error states

### User Management
- Simplified to only handle user selection and creation
- Uses Next.js router to navigate to user dashboards

## Benefits

1. **Clean Separation**: User management and dashboards are separate pages
2. **Proper Routing**: Each user has their own URL (`/user/[userId]`)
3. **Shared Context**: User data is available throughout dashboard components
4. **Better UX**: Direct links to user dashboards, browser back/forward support
5. **Scalable**: Easy to add more user-specific pages in the future

## Migration Notes

- Old single-page approach with view modes has been replaced
- User selection now navigates to dedicated pages
- Context provides user data instead of prop drilling
- All existing dashboard functionality is preserved 