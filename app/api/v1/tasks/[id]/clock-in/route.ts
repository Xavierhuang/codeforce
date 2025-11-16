import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const task = await prisma.task.findUnique({
      where: { id: params.id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.workerId !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned worker can clock in' },
        { status: 403 }
      )
    }

    if (task.status !== 'ASSIGNED' && task.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Task must be ASSIGNED or IN_PROGRESS to clock in' },
        { status: 400 }
      )
    }

    if (task.clockInTime && !task.clockOutTime) {
      return NextResponse.json(
        { error: 'Already clocked in. Please clock out first.' },
        { status: 400 }
      )
    }

    // Update task with clock in time and set status to IN_PROGRESS if not already
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        clockInTime: new Date(),
        status: task.status === 'ASSIGNED' ? 'IN_PROGRESS' : task.status,
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            offers: true,
            messages: true,
          },
        },
      },
    })

    return NextResponse.json(updatedTask)
  } catch (error: any) {
    console.error('Error clocking in:', error)
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}






