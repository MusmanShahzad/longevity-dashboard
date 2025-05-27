"use client"

import { useState, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'

interface SecureAPIOptions {
  retryAttempts?: number
  retryDelay?: number
  timeout?: number
  logErrors?: boolean
}

interface APIResponse<T> {
  data: T | null
  error: string | null
  loading: boolean
  success: boolean
}

interface SecurityEvent {
  type: 'session_warning' | 'session_expired' | 'suspicious_activity' | 'rate_limit'
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export function useSecureAPI<T = any>(options: SecureAPIOptions = {}) {
  const {
    retryAttempts = 3,
    retryDelay = 1000,
    timeout = 30000,
    logErrors = true
  } = options

  const [state, setState] = useState<APIResponse<T>>({
    data: null,
    error: null,
    loading: false,
    success: false
  })

  // Use ref to prevent infinite loops in security event logging
  const isLoggingSecurityEvent = useRef(false)

  // Memoize the security event logging function to prevent recreating on every render
  const logSecurityEvent = useCallback(async (event: SecurityEvent) => {
    // Prevent infinite loops by checking if we're already logging
    if (isLoggingSecurityEvent.current) {
      console.warn('Security event logging already in progress, skipping:', event)
      return
    }

    try {
      isLoggingSecurityEvent.current = true
      
      // Don't log security events for security event endpoints to prevent infinite loops
      const response = await fetch('/api/audit/security-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      })

      if (!response.ok) {
        console.warn('Failed to log security event:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to log security event:', error)
    } finally {
      isLoggingSecurityEvent.current = false
    }
  }, []) // No dependencies to prevent recreation

  // Memoize the main request function with stable dependencies
  const makeRequest = useCallback(async (
    url: string,
    options: RequestInit = {},
    attempt = 1
  ): Promise<APIResponse<T>> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Add timeout to request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })

      clearTimeout(timeoutId)

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const message = `Rate limit exceeded. Please wait ${retryAfter} seconds.`
        
        // Only log if not already logging to prevent loops
        if (!isLoggingSecurityEvent.current) {
          logSecurityEvent({
            type: 'rate_limit',
            message,
            severity: 'medium'
          })
        }

        toast.warning(message)
        
        const errorState = {
          data: null,
          error: message,
          loading: false,
          success: false
        }
        setState(errorState)
        return errorState
      }

      // Handle authentication errors
      if (response.status === 401) {
        // Only log if not already logging to prevent loops
        if (!isLoggingSecurityEvent.current) {
          logSecurityEvent({
            type: 'session_expired',
            message: 'Authentication failed - session may have expired',
            severity: 'high'
          })
        }

        toast.error('Session expired. Please refresh the page.')
        
        const errorState = {
          data: null,
          error: 'Authentication failed',
          loading: false,
          success: false
        }
        setState(errorState)
        return errorState
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`

        // Log suspicious 4xx errors (except 400 which might be normal validation)
        if (response.status >= 400 && response.status < 500 && response.status !== 400 && !isLoggingSecurityEvent.current) {
          logSecurityEvent({
            type: 'suspicious_activity',
            message: `Unexpected client error: ${errorMessage}`,
            severity: 'medium'
          })
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      const successState = {
        data,
        error: null,
        loading: false,
        success: true
      }
      setState(successState)
      return successState

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      
      // Retry logic for network errors
      if (attempt < retryAttempts && (
        errorMessage.includes('fetch') || 
        errorMessage.includes('network') ||
        errorMessage.includes('timeout')
      )) {
        console.warn(`API request failed (attempt ${attempt}/${retryAttempts}):`, errorMessage)
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
        
        return makeRequest(url, options, attempt + 1)
      }

      // Log security events for suspicious errors (but not during security event logging)
      if ((errorMessage.includes('abort') || errorMessage.includes('timeout')) && !isLoggingSecurityEvent.current) {
        logSecurityEvent({
          type: 'suspicious_activity',
          message: `Request ${errorMessage} - potential security issue`,
          severity: 'medium'
        })
      }

      if (logErrors) {
        console.error('API request failed:', errorMessage)
        toast.error(`Request failed: ${errorMessage}`)
      }

      const errorState = {
        data: null,
        error: errorMessage,
        loading: false,
        success: false
      }
      setState(errorState)
      return errorState
    }
  }, [retryAttempts, retryDelay, timeout, logErrors, logSecurityEvent])

  // Memoize HTTP method functions to prevent recreation
  const httpMethods = useMemo(() => ({
    get: (url: string, options: RequestInit = {}) => {
      return makeRequest(url, { ...options, method: 'GET' })
    },
    
    post: (url: string, data?: any, options: RequestInit = {}) => {
      return makeRequest(url, {
        ...options,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined
      })
    },
    
    put: (url: string, data?: any, options: RequestInit = {}) => {
      return makeRequest(url, {
        ...options,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined
      })
    },
    
    delete: (url: string, options: RequestInit = {}) => {
      return makeRequest(url, { ...options, method: 'DELETE' })
    }
  }), [makeRequest])

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      loading: false,
      success: false
    })
  }, [])

  // Return memoized object to prevent unnecessary re-renders
  return useMemo(() => ({
    ...state,
    ...httpMethods,
    reset,
    makeRequest
  }), [state, httpMethods, reset, makeRequest])
}

// Specialized hook for health data with additional security
export function useSecureHealthAPI<T = any>() {
  // Memoize options to prevent recreation
  const options = useMemo(() => ({
    retryAttempts: 2, // Fewer retries for sensitive health data
    timeout: 15000,   // Shorter timeout for better security
    logErrors: true
  }), [])

  const api = useSecureAPI<T>(options)

  // Memoize secure methods to prevent recreation
  const secureMethods = useMemo(() => ({
    secureGet: async (url: string, resourceType?: string) => {
      return api.get(url)
    },
    
    securePost: async (url: string, data: any, resourceType?: string) => {
      return api.post(url, data)
    },
    
    securePut: async (url: string, data: any, resourceType?: string) => {
      return api.put(url, data)
    }
  }), [api])

  return useMemo(() => ({
    ...api,
    ...secureMethods
  }), [api, secureMethods])
} 