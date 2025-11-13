import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/v1/tasks/[id]/weekly-payments
 * Get all weekly payments for a task
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
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

    // Get weekly payments
    const weeklyPayments = await prisma.weeklyPayment.findMany({
      where: { taskId },
      include: {
        timeReport: {
          select: {
            id: true,
            briefDescription: true,
            status: true,
          },
        },
        transaction: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        weekStartDate: 'desc',
      },
    })

    return NextResponse.json({ payments: weeklyPayments })
  } catch (error: any) {
    console.error('Error fetching weekly payments:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


