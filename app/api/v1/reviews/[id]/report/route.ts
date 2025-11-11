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
    
    // Check if user already reported this review
    const existingReport = await prisma.reviewReport.findUnique({
      where: {
        reviewId_reporterId: {
          reviewId,
          reporterId: user.id,
        },
      },
    })
    
    if (existingReport) {
      throw Errors.businessRule('You have already reported this review')
    }
    
    // Create report
    const report = await prisma.reviewReport.create({
      data: {
        reviewId,
        reporterId: user.id,
        reason,
        description: description ? sanitizeText(description) : null,
      },
      include: {
        review: {
          select: {
            id: true,
            rating: true,
            comment: true,
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
    
    // Count total reports for this review
    const reportCount = await prisma.reviewReport.count({
      where: {
        reviewId,
        status: 'PENDING',
      },
    })
    
    // Auto-flag review if threshold reached
    if (reportCount >= AUTO_FLAG_THRESHOLD) {
      await prisma.review.update({
        where: { id: reviewId },
        data: {
          status: 'FLAGGED',
          moderationReason: `Auto-flagged after ${reportCount} reports`,
        },
      })
      
      // Notify admins about auto-flagged review
      await notifyAdmins(
        'review_received',
        `Review auto-flagged: ${reportCount} reports received`,
        review.taskId || undefined
      )
    } else {
      // Notify admins about new report
      await notifyAdmins(
        'review_received',
        `Review reported: ${reason} - Review ID: ${reviewId}`,
        review.taskId || undefined
      )
    }
    
    return NextResponse.json(report, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to report review')
  }
}


