import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { handleApiError, Errors } from '@/lib/errors'
import { validateBody, validateParams } from '@/lib/validation'
import { z } from 'zod'
import { ReviewIdParamSchema } from '@/lib/validation-schemas'

const ReviewModerationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'FLAGGED']),
  reason: z.string().max(500).optional().nullable(),
}).strict()

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireRole('ADMIN')
    
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
    const validation = await validateBody(req, ReviewModerationSchema)
    if (!validation.success) {
      return validation.response
    }
    
    const { status, reason } = validation.data
    
    // Fetch review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    })
    
    if (!review) {
      throw Errors.notFound('Review')
    }
    
    // Note: Review model doesn't have status/moderation fields in the current schema
    // This endpoint is a placeholder for future moderation functionality
    // To enable moderation, add these fields to the Review model:
    //   status ReviewStatus @default(PENDING)
    //   moderatedBy String?
    //   moderatedAt DateTime?
    //   moderationReason String?
    
    // For now, just return the review as-is
    const updatedReview = await prisma.review.findUnique({
      where: { id: reviewId },
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
    
    return NextResponse.json({
      ...updatedReview,
      moderationNote: 'Review moderation fields not yet implemented in schema',
    })
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to moderate review')
  }
}
