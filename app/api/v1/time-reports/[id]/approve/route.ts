import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

/**
 * POST /api/v1/time-reports/[id]/approve
 * Approve a time report (buyer only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const buyer = await requireRole('CLIENT')
    const timeReportId = params.id

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

    // Update time report status
    const updatedReport = await prisma.timeReport.update({
      where: { id: timeReportId },
      data: {
        status: 'APPROVED',
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
      'time_report_approved',
      `Your time report for "${timeReport.task.title}" has been approved`,
      timeReport.taskId
    )

    return NextResponse.json({
      message: 'Time report approved',
      timeReport: updatedReport,
    })
  } catch (error: any) {
    console.error('Error approving time report:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


