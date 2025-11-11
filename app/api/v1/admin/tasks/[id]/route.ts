import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH - Update task
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireRole('ADMIN')
    const { id } = params
    const body = await req.json()
    const { title, description, price } = body

    const task = await prisma.task.findUnique({
      where: { id },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = price

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

    // Notify client and worker if task was updated
    if (task.clientId) {
      await prisma.notification.create({
        data: {
          userId: task.clientId,
          taskId: task.id,
          type: 'task_updated',
          message: `Task "${title || task.title}" has been updated by an admin.`,
        },
      })
    }

    if (task.workerId) {
      await prisma.notification.create({
        data: {
          userId: task.workerId,
          taskId: task.id,
          type: 'task_updated',
          message: `Task "${title || task.title}" has been updated by an admin.`,
        },
      })
    }

    return NextResponse.json(updatedTask)
  } catch (error: any) {
    console.error('Error updating task:', error)
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

// DELETE - Delete task
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireRole('ADMIN')
    const { id } = params

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

    // Notify users before deletion
    if (task.clientId) {
      await prisma.notification.create({
        data: {
          userId: task.clientId,
          type: 'task_deleted',
          message: `Task "${task.title}" has been deleted by an admin.`,
        },
      })
    }

    if (task.workerId) {
      await prisma.notification.create({
        data: {
          userId: task.workerId,
          type: 'task_deleted',
          message: `Task "${task.title}" has been deleted by an admin.`,
        },
      })
    }

    // Delete task (cascade will handle related records)
    await prisma.task.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting task:', error)
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


