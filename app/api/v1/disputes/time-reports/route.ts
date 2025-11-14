import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/disputes/time-reports
 * Get all disputed time reports (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN')

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') // PENDING, RESOLVED

    const skip = (page - 1) * limit

    const where: any = {}
    
    // Filter by status if provided, otherwise show all (DISPUTED, APPROVED, REJECTED)
    if (status) {
      where.status = status
    } else {
      // Show all dispute-related statuses
      where.status = {
        in: ['DISPUTED', 'APPROVED', 'REJECTED'],
      }
    }

    const [disputedReports, total] = await Promise.all([
      prisma.timeReport.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              worker: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          worker: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          attachments: true,
        },
        orderBy: {
          submittedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.timeReport.count({ where }),
    ])

    return NextResponse.json({
      disputes: disputedReports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching disputes:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

