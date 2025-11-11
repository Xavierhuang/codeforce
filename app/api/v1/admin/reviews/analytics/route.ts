import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { validateSearchParams } from '@/lib/validation'
import { z } from 'zod'

const ReviewAnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  serviceName: z.string().optional(),
}).strict()

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN')
    
    const { searchParams } = new URL(req.url)
    
    // Validate query parameters
    const queryValidation = validateSearchParams(searchParams, ReviewAnalyticsQuerySchema)
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
    
    const { startDate, endDate, serviceName } = queryValidation.data
    
    // Build where clause
    const where: any = {
      status: 'APPROVED',
    }
    
    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) }
    }
    
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) }
    }
    
    if (serviceName) {
      where.serviceName = serviceName
    }
    
    // Get all reviews for analytics
    const reviews = await prisma.review.findMany({
      where,
      select: {
        id: true,
        rating: true,
        createdAt: true,
        serviceName: true,
        targetUserId: true,
        reviewerId: true,
        comment: true,
        reply: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    
    // Calculate analytics
    const totalReviews = reviews.length
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0
    
    // Rating distribution
    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    }
    
    // Reviews with comments
    const reviewsWithComments = reviews.filter(r => r.comment && r.comment.trim().length > 0).length
    const commentRate = totalReviews > 0 ? (reviewsWithComments / totalReviews) * 100 : 0
    
    // Reviews with replies
    const reviewsWithReplies = reviews.filter(r => r.reply && r.reply.trim().length > 0).length
    const replyRate = totalReviews > 0 ? (reviewsWithReplies / totalReviews) * 100 : 0
    
    // Reviews by service (if not filtering by service)
    const reviewsByService: Record<string, { count: number; avgRating: number }> = {}
    if (!serviceName) {
      reviews.forEach(review => {
        const service = review.serviceName || 'General'
        if (!reviewsByService[service]) {
          reviewsByService[service] = { count: 0, avgRating: 0, totalRating: 0 }
        }
        reviewsByService[service].count++
        reviewsByService[service].totalRating = (reviewsByService[service].totalRating || 0) + review.rating
      })
      
      // Calculate averages
      Object.keys(reviewsByService).forEach(service => {
        const data = reviewsByService[service]
        reviewsByService[service] = {
          count: data.count,
          avgRating: data.totalRating / data.count,
        }
        delete (reviewsByService[service] as any).totalRating
      })
    }
    
    // Reviews over time (last 12 months)
    const now = new Date()
    const monthsData: Record<string, { count: number; avgRating: number }> = {}
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
      monthsData[monthKey] = { count: 0, avgRating: 0, totalRating: 0 }
    }
    
    reviews.forEach(review => {
      const reviewDate = new Date(review.createdAt)
      const monthKey = `${reviewDate.getFullYear()}-${String(reviewDate.getMonth() + 1).padStart(2, '0')}`
      if (monthsData[monthKey]) {
        monthsData[monthKey].count++
        monthsData[monthKey].totalRating = (monthsData[monthKey].totalRating || 0) + review.rating
      }
    })
    
    // Calculate averages for months
    Object.keys(monthsData).forEach(month => {
      const data = monthsData[month]
      if (data.count > 0) {
        monthsData[month] = {
          count: data.count,
          avgRating: data.totalRating / data.count,
        }
      } else {
        monthsData[month] = {
          count: 0,
          avgRating: 0,
        }
      }
      delete (monthsData[month] as any).totalRating
    })
    
    // Unique reviewers and targets
    const uniqueReviewers = new Set(reviews.map(r => r.reviewerId)).size
    const uniqueTargets = new Set(reviews.map(r => r.targetUserId)).size
    
    return NextResponse.json({
      summary: {
        totalReviews,
        averageRating: Number(averageRating.toFixed(2)),
        ratingDistribution,
        commentRate: Number(commentRate.toFixed(2)),
        replyRate: Number(replyRate.toFixed(2)),
        uniqueReviewers,
        uniqueTargets,
      },
      byService: reviewsByService,
      overTime: monthsData,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to fetch review analytics')
  }
}


