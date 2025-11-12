import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { handleApiError, Errors } from '@/lib/errors'
import { validateBody, validateParams } from '@/lib/validation'
import { ReviewIdParamSchema } from '@/lib/validation-schemas'
import { sanitizeText } from '@/lib/sanitize'
import { z } from 'zod'
import { notifyAdmins } from '@/lib/notifications'

const ReviewReportSchema = z.object({
  reason: z.enum(['SPAM', 'INAPPROPRIATE', 'FAKE', 'HARASSMENT', 'OTHER']),
  description: z.string().max(1000).optional().nullable(),
}).strict()

const AUTO_FLAG_THRESHOLD = 3 // Auto-flag review after 3 reports

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
    const validation = await validateBody(req, ReviewReportSchema)
    if (!validation.success) {
      return validation.response
    }
    
    const { reason, description } = validation.data
    
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
        targetUser: {
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
    
    // Prevent self-reporting (reviewer can't report their own review)
    if (review.reviewerId === user.id) {
      throw Errors.businessRule('You cannot report your own review')
    }
    
    // Review reports feature not implemented - ReviewReport model doesn't exist in schema
    // Notify admins about the report attempt
    await notifyAdmins(
      'review_received',
      `Review reported (manual): ${reason} - Review ID: ${reviewId}${description ? ` - ${description}` : ''}`,
      review.taskId || undefined
    )
    
    return NextResponse.json(
      { 
        message: 'Report received (feature not fully implemented)',
        reviewId,
        reason,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to report review')
  }
}


