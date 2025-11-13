import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { validateBody, validateSearchParams } from '@/lib/validation'
import { ReviewCreateSchema, ReviewQuerySchema } from '@/lib/validation-schemas'
import { sanitizeText } from '@/lib/sanitize'
import { handleApiError, Errors } from '@/lib/errors'
import { updateUserRating } from '@/lib/rating-calculator'
import { rateLimit, rateLimitConfigs } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Rate limiting for review creation
    const rateLimitResponse = await rateLimit(req, rateLimitConfigs.review, user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    // Validate request body
    const validation = await validateBody(req, ReviewCreateSchema)
    if (!validation.success) {
      return validation.response
    }
    
    const { targetUserId, taskId, rating, comment, serviceName } = validation.data

    // Verify the task exists and user was involved
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        timeReports: {
          where: {
            status: 'APPROVED',
          },
          select: {
            weekStartDate: true,
            hoursWorked: true,
          },
        },
      },
    })

    if (!task) {
      throw Errors.notFound('Task')
    }

    // Check if this is a mid-project review (IN_PROGRESS task)
    const isMidProjectReview = task.status === 'IN_PROGRESS'
    
    if (isMidProjectReview) {
      // Calculate eligibility for mid-project review
      // Requirements: 4 weeks + 10 hours minimum
      const approvedReports = task.timeReports || []
      
      if (approvedReports.length === 0) {
        return NextResponse.json(
          { 
            error: 'Mid-project reviews require at least 4 weeks and 10 hours of approved work',
            weeksWorked: 0,
            totalHoursWorked: 0,
          },
          { status: 400 }
        )
      }

      // Calculate unique weeks worked
      const uniqueWeeks = new Set(
        approvedReports.map(r => r.weekStartDate.toISOString().split('T')[0])
      ).size

      // Calculate total hours worked
      const totalHours = approvedReports.reduce((sum, r) => sum + r.hoursWorked, 0)

      // Check eligibility: minimum 4 weeks AND 10 hours
      if (uniqueWeeks < 4 || totalHours < 10) {
        return NextResponse.json(
          { 
            error: 'Mid-project reviews require at least 4 weeks and 10 hours of approved work',
            weeksWorked: uniqueWeeks,
            totalHoursWorked: totalHours,
            requiredWeeks: 4,
            requiredHours: 10,
          },
          { status: 400 }
        )
      }

      // Check if mid-project review already exists for this task
      const existingMidProjectReview = await prisma.review.findFirst({
        where: {
          taskId,
          isMidProjectReview: true,
        },
      })

      if (existingMidProjectReview) {
        return NextResponse.json(
          { error: 'A mid-project review has already been submitted for this task' },
          { status: 400 }
        )
      }
    } else if (task.status !== 'COMPLETED') {
      // For non-IN_PROGRESS tasks, only allow reviews for completed tasks
      return NextResponse.json(
        { 
          error: 'Reviews can only be submitted for completed tasks or in-progress tasks with sufficient work',
          taskStatus: task.status,
        },
        { status: 400 }
      )
    }

    // Verify user was involved in the task (either client or worker)
    if (task.clientId !== user.id && task.workerId !== user.id) {
      throw Errors.forbidden('You can only review users involved in this task')
    }

    // Verify target user was the other party in the task
    if (targetUserId !== task.clientId && targetUserId !== task.workerId) {
      return NextResponse.json(
        { error: 'Target user must be the other party in this task' },
        { status: 400 }
      )
    }

    // Prevent self-review
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'You cannot review yourself' },
        { status: 400 }
      )
    }

    // Check if review already exists (for non-mid-project reviews)
    if (!isMidProjectReview) {
      const existingReview = await prisma.review.findFirst({
        where: {
          reviewerId: user.id,
          targetUserId,
          taskId,
        },
      })

      if (existingReview) {
        return NextResponse.json(
          { error: 'You have already reviewed this user for this task' },
          { status: 400 }
        )
      }
    }

    // Calculate weeks and hours for mid-project reviews
    let weeksWorked: number | null = null
    let totalHoursWorked: number | null = null
    
    if (isMidProjectReview) {
      const approvedReports = task.timeReports || []
      const uniqueWeeks = new Set(
        approvedReports.map(r => r.weekStartDate.toISOString().split('T')[0])
      ).size
      const totalHours = approvedReports.reduce((sum, r) => sum + r.hoursWorked, 0)
      weeksWorked = uniqueWeeks
      totalHoursWorked = totalHours
    }

    // Create review and update rating atomically in a transaction
    const review = await prisma.$transaction(async (tx) => {
      // Create the review
      const newReview = await tx.review.create({
        data: {
          reviewerId: user.id,
          targetUserId,
          taskId,
          rating,
          comment: comment ? sanitizeText(comment) : null,
          isMidProjectReview,
          weeksWorked,
          totalHoursWorked,
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

      // Use database aggregation for atomic rating calculation
      // This prevents race conditions when multiple reviews are created simultaneously
      const ratingData = await tx.review.aggregate({
        where: {
          targetUserId,
        },
        _avg: { rating: true },
        _count: { rating: true },
      })

      // Update target user's rating atomically
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          rating: ratingData._avg.rating ? Number(ratingData._avg.rating.toFixed(2)) : 0,
          ratingCount: ratingData._count.rating || 0,
        },
      })

      // Service-specific ratings not implemented - Review model doesn't have serviceName field

      return newReview
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to create review')
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      throw Errors.unauthorized()
    }
    
    const { searchParams } = new URL(req.url)
    
    // Validate query parameters
    const queryValidation = validateSearchParams(searchParams, ReviewQuerySchema)
    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryValidation.errors.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      )
    }
    
    const { targetUserId, taskId, reviewerId, page, limit } = queryValidation.data
    
    const where: any = {
      targetUserId,
      status: 'APPROVED', // Only show approved reviews to users
    }
    if (taskId) where.taskId = taskId
    if (reviewerId) where.reviewerId = reviewerId

    const skip = (page - 1) * limit
    
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ])

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to fetch reviews')
  }
}
