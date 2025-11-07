import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()

    if (user.role !== 'WORKER') {
      return NextResponse.json(
        { error: 'Only workers can access this endpoint' },
        { status: 403 }
      )
    }

    // Get all tasks for this worker
    const tasks = await prisma.task.findMany({
      where: {
        workerId: user.id,
      },
      include: {
        client: {
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
    })

    // Calculate stats
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length
    const assignedTasks = tasks.filter(t => t.status === 'ASSIGNED').length
    const openTasks = tasks.filter(t => t.status === 'OPEN').length

    // Calculate total earnings from completed tasks
    const completedTasksWithPrice = tasks.filter(t => t.status === 'COMPLETED' && t.price)
    const totalEarnings = completedTasksWithPrice.reduce((sum, task) => sum + (task.price || 0), 0)

    // Get pending payout requests
    const pendingPayouts = await prisma.payoutRequest.findMany({
      where: {
        workerId: user.id,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const pendingPayoutAmount = pendingPayouts.reduce((sum, req) => sum + req.amount, 0)

    // Get recent completed tasks (last 5)
    const recentCompleted = tasks
      .filter(t => t.status === 'COMPLETED')
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        title: t.title,
        completedAt: t.completedAt,
        price: t.price,
      }))

    // Calculate average rating from reviews
    const reviews = await prisma.review.findMany({
      where: {
        targetUserId: user.id,
      },
    })

    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

    // Get tasks by status for this month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthTasks = tasks.filter(t => t.createdAt >= startOfMonth)
    const thisMonthCompleted = thisMonthTasks.filter(t => t.status === 'COMPLETED').length
    const thisMonthEarnings = thisMonthTasks
      .filter(t => t.status === 'COMPLETED' && t.price)
      .reduce((sum, task) => sum + (task.price || 0), 0)

    // Get offers count
    const offersCount = await prisma.offer.count({
      where: {
        workerId: user.id,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        assignedTasks,
        openTasks,
        totalEarnings,
        walletBalance: user.walletBalance,
        pendingPayoutAmount,
        averageRating,
        ratingCount: reviews.length,
        thisMonthCompleted,
        thisMonthEarnings,
        pendingOffers: offersCount,
      },
      recentCompleted,
    })
  } catch (error: any) {
    console.error('Error fetching worker stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

