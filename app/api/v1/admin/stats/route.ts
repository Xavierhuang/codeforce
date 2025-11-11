import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get statistics
    const [
      totalUsers,
      clientCount,
      workerCount,
      verifiedWorkers,
      totalTasks,
      openTasks,
      inProgressTasks,
      completedTasks,
      pendingVerifications,
      totalPayouts,
      newUsersToday,
      activeTasks,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.user.count({ where: { role: 'WORKER' } }),
      prisma.user.count({ where: { role: 'WORKER', verificationStatus: 'VERIFIED' } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'OPEN' } }),
      prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.user.count({
        where: {
          role: 'WORKER',
          verificationStatus: 'PENDING',
        },
      }),
      prisma.payout.aggregate({
        _sum: {
          fee: true,
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.task.count({
        where: {
          status: {
            in: ['ASSIGNED', 'IN_PROGRESS'],
          },
        },
      }),
    ])

    const platformRevenue = totalPayouts._sum.fee || 0

    return NextResponse.json({
      totalUsers,
      clientCount,
      workerCount,
      verifiedWorkers,
      totalTasks,
      openTasks,
      inProgressTasks,
      completedTasks,
      activeTasks,
      pendingVerifications,
      platformRevenue,
      totalRevenue: platformRevenue, // Alias for compatibility
      newUsersToday,
    })
  } catch (error: any) {
    console.error('Error fetching stats:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

