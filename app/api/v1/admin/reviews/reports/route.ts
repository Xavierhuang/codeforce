import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { validateSearchParams } from '@/lib/validation'
import { z } from 'zod'

const ReviewReportsQuerySchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']).optional(),
  reviewId: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
}).strict()

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN')
    
    const { searchParams } = new URL(req.url)
    
    // Validate query parameters
    const queryValidation = validateSearchParams(searchParams, ReviewReportsQuerySchema)
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
    
    const { status, reviewId, page, limit } = queryValidation.data
    
    const where: any = {}
    if (status) where.status = status
    if (reviewId) where.reviewId = reviewId
    
    const skip = (page - 1) * limit
    
    const [reports, total] = await Promise.all([
      prisma.reviewReport.findMany({
        where,
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
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.reviewReport.count({ where }),
    ])
    
    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to fetch review reports')
  }
}


