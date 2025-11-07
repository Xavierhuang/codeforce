import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { targetUserId, taskId, rating, comment } = body

    if (!targetUserId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Valid target user ID and rating (1-5) are required' },
        { status: 400 }
      )
    }

    // Verify the task exists and user was involved
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Verify user was involved in the task (either client or worker)
    if (task.clientId !== user.id && task.workerId !== user.id) {
      return NextResponse.json(
        { error: 'You can only review users involved in this task' },
        { status: 403 }
      )
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

    // Check if review already exists
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

    // Create review
    const review = await prisma.review.create({
      data: {
        reviewerId: user.id,
        targetUserId,
        taskId,
        rating,
        comment: comment || null,
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

    // Update target user's rating
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        reviewsReceived: true,
      },
    })

    if (targetUser) {
      const totalRating = targetUser.reviewsReceived.reduce((sum: number, r: any) => sum + r.rating, 0)
      const newRating = totalRating / targetUser.reviewsReceived.length
      const ratingCount = targetUser.reviewsReceived.length

      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          rating: newRating,
          ratingCount,
        },
      })
    }

    return NextResponse.json(review, { status: 201 })
  } catch (error: any) {
    console.error('Error creating review:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')
    const reviewerId = searchParams.get('reviewerId')

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where: any = {}
    if (taskId) where.taskId = taskId
    if (reviewerId) where.reviewerId = reviewerId

    const reviews = await prisma.review.findMany({
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
    })

    return NextResponse.json(reviews)
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
