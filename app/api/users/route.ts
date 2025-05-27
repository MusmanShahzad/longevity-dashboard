import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withDataAccess, withDataModification } from '@/lib/optimized-api-wrapper'
import { logCompleteAuditEvent } from "@/lib/audit-middleware"

// Validation schemas
const createUserSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  email: z.string().email('Invalid email format').max(255),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  sex: z.enum(['male', 'female', 'other']),
  location: z.string().max(100).optional()
})

const getUsersQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().max(100).optional()
})

// GET /api/users - List users with caching and pagination
export const GET = withDataAccess(
  async (request, context) => {
    const { limit = 50, offset = 0, search } = context.query
    
    // Build query
    let query = supabase
      .from('users')
      .select('id, full_name, email, date_of_birth, sex, location, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add search filter if provided
    if (search) {
      query = query.or(`full_name.ilike.%${search}%, email.ilike.%${search}%`)
    }

    const { data: users, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    return {
      users: users || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasNext: (count || 0) > offset + limit,
        hasPrev: offset > 0
      }
    }
  },
  {
    resourceType: 'users',
    querySchema: getUsersQuerySchema,
    cacheTTL: 5 * 60 * 1000, // Cache for 5 minutes
    maxRequestSize: 1024 // 1KB max for GET requests
  }
)

// POST /api/users - Create new user
export const POST = withDataModification(
  async (request, context) => {
    const userData = context.body

    // Check if user with email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single()

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Create new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`)
    }

    return {
      user: newUser,
      message: 'User created successfully'
    }
  },
  {
    resourceType: 'users',
    operation: 'create',
    bodySchema: createUserSchema,
    maxRequestSize: 10 * 1024, // 10KB max for user creation
    timeout: 30000 // 30 second timeout
  }
)
