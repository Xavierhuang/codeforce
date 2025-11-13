import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/v1/tasks/[id]/mid-project-review-eligibility
 * Check eligibility for mid-project review
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const taskId = params.id
    const { searchParams } = new URL(req.url)
    const targetUserId = searchParams.get('targetUserId')

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'targetUserId query parameter is required' },
        { status: 400 }
      )
    }

    // Get task with time reports
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
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify user has access
    if (task.clientId !== user.id && task.workerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only allow for IN_PROGRESS tasks
    if (task.status !== 'IN_PROGRESS') {
      return NextResponse.json({
        eligibility: {
          eligible: false,
          weeksWorked: 0,
          totalHoursWorked: 0,
          requiredWeeks: 4,
          requiredHours: 10,
          approvedReports: 0,
          reason: 'Task must be IN_PROGRESS for mid-project reviews',
        },
      })
    }

    // Calculate eligibility
    const approvedReports = task.timeReports || []
    const uniqueWeeks = new Set(
      approvedReports.map(r => r.weekStartDate.toISOString().split('T')[0])
    ).size
    const totalHours = approvedReports.reduce((sum, r) => sum + r.hoursWorked, 0)

    const eligible = uniqueWeeks >= 4 && totalHours >= 10

    // Check if mid-project review already exists
    const existingReview = await prisma.review.findFirst({
      where: {
        taskId,
        isMidProjectReview: true,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      eligibility: {
        eligible,
        weeksWorked: uniqueWeeks,
        totalHoursWorked: totalHours,
        requiredWeeks: 4,
        requiredHours: 10,
        approvedReports: approvedReports.length,
        existingMidProjectReview: existingReview || undefined,
      },
    })
  } catch (error: any) {
    console.error('Error checking mid-project review eligibility:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


