import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { z } from 'zod'

const ResolveSchema = z.object({
  resolution: z.enum(['APPROVE', 'REJECT', 'PARTIAL']),
  approvedHours: z.number().positive().optional(), // For PARTIAL resolution
  reason: z.string().min(10).max(500),
})

/**
 * POST /api/v1/disputes/time-reports/[id]/resolve
 * Admin resolves a disputed time report
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireRole('ADMIN')
    const timeReportId = params.id

    // Validate request body
    const body = await req.json()
    const validation = ResolveSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { resolution, approvedHours, reason } = validation.data

    // Get time report
    const timeReport = await prisma.timeReport.findUnique({
      where: { id: timeReportId },
      include: {
        task: {
          include: {
            client: true,
            worker: true,
          },
        },
      },
    })

    if (!timeReport) {
      return NextResponse.json({ error: 'Time report not found' }, { status: 404 })
    }

    if (timeReport.status !== 'DISPUTED') {
      return NextResponse.json(
        { error: 'Time report is not in disputed status' },
        { status: 400 }
      )
    }

    // Resolve dispute based on resolution type
    if (resolution === 'APPROVE') {
      // Approve all hours
      await prisma.timeReport.update({
        where: { id: timeReportId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: admin.id,
        },
      })

      // Notify both parties
      await createNotification(
        timeReport.workerId,
        'time_report_approved',
        `Your disputed time report has been approved by admin: ${reason}`,
        timeReport.taskId
      )

      await createNotification(
        timeReport.task.clientId,
        'time_report_approved',
        `Disputed time report has been approved by admin: ${reason}`,
        timeReport.taskId
      )
    } else if (resolution === 'REJECT') {
      // Reject all hours
      await prisma.timeReport.update({
        where: { id: timeReportId },
        data: {
          status: 'REJECTED',
          approvedAt: new Date(),
          approvedBy: admin.id,
        },
      })

      // Notify both parties
      await createNotification(
        timeReport.workerId,
        'time_report_rejected',
        `Your disputed time report has been rejected by admin: ${reason}`,
        timeReport.taskId
      )

      await createNotification(
        timeReport.task.clientId,
        'time_report_rejected',
        `Disputed time report has been rejected by admin: ${reason}`,
        timeReport.taskId
      )
    } else if (resolution === 'PARTIAL') {
      // Partial approval - adjust hours
      if (!approvedHours || approvedHours >= timeReport.hoursWorked) {
        return NextResponse.json(
          { error: 'Approved hours must be less than reported hours for partial resolution' },
          { status: 400 }
        )
      }

      // Create a new time report with adjusted hours
      const adjustedReport = await prisma.timeReport.create({
        data: {
          taskId: timeReport.taskId,
          workerId: timeReport.workerId,
          weekStartDate: timeReport.weekStartDate,
          weekEndDate: timeReport.weekEndDate,
          hoursWorked: approvedHours,
          briefDescription: `${timeReport.briefDescription} (Adjusted from ${timeReport.hoursWorked}h by admin)`,
          detailedDescription: timeReport.detailedDescription,
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: admin.id,
        },
      })

      // Mark original as rejected
      await prisma.timeReport.update({
        where: { id: timeReportId },
        data: {
          status: 'REJECTED',
          approvedAt: new Date(),
          approvedBy: admin.id,
        },
      })

      // Notify both parties
      await createNotification(
        timeReport.workerId,
        'time_report_approved',
        `Your disputed time report has been partially approved: ${approvedHours}h approved (from ${timeReport.hoursWorked}h). Reason: ${reason}`,
        timeReport.taskId
      )

      await createNotification(
        timeReport.task.clientId,
        'time_report_approved',
        `Disputed time report partially approved: ${approvedHours}h approved (from ${timeReport.hoursWorked}h). Reason: ${reason}`,
        timeReport.taskId
      )
    }

    return NextResponse.json({
      message: 'Dispute resolved successfully',
      resolution,
      timeReportId,
    })
  } catch (error: any) {
    console.error('Error resolving dispute:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


