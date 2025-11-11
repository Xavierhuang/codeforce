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
    
    // Check if reply already exists
    if (review.reply) {
      throw Errors.businessRule('A reply already exists for this review')
    }
    
    // Check time limit (30 days)
    const daysSinceReview = (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceReview > REPLY_TIME_LIMIT_DAYS) {
      throw Errors.businessRule(
        `Replies can only be added within ${REPLY_TIME_LIMIT_DAYS} days of the review`
      )
    }
    
    // Only allow replies to approved reviews
    if (review.status !== 'APPROVED') {
      throw Errors.businessRule('You can only reply to approved reviews')
    }
    
    // Update review with reply
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        reply: sanitizeText(reply),
        repliedAt: new Date(),
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    })
    
    return NextResponse.json(updatedReview)
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
    
    // Check if reply exists
    if (!review.reply || !review.repliedAt) {
      throw Errors.businessRule('No reply exists to edit')
    }
    
    // Check time limit for editing (7 days from reply)
    const daysSinceReply = (Date.now() - review.repliedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceReply > 7) {
      throw Errors.businessRule('Replies can only be edited within 7 days')
    }
    
    // Update reply
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        reply: sanitizeText(reply),
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    })
    
    return NextResponse.json(updatedReview)
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to update reply')
  }
}


