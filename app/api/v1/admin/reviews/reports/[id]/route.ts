import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { handleApiError, Errors } from '@/lib/errors'
import { validateBody, validateParams } from '@/lib/validation'
import { z } from 'zod'

const ReportIdParamSchema = z.object({
  id: z.string().min(1),
})

const ReviewReportUpdateSchema = z.object({
  status: z.enum(['REVIEWED', 'RESOLVED', 'DISMISSED']),
  action: z.enum(['FLAG_REVIEW', 'REJECT_REVIEW', 'NO_ACTION']).optional(),
}).strict()

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireRole('ADMIN')
    
    // Validate route parameters
    const paramValidation = validateParams(params, ReportIdParamSchema)
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid report ID',
          details: paramValidation.errors.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      )
    }
    
    const reportId = paramValidation.data.id
    
    // Validate request body
    const validation = await validateBody(req, ReviewReportUpdateSchema)
    if (!validation.success) {
      return validation.response
    }
    
    const { status, action } = validation.data
    
    // Fetch report
    const report = await prisma.reviewReport.findUnique({
      where: { id: reportId },
      include: {
        review: true,
      },
    })
    
    if (!report) {
      throw Errors.notFound('Review report')
    }
    
    // Update report status
    const updatedReport = await prisma.reviewReport.update({
      where: { id: reportId },
      data: {
        status,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
      include: {
        review: {
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
    
    // Handle action on review if specified
    if (action) {
      if (action === 'FLAG_REVIEW' || action === 'REJECT_REVIEW') {
        await prisma.review.update({
          where: { id: report.reviewId },
          data: {
            status: action === 'FLAG_REVIEW' ? 'FLAGGED' : 'REJECTED',
            moderatedBy: admin.id,
            moderatedAt: new Date(),
            moderationReason: `Reported: ${report.reason}`,
          },
        })
        
        // Recalculate ratings if review was rejected
        if (action === 'REJECT_REVIEW') {
          await prisma.$transaction(async (tx) => {
            const ratingData = await tx.review.aggregate({
              where: {
                targetUserId: report.review.targetUserId,
                status: 'APPROVED',
              },
              _avg: { rating: true },
              _count: { rating: true },
            })
            
            await tx.user.update({
              where: { id: report.review.targetUserId },
              data: {
                rating: ratingData._avg.rating ? Number(ratingData._avg.rating.toFixed(2)) : 0,
                ratingCount: ratingData._count.rating || 0,
              },
            })
            
            if (report.review.serviceName) {
              const serviceRatingData = await tx.review.aggregate({
                where: {
                  targetUserId: report.review.targetUserId,
                  serviceName: report.review.serviceName,
                  status: 'APPROVED',
                },
                _avg: { rating: true },
                _count: { rating: true },
              })
              
              await tx.workerService.updateMany({
                where: {
                  workerId: report.review.targetUserId,
                  skillName: report.review.serviceName,
                },
                data: {
                  rating: serviceRatingData._avg.rating ? Number(serviceRatingData._avg.rating.toFixed(2)) : 0,
                  ratingCount: serviceRatingData._count.rating || 0,
                },
              })
            }
          })
        }
      }
    }
    
    return NextResponse.json(updatedReport)
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to update review report')
  }
}


