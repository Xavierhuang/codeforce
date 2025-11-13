import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { z } from 'zod'

const TimeReportSchema = z.object({
  weekStartDate: z.string().datetime(),
  hoursWorked: z.number().positive().max(168), // Max 168 hours per week
  briefDescription: z.string().min(10).max(500),
  detailedDescription: z.string().max(2000).optional(),
  attachmentIds: z.array(z.string()).optional(),
})

/**
 * POST /api/v1/tasks/[id]/time-reports
 * Submit a weekly time report for a task
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const worker = await requireRole('WORKER')
    const taskId = params.id

    // Validate request body
    const body = await req.json()
    const validation = TimeReportSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { weekStartDate, hoursWorked, briefDescription, detailedDescription, attachmentIds } = validation.data

    // Get task and verify worker is assigned
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        worker: true,
        client: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.workerId !== worker.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (task.status !== 'ASSIGNED' && task.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Time reports can only be submitted for assigned or in-progress tasks' },
        { status: 400 }
      )
    }

    // Parse week start date (Monday)
    const weekStart = new Date(weekStartDate)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6) // Sunday
    weekEnd.setHours(23, 59, 59, 999) // Sunday 23:59:59 UTC

    // Validate deadline (must submit by Sunday 23:59 UTC)
    const now = new Date()
    if (now > weekEnd) {
      return NextResponse.json(
        { error: 'Time report deadline has passed. Reports must be submitted by Sunday 23:59 UTC' },
        { status: 400 }
      )
    }

    // Cannot submit for future weeks
    if (weekStart > now) {
      return NextResponse.json(
        { error: 'Cannot submit time reports for future weeks' },
        { status: 400 }
      )
    }

    // Check for duplicate submission
    const existingReport = await prisma.timeReport.findUnique({
      where: {
        taskId_weekStartDate: {
          taskId,
          weekStartDate: weekStart,
        },
      },
    })

    if (existingReport) {
      return NextResponse.json(
        { error: 'Time report for this week has already been submitted' },
        { status: 400 }
      )
    }

    // Validate weekly hour limit if set
    if (task.weeklyHourLimit && hoursWorked > task.weeklyHourLimit) {
      return NextResponse.json(
        { 
          error: `Hours worked (${hoursWorked}) exceeds weekly limit (${task.weeklyHourLimit} hours)` 
        },
        { status: 400 }
      )
    }

    // Verify attachments exist and belong to worker
    if (attachmentIds && attachmentIds.length > 0) {
      const attachments = await prisma.attachment.findMany({
        where: {
          id: { in: attachmentIds },
          uploadedBy: worker.id,
        },
      })

      if (attachments.length !== attachmentIds.length) {
        return NextResponse.json(
          { error: 'Some attachments not found or unauthorized' },
          { status: 400 }
        )
      }
    }

    // Create time report
    const timeReport = await prisma.timeReport.create({
      data: {
        taskId,
        workerId: worker.id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        hoursWorked,
        briefDescription,
        detailedDescription: detailedDescription || null,
        status: 'PENDING',
        attachments: attachmentIds && attachmentIds.length > 0
          ? {
              connect: attachmentIds.map(id => ({ id })),
            }
          : undefined,
      },
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
          },
        },
        attachments: true,
      },
    })

    // Notify buyer
    await createNotification(
      task.clientId,
      'time_report_submitted',
      `${worker.name} submitted a time report for "${task.title}" - ${hoursWorked} hours`,
      taskId
    )

    return NextResponse.json(timeReport, { status: 201 })
  } catch (error: any) {
    console.error('Error submitting time report:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/tasks/[id]/time-reports
 * Get all time reports for a task
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth() // Can be worker or client
    const taskId = params.id

    // Get task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify user has access (worker or client)
    if (task.workerId !== user.id && task.clientId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get time reports
    const timeReports = await prisma.timeReport.findMany({
      where: { taskId },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        attachments: true,
        weeklyPayment: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            workerPayout: true,
            processedAt: true,
          },
        },
      },
      orderBy: {
        weekStartDate: 'desc',
      },
    })

    return NextResponse.json({ timeReports })
  } catch (error: any) {
    console.error('Error fetching time reports:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

