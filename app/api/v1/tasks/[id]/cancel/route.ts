import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { createNotification, checkAndSendOfflineNotification } from '@/lib/notifications'
import { triggerMessageEvent } from '@/lib/pusher'

/**
 * PATCH /api/v1/tasks/:id/cancel
 * Cancels a task and notifies both parties
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        worker: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only client or worker can cancel
    if (task.clientId !== user.id && task.workerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update task status
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
      include: {
        client: true,
        worker: true,
      },
    })

    // Create notifications
    const notifications = []
    if (task.workerId) {
      notifications.push(
        createNotification(
          task.workerId,
          'task_cancelled',
          `Task "${task.title}" has been cancelled`,
          task.id
        )
      )
    }
    if (task.clientId !== user.id) {
      notifications.push(
        createNotification(
          task.clientId,
          'task_cancelled',
          `Task "${task.title}" has been cancelled`,
          task.id
        )
      )
    }
    await Promise.all(notifications)

    // Send SMS to offline users
    const smsPromises = []
    if (task.workerId && task.worker?.phone && task.workerId !== user.id) {
      smsPromises.push(
        checkAndSendOfflineNotification(
          task.workerId,
          task.worker.name || 'Worker',
          task.worker.phone,
          `task "${task.title}" has been cancelled on Skilly.com`,
          task.id
        )
      )
    }
    if (task.clientId !== user.id && task.client?.phone) {
      smsPromises.push(
        checkAndSendOfflineNotification(
          task.clientId,
          task.client.name || 'Client',
          task.client.phone,
          `task "${task.title}" has been cancelled on Skilly.com`,
          task.id
        )
      )
    }
    await Promise.all(smsPromises)

    // Emit Pusher event
    try {
      await triggerMessageEvent(`task-${task.id}`, {
        type: 'task_cancelled',
        taskId: task.id,
        message: 'Task has been cancelled',
      })
    } catch (error) {
      console.error('Failed to trigger Pusher event:', error)
    }

    return NextResponse.json(updatedTask)
  } catch (error: any) {
    console.error('Error cancelling task:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
