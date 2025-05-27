"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'

interface SecurityEvent {
  type: 'session_warning' | 'session_expired' | 'suspicious_activity' | 'rate_limit'
  message: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface SecurityContextType {
  sessionTimeRemaining: number
  isSessionActive: boolean
  securityEvents: SecurityEvent[]
  extendSession: () => void
  logSecurityEvent: (event: Omit<SecurityEvent, 'timestamp'>) => void
  clearSecurityEvents: () => void
  lastActivity: Date | null
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

interface SecurityProviderProps {
  children: React.ReactNode
  sessionTimeoutMinutes?: number
  warningTimeMinutes?: number
}

export function SecurityProvider({ 
  children, 
  sessionTimeoutMinutes = 30,
  warningTimeMinutes = 5 
}: SecurityProviderProps) {
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(sessionTimeoutMinutes * 60)
  const [isSessionActive, setIsSessionActive] = useState(true)
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [lastActivity, setLastActivity] = useState<Date | null>(new Date())
  const [warningShown, setWarningShown] = useState(false)

  // Track user activity
  const updateActivity = useCallback(() => {
    setLastActivity(new Date())
    setSessionTimeRemaining(sessionTimeoutMinutes * 60)
    setWarningShown(false)
    
    if (!isSessionActive) {
      setIsSessionActive(true)
      toast.success('Session restored')
    }
  }, [sessionTimeoutMinutes, isSessionActive])

  // Session management
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      updateActivity()
    }

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [updateActivity])

  // Session countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTimeRemaining(prev => {
        const newTime = prev - 1

        // Show warning when 5 minutes remaining
        if (newTime === warningTimeMinutes * 60 && !warningShown) {
          setWarningShown(true)
          toast.warning(
            `Session expires in ${warningTimeMinutes} minutes. Click anywhere to extend.`,
            {
              duration: 10000,
              action: {
                label: 'Extend Session',
                onClick: () => updateActivity()
              }
            }
          )
          
          logSecurityEvent({
            type: 'session_warning',
            message: `Session expiring in ${warningTimeMinutes} minutes`,
            severity: 'medium'
          })
        }

        // Session expired
        if (newTime <= 0) {
          setIsSessionActive(false)
          toast.error('Session expired for security. Please refresh the page.', {
            duration: Infinity,
            action: {
              label: 'Refresh',
              onClick: () => window.location.reload()
            }
          })
          
          logSecurityEvent({
            type: 'session_expired',
            message: 'User session expired due to inactivity',
            severity: 'high'
          })
          
          return 0
        }

        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [warningTimeMinutes, warningShown, updateActivity])

  // Monitor for suspicious activity
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden - potential security concern for PHI
        logSecurityEvent({
          type: 'suspicious_activity',
          message: 'Application tab became hidden while viewing PHI',
          severity: 'low'
        })
      }
    }

    const handleBeforeUnload = () => {
      logSecurityEvent({
        type: 'suspicious_activity',
        message: 'User attempting to leave application with PHI displayed',
        severity: 'medium'
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // API request interceptor for rate limiting detection
  useEffect(() => {
    const originalFetch = window.fetch
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        
        // Check for rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          logSecurityEvent({
            type: 'rate_limit',
            message: `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
            severity: 'medium'
          })
          
          toast.warning('Request rate limit exceeded. Please slow down.', {
            duration: 5000
          })
        }
        
        return response
      } catch (error) {
        logSecurityEvent({
          type: 'suspicious_activity',
          message: 'Network request failed - potential security issue',
          severity: 'medium'
        })
        throw error
      }
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  const extendSession = useCallback(() => {
    updateActivity()
    toast.success('Session extended successfully')
  }, [updateActivity])

  const logSecurityEvent = useCallback((event: Omit<SecurityEvent, 'timestamp'>) => {
    const newEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    }
    
    setSecurityEvents(prev => [...prev.slice(-9), newEvent]) // Keep last 10 events
    
    // Log to console for development (in production, send to SIEM)
    console.warn('SECURITY EVENT:', newEvent)
    
    // Send to backend audit system
    if (typeof window !== 'undefined') {
      fetch('/api/audit/security-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvent,
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(console.error)
    }
  }, [])

  const clearSecurityEvents = useCallback(() => {
    setSecurityEvents([])
  }, [])

  const value: SecurityContextType = {
    sessionTimeRemaining,
    isSessionActive,
    securityEvents,
    extendSession,
    logSecurityEvent,
    clearSecurityEvents,
    lastActivity
  }

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  )
}

export function useSecurity() {
  const context = useContext(SecurityContext)
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider')
  }
  return context
}

// Security status component
export function SecurityStatus() {
  const { sessionTimeRemaining, isSessionActive, securityEvents } = useSecurity()
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (!isSessionActive) {
    return (
      <div className="fixed top-4 right-4 z-50 p-4 bg-red-500/90 backdrop-blur-sm border border-red-400 rounded-lg text-white">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse" />
          <span className="text-sm font-medium">Session Expired</span>
        </div>
      </div>
    )
  }

  const isWarning = sessionTimeRemaining <= 300 // 5 minutes
  const isCritical = sessionTimeRemaining <= 60 // 1 minute

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`p-3 backdrop-blur-sm border rounded-lg text-white text-xs ${
        isCritical 
          ? 'bg-red-500/90 border-red-400' 
          : isWarning 
            ? 'bg-yellow-500/90 border-yellow-400'
            : 'bg-green-500/90 border-green-400'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isCritical 
              ? 'bg-red-300 animate-pulse' 
              : isWarning 
                ? 'bg-yellow-300 animate-pulse'
                : 'bg-green-300'
          }`} />
          <span className="font-medium">
            Session: {formatTime(sessionTimeRemaining)}
          </span>
        </div>
        
        {securityEvents.length > 0 && (
          <div className="mt-1 text-xs opacity-80">
            {securityEvents.length} security event{securityEvents.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
} 