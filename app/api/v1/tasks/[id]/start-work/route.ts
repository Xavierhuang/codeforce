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
      include: {
        worker: true,
        client: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.workerId !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned worker can start work on this task' },
        { status: 403 }
      )
    }

    if (task.status !== 'ASSIGNED') {
      return NextResponse.json(
        { error: `Task must be ASSIGNED to start work. Current status: ${task.status}` },
        { status: 400 }
      )
    }

    // Update task status to IN_PROGRESS
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        status: 'IN_PROGRESS',
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
    console.error('Error starting work:', error)
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}


