import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withDataAccess, withDataModification } from '@/lib/optimized-api-wrapper'

// Validation schemas
const getAlertsQuerySchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  type: z.enum(['warning', 'info', 'success']).optional(),
  is_read: z.enum(['true', 'false']).transform(val => val === 'true').optional()
})

const createAlertSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
  type: z.enum(['warning', 'info', 'success']),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  suggestion: z.string().max(1000).optional(),
  sleep_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional()
})

// GET /api/health-alerts - Get health alerts for a user
export const GET = withDataAccess(
  async (request, context) => {
    const { user_id, limit = 50, type, is_read } = context.query

    // Build query
    let query = supabase
      .from('health_alerts')
      .select('*')
      .eq('user_id', user_id)
      .order('sleep_date', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (type) {
      query = query.eq('type', type)
    }

    if (is_read !== undefined) {
      query = query.eq('is_read', is_read)
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit)
    }

    const { data: alerts, error } = await query

    if (error) {
      throw new Error(`Failed to fetch health alerts: ${error.message}`)
    }

    return {
      alerts: alerts || [],
      count: alerts?.length || 0,
      filters: { type, is_read, limit }
    }
  },
  {
    resourceType: 'health_alerts',
    querySchema: getAlertsQuerySchema,
    cacheTTL: 1 * 60 * 1000, // Cache for 1 minute (alerts change frequently)
    maxRequestSize: 1024
  }
)

// POST /api/health-alerts - Create new health alert
export const POST = withDataModification(
  async (request, context) => {
    const alertData = context.body

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', alertData.user_id)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        throw new Error('User not found')
      }
      throw new Error(`Failed to verify user: ${userError.message}`)
    }

    // Set default sleep_date to today if not provided
    const finalAlertData = {
      ...alertData,
      sleep_date: alertData.sleep_date || new Date().toISOString().split('T')[0],
      is_read: false
    }

    // Create health alert
    const { data: newAlert, error } = await supabase
      .from('health_alerts')
      .insert([finalAlertData])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create health alert: ${error.message}`)
    }

    return {
      alert: newAlert,
      message: 'Health alert created successfully'
    }
  },
  {
    resourceType: 'health_alerts',
    operation: 'create',
    bodySchema: createAlertSchema,
    maxRequestSize: 5 * 1024, // 5KB max for alert creation
    timeout: 15000 // 15 second timeout
  }
)
