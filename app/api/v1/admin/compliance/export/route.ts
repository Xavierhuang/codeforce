import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN')
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        reviewsReceived: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        reviewsGiven: {
          include: {
            targetUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        tasksPosted: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        tasksAssigned: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        supportTickets: {
          include: {
            messages: true,
          },
        },
        payoutRequests: true,
        payouts: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Remove sensitive data
    const { hashedPassword, ...userData } = user

    // Format data for export
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone ? '***' : null, // Mask phone for privacy
        role: userData.role,
        bio: userData.bio,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      },
      skills: userData.skills,
      reviewsReceived: userData.reviewsReceived,
      reviewsGiven: userData.reviewsGiven,
      tasksPosted: userData.tasksPosted,
      tasksAssigned: userData.tasksAssigned,
      supportTickets: userData.supportTickets,
      payoutRequests: userData.payoutRequests,
      payouts: userData.payouts,
    }

    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="user-data-${userId}.json"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting user data:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


