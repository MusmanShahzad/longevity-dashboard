"use client"

import { useState, useCallback } from 'react'
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

  const logSecurityEvent = useCallback(async (event: SecurityEvent) => {
    try {
      await fetch('/api/audit/security-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      })
    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }, [])

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
        
        await logSecurityEvent({
          type: 'rate_limit',
          message,
          severity: 'medium'
        })

        toast.warning(message)
        
        setState({
          data: null,
          error: message,
          loading: false,
          success: false
        })

        return { data: null, error: message, loading: false, success: false }
      }

      // Handle authentication errors
      if (response.status === 401) {
        await logSecurityEvent({
          type: 'session_expired',
          message: 'Authentication failed - session may have expired',
          severity: 'high'
        })

        toast.error('Session expired. Please refresh the page.')
        
        setState({
          data: null,
          error: 'Authentication failed',
          loading: false,
          success: false
        })

        return { data: null, error: 'Authentication failed', loading: false, success: false }
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`

        // Log suspicious 4xx errors (except 400 which might be normal validation)
        if (response.status >= 400 && response.status < 500 && response.status !== 400) {
          await logSecurityEvent({
            type: 'suspicious_activity',
            message: `Unexpected client error: ${errorMessage}`,
            severity: 'medium'
          })
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      setState({
        data,
        error: null,
        loading: false,
        success: true
      })

      return { data, error: null, loading: false, success: true }

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

      // Log security events for suspicious errors
      if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
        await logSecurityEvent({
          type: 'suspicious_activity',
          message: `Request ${errorMessage} - potential security issue`,
          severity: 'medium'
        })
      }

      if (logErrors) {
        console.error('API request failed:', errorMessage)
        toast.error(`Request failed: ${errorMessage}`)
      }

      setState({
        data: null,
        error: errorMessage,
        loading: false,
        success: false
      })

      return { data: null, error: errorMessage, loading: false, success: false }
    }
  }, [retryAttempts, retryDelay, timeout, logErrors, logSecurityEvent])

  const get = useCallback((url: string, options: RequestInit = {}) => {
    return makeRequest(url, { ...options, method: 'GET' })
  }, [makeRequest])

  const post = useCallback((url: string, data?: any, options: RequestInit = {}) => {
    return makeRequest(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }, [makeRequest])

  const put = useCallback((url: string, data?: any, options: RequestInit = {}) => {
    return makeRequest(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }, [makeRequest])

  const del = useCallback((url: string, options: RequestInit = {}) => {
    return makeRequest(url, { ...options, method: 'DELETE' })
  }, [makeRequest])

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      loading: false,
      success: false
    })
  }, [])

  return {
    ...state,
    get,
    post,
    put,
    delete: del,
    reset,
    makeRequest
  }
}

// Specialized hook for health data with additional security
export function useSecureHealthAPI<T = any>() {
  const api = useSecureAPI<T>({
    retryAttempts: 2, // Fewer retries for sensitive health data
    timeout: 15000,   // Shorter timeout for better security
    logErrors: true
  })

  const logHealthDataAccess = useCallback(async (action: string, resourceType: string) => {
    try {
      await fetch('/api/audit/security-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'suspicious_activity',
          message: `Health data ${action}: ${resourceType}`,
          severity: 'low',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          additionalData: { action, resourceType }
        })
      })
    } catch (error) {
      console.error('Failed to log health data access:', error)
    }
  }, [])

  const secureGet = useCallback(async (url: string, resourceType: string) => {
    await logHealthDataAccess('access', resourceType)
    return api.get(url)
  }, [api, logHealthDataAccess])

  const securePost = useCallback(async (url: string, data: any, resourceType: string) => {
    await logHealthDataAccess('create', resourceType)
    return api.post(url, data)
  }, [api, logHealthDataAccess])

  const securePut = useCallback(async (url: string, data: any, resourceType: string) => {
    await logHealthDataAccess('update', resourceType)
    return api.put(url, data)
  }, [api, logHealthDataAccess])

  return {
    ...api,
    secureGet,
    securePost,
    securePut
  }
} 