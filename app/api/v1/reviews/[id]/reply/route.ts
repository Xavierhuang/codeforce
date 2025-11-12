import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { handleApiError, Errors } from '@/lib/errors'
import { validateBody, validateParams } from '@/lib/validation'
import { ReviewIdParamSchema } from '@/lib/validation-schemas'
import { sanitizeText } from '@/lib/sanitize'
import { z } from 'zod'

const ReviewReplySchema = z.object({
  reply: z.string().min(1).max(2000),
}).strict()

const REPLY_TIME_LIMIT_DAYS = 30 // Allow replies within 30 days

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    
    // Validate route parameters
    const paramValidation = validateParams(params, ReviewIdParamSchema)
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid review ID',
          details: paramValidation.errors.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      )
    }
    
    const reviewId = paramValidation.data.id
    
    // Validate request body
    const validation = await validateBody(req, ReviewReplySchema)
    if (!validation.success) {
      return validation.response
    }
    
    const { reply } = validation.data
    
    // Fetch review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    })
    
    if (!review) {
      throw Errors.notFound('Review')
    }
    
    // Only target user can reply
    if (review.targetUserId !== user.id) {
      throw Errors.forbidden('Only the reviewed user can reply to this review')
    }
    
    // Review replies feature not implemented - Review model doesn't have reply/repliedAt fields
    return NextResponse.json(
      { error: 'Review replies feature not implemented' },
      { status: 501 }
    )
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to add reply to review')
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    
    // Validate route parameters
    const paramValidation = validateParams(params, ReviewIdParamSchema)
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid review ID',
          details: paramValidation.errors.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      )
    }
    
    const reviewId = paramValidation.data.id
    
    // Validate request body
    const validation = await validateBody(req, ReviewReplySchema)
    if (!validation.success) {
      return validation.response
    }
    
    const { reply } = validation.data
    
    // Fetch review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    })
    
    if (!review) {
      throw Errors.notFound('Review')
    }
    
    // Only target user can edit reply
    if (review.targetUserId !== user.id) {
      throw Errors.forbidden('Only the reviewed user can edit the reply')
    }
    
    // Review replies feature not implemented - Review model doesn't have reply/repliedAt fields
    return NextResponse.json(
      { error: 'Review replies feature not implemented' },
      { status: 501 }
    )
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to update reply')
  }
}


