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
        { error: 'Only the assigned worker can clock out' },
        { status: 403 }
      )
    }

    if (!task.clockInTime) {
      return NextResponse.json(
        { error: 'Must clock in before clocking out' },
        { status: 400 }
      )
    }

    if (task.clockOutTime) {
      return NextResponse.json(
        { error: 'Already clocked out' },
        { status: 400 }
      )
    }

    const clockOutTime = new Date()
    const timeWorkedMs = clockOutTime.getTime() - new Date(task.clockInTime).getTime()
    const timeWorkedMinutes = Math.floor(timeWorkedMs / (1000 * 60))
    
    // Add to existing total time if there was a previous session
    const previousTotalMinutes = task.totalTimeMinutes || 0
    const newTotalMinutes = previousTotalMinutes + timeWorkedMinutes

    // Update task with clock out time and total time
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        clockOutTime: clockOutTime,
        totalTimeMinutes: newTotalMinutes,
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

    return NextResponse.json({
      ...updatedTask,
      sessionTimeMinutes: timeWorkedMinutes,
      totalTimeMinutes: newTotalMinutes,
    })
  } catch (error: any) {
    console.error('Error clocking out:', error)
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}



