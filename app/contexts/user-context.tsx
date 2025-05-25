"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User as UserType } from '@/lib/supabase'

interface UserContextType {
  currentUser: UserType | null
  setCurrentUser: (user: UserType | null) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  refreshUser: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
  initialUser?: UserType | null
}

export function UserProvider({ children, initialUser = null }: UserProviderProps) {
  const [currentUser, setCurrentUser] = useState<UserType | null>(initialUser)
  const [isLoading, setIsLoading] = useState(false)

  const refreshUser = () => {
    // This can be used to trigger a refresh of user data
    // For now, it's a placeholder that components can use
    console.log('Refreshing user data...')
  }

  const value: UserContextType = {
    currentUser,
    setCurrentUser,
    isLoading,
    setIsLoading,
    refreshUser,
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
} 