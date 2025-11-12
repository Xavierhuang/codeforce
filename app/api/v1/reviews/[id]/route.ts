import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { validateBody, validateParams } from '@/lib/validation'
import { ReviewIdParamSchema } from '@/lib/validation-schemas'
import { sanitizeText } from '@/lib/sanitize'
import { handleApiError, Errors } from '@/lib/errors'
import { updateUserRating } from '@/lib/rating-calculator'
import { z } from 'zod'

const ReviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional().nullable(),
}).strict()

const EDIT_TIME_LIMIT_HOURS = 24

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
    
    // Fetch review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
    
    if (!review) {
      throw Errors.notFound('Review')
    }
    
    // Check ownership
    if (review.reviewerId !== user.id && user.role !== 'ADMIN') {
      throw Errors.forbidden('You can only edit your own reviews')
    }
    
    // Check time limit (24 hours) - admins can edit anytime
    if (user.role !== 'ADMIN') {
      const hoursSinceCreation = (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60)
      if (hoursSinceCreation > EDIT_TIME_LIMIT_HOURS) {
        throw Errors.businessRule(
          `Reviews can only be edited within ${EDIT_TIME_LIMIT_HOURS} hours of creation`
        )
      }
    }
    
    // Validate request body
    const validation = await validateBody(req, ReviewUpdateSchema)
    if (!validation.success) {
      return validation.response
    }
    
    const { rating, comment } = validation.data
    
    // Update review and recalculate rating atomically
    const updatedReview = await prisma.$transaction(async (tx) => {
      // Update review
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: {
          ...(rating !== undefined && { rating }),
          ...(comment !== undefined && { comment: comment ? sanitizeText(comment) : null }),
        },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      })
      
      // Recalculate target user's rating
      const ratingData = await tx.review.aggregate({
        where: { targetUserId: review.targetUserId },
        _avg: { rating: true },
        _count: { rating: true },
      })
      
      await tx.user.update({
        where: { id: review.targetUserId },
        data: {
          rating: ratingData._avg.rating ? Number(ratingData._avg.rating.toFixed(2)) : 0,
          ratingCount: ratingData._count.rating || 0,
        },
      })
      
      // Service-specific ratings not implemented - Review model doesn't have serviceName field
      
      return updated
    })
    
    return NextResponse.json(updatedReview)
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to update review')
  }
}

export async function DELETE(
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
    
    // Fetch review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    })
    
    if (!review) {
      throw Errors.notFound('Review')
    }
    
    // Check ownership
    if (review.reviewerId !== user.id && user.role !== 'ADMIN') {
      throw Errors.forbidden('You can only delete your own reviews')
    }
    
    // Delete review and recalculate rating atomically
    await prisma.$transaction(async (tx) => {
      // Delete review
      await tx.review.delete({
        where: { id: reviewId },
      })
      
      // Recalculate target user's rating
      const ratingData = await tx.review.aggregate({
        where: { targetUserId: review.targetUserId },
        _avg: { rating: true },
        _count: { rating: true },
      })
      
      await tx.user.update({
        where: { id: review.targetUserId },
        data: {
          rating: ratingData._avg.rating ? Number(ratingData._avg.rating.toFixed(2)) : 0,
          ratingCount: ratingData._count.rating || 0,
        },
      })
      
      // Service-specific ratings not implemented - Review model doesn't have serviceName field
    })
    
    return NextResponse.json({ message: 'Review deleted successfully' })
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to delete review')
  }
}

