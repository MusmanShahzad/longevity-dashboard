import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { withDataAccess, withDataModification, withDataDeletion } from '@/lib/optimized-api-wrapper'

// Validation schemas
const userIdSchema = z.object({
  id: z.string().uuid('Invalid user ID format')
})

const updateUserSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100).optional(),
  email: z.string().email('Invalid email format').max(255).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  sex: z.enum(['male', 'female', 'other']).optional(),
  location: z.string().max(100).optional()
})

// GET /api/users/[id] - Get specific user
export const GET = withDataAccess(
  async (request, context) => {
    const { id } = context.params!

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('User not found')
      }
      throw new Error(`Failed to fetch user: ${error.message}`)
    }

    return { user }
  },
  {
    resourceType: 'users',
    paramsSchema: userIdSchema,
    cacheTTL: 2 * 60 * 1000, // Cache for 2 minutes
    maxRequestSize: 1024
  }
)

// PUT /api/users/[id] - Update user
export const PUT = withDataModification(
  async (request, context) => {
    const { id } = context.params!
    const updateData = context.body

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('User not found')
      }
      throw new Error(`Failed to fetch user: ${fetchError.message}`)
    }

    // If email is being updated, check for conflicts
    if (updateData.email && updateData.email !== existingUser.email) {
      const { data: emailConflict } = await supabase
        .from('users')
        .select('id')
        .eq('email', updateData.email)
        .neq('id', id)
        .single()

      if (emailConflict) {
        throw new Error('Email already in use by another user')
      }
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`)
    }

    return {
      user: updatedUser,
      message: 'User updated successfully'
    }
  },
  {
    resourceType: 'users',
    operation: 'update',
    paramsSchema: userIdSchema,
    bodySchema: updateUserSchema,
    maxRequestSize: 10 * 1024,
    timeout: 30000
  }
)

// DELETE /api/users/[id] - Delete user
export const DELETE = withDataDeletion(
  async (request, context) => {
    const { id } = context.params!

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('User not found')
      }
      throw new Error(`Failed to fetch user: ${fetchError.message}`)
    }

    // Delete user (this will cascade delete related data due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`)
    }

    return {
      deletedUser: {
        id: existingUser.id,
        full_name: existingUser.full_name,
        email: existingUser.email
      },
      message: 'User deleted successfully'
    }
  },
  {
    resourceType: 'users',
    paramsSchema: userIdSchema,
    maxRequestSize: 1024,
    timeout: 30000
  }
)
