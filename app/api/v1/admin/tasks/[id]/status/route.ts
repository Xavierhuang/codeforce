import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireRole('ADMIN')
    const { id } = params
    const body = await req.json()
    const { status, adminNotes } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    const validStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        client: true,
        worker: true,
      },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    const updateData: any = {
      status: status as any,
    }

    // Set completedAt if status is COMPLETED
    if (status === 'COMPLETED' && !task.completedAt) {
      updateData.completedAt = new Date()
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // Notify users about status change
    const statusMessages: Record<string, string> = {
      OPEN: 'reopened',
      ASSIGNED: 'assigned',
      IN_PROGRESS: 'marked as in progress',
      COMPLETED: 'marked as completed',
      CANCELLED: 'cancelled',
      DISPUTED: 'marked as disputed',
    }

    const message = `Task "${task.title}" has been ${statusMessages[status] || 'updated'} by an admin.${adminNotes ? ` Note: ${adminNotes}` : ''}`

    if (task.clientId) {
      await prisma.notification.create({
        data: {
          userId: task.clientId,
          taskId: task.id,
          type: 'task_status_changed',
          message,
        },
      })
    }

    if (task.workerId) {
      await prisma.notification.create({
        data: {
          userId: task.workerId,
          taskId: task.id,
          type: 'task_status_changed',
          message,
        },
      })
    }

    return NextResponse.json(updatedTask)
  } catch (error: any) {
    console.error('Error updating task status:', error)
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


