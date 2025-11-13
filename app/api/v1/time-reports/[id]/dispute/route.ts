import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { z } from 'zod'

const DisputeSchema = z.object({
  reason: z.string().min(10).max(500),
  disputedHours: z.number().positive().optional(), // Optional: buyer can dispute specific hours
})

/**
 * POST /api/v1/time-reports/[id]/dispute
 * Dispute a time report (buyer only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const buyer = await requireRole('CLIENT')
    const timeReportId = params.id

    // Validate request body
    const body = await req.json()
    const validation = DisputeSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { reason, disputedHours } = validation.data

    // Get time report with task details
    const timeReport = await prisma.timeReport.findUnique({
      where: { id: timeReportId },
      include: {
        task: {
          include: {
            client: true,
            worker: true,
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
    })

    if (!timeReport) {
      return NextResponse.json({ error: 'Time report not found' }, { status: 404 })
    }

    // Verify buyer owns the task
    if (timeReport.task.clientId !== buyer.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify status is PENDING
    if (timeReport.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Time report is already ${timeReport.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Validate disputed hours if provided
    if (disputedHours && disputedHours >= timeReport.hoursWorked) {
      return NextResponse.json(
        { error: 'Disputed hours must be less than reported hours' },
        { status: 400 }
      )
    }

    // Update time report status
    const updatedReport = await prisma.timeReport.update({
      where: { id: timeReportId },
      data: {
        status: 'DISPUTED',
        approvedAt: new Date(),
        approvedBy: buyer.id,
      },
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
    })

    // Notify worker
    await createNotification(
      timeReport.workerId,
      'time_report_disputed',
      `Your time report for "${timeReport.task.title}" has been disputed: ${reason}`,
      timeReport.taskId
    )

    // Notify admins about dispute for review
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    })

    for (const admin of admins) {
      await createNotification(
        admin.id,
        'time_report_disputed',
        `Time report disputed for task "${timeReport.task.title}" - Requires admin review`,
        timeReport.taskId
      )
    }

    return NextResponse.json({
      message: 'Time report disputed',
      timeReport: updatedReport,
    })
  } catch (error: any) {
    console.error('Error disputing time report:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

