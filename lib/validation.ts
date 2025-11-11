import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Validation utility functions and common schemas
 */

// Common validation patterns
export const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const cuidRegex = /^c[a-z0-9]{24}$/i

// UUID or CUID validation
export const idSchema = z.string().refine(
  (val) => uuidRegex.test(val) || cuidRegex.test(val),
  { message: 'Invalid ID format' }
)

// Email validation
export const emailSchema = z.string().email({ message: 'Invalid email format' }).max(255)

// Phone validation (E.164 format)
export const phoneSchema = z.string().regex(
  /^\+[1-9]\d{1,14}$/,
  { message: 'Phone number must be in E.164 format (e.g., +1234567890)' }
).optional().nullable()

// URL validation
export const urlSchema = z.string().url({ message: 'Invalid URL format' }).max(500).optional().nullable()

// Password validation with custom refinement
export const passwordSchema = z.string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(100, { message: 'Password must be less than 100 characters' })
  .refine((password) => {
    // Check for uppercase
    if (!/[A-Z]/.test(password)) return false
    // Check for lowercase
    if (!/[a-z]/.test(password)) return false
    // Check for numbers
    if (!/[0-9]/.test(password)) return false
    // Check for special characters
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false
    // Check for spaces
    if (/\s/.test(password)) return false
    return true
  }, {
    message: 'Password must contain uppercase, lowercase, numbers, and special characters, and cannot contain spaces'
  })

// Text field schemas with length limits
export const titleSchema = z.string().min(1).max(200)
export const descriptionSchema = z.string().min(1).max(5000)
export const bioSchema = z.string().max(1000).optional().nullable()
export const commentSchema = z.string().max(2000).optional().nullable()
export const messageSchema = z.string().min(1).max(5000)

// Coordinate schemas
export const latSchema = z.number().min(-90).max(90)
export const lngSchema = z.number().min(-180).max(180)

// Rating schema
export const ratingSchema = z.number().int().min(1).max(5)

// Price schema
export const priceSchema = z.number().positive().max(1000000) // Max $1M

// Duration schema (in minutes)
export const durationSchema = z.number().int().positive().max(10080) // Max 1 week

// Role enum
export const roleSchema = z.enum(['CLIENT', 'WORKER', 'ADMIN'])

// Task status enum
export const taskStatusSchema = z.enum(['OPEN', 'OFFERED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED'])

// Task type enum
export const taskTypeSchema = z.enum(['VIRTUAL', 'IN_PERSON'])

// Service type enum
export const serviceTypeSchema = z.enum(['VIRTUAL', 'IN_PERSON', 'BOTH'])

// Verification status enum
export const verificationStatusSchema = z.enum(['PENDING', 'VERIFIED', 'REJECTED'])

// Support ticket status enum
export const supportTicketStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])

// Support ticket priority enum
export const supportTicketPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

/**
 * Validation helper function
 * Validates request body against a Zod schema and returns validated data or error response
 */
export async function validateBody<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: NextResponse }> {
  try {
    const body = await req.json()
    const result = schema.safeParse(body)
    
    if (!result.success) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Validation failed',
            details: result.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
          { status: 400 }
        ),
      }
    }
    
    return { success: true, data: result.data }
  } catch (error: any) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Invalid request body',
          details: error.message || 'Failed to parse JSON',
        },
        { status: 400 }
      ),
    }
  }
}

/**
 * Validate URL search parameters
 */
export function validateSearchParams<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  
  const result = schema.safeParse(params)
  
  if (!result.success) {
    return { success: false, errors: result.error }
  }
  
  return { success: true, data: result.data }
}

/**
 * Validate route parameters
 */
export function validateParams<T extends z.ZodTypeAny>(
  params: Record<string, string>,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(params)
  
  if (!result.success) {
    return { success: false, errors: result.error }
  }
  
  return { success: true, data: result.data }
}

