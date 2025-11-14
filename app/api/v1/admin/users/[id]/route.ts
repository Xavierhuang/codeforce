import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole('ADMIN')
    
    const userId = params.id

    // Fetch comprehensive user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        _count: {
          select: {
            tasksPosted: true,
            tasksAssigned: true,
            reviewsReceived: true,
            reviewsGiven: true,
            offers: true,
            notifications: true,
            buyerTransactions: true,
            workerTransactions: true,
            timeReports: true,
          },
        },
        tasksPosted: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            worker: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                offers: true,
                messages: true,
              },
            },
          },
        },
        tasksAssigned: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                offers: true,
                messages: true,
              },
            },
          },
        },
        reviewsReceived: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        reviewsGiven: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            targetUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        buyerTransactions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
            worker: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        workerTransactions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
            buyer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        timeReports: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        payoutRequests: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate additional stats
    const totalEarnings = user.role === 'WORKER'
      ? user.workerTransactions?.reduce((sum, t) => sum + (t.workerPayout || 0), 0) || 0
      : 0

    const totalSpent = user.role === 'CLIENT'
      ? user.buyerTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0
      : 0

    const averageRating = user.reviewsReceived?.length > 0
      ? user.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / user.reviewsReceived.length
      : 0

    return NextResponse.json({
      user: {
        ...user,
        totalEarnings,
        totalSpent,
        averageRating,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to fetch user details')
  }
}

