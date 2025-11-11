import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { pusherServer } from '@/lib/pusher'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { socket_id, channel_name } = body

    if (!socket_id || !channel_name) {
      return NextResponse.json(
        { error: 'Missing socket_id or channel_name' },
        { status: 400 }
      )
    }

    // Validate channel name format
    // Allow: private-user-{userId}, private-task-{taskId}, presence-task-{taskId}
    const privateUserMatch = channel_name.match(/^private-user-(.+)$/)
    const privateTaskMatch = channel_name.match(/^private-task-(.+)$/)
    const presenceTaskMatch = channel_name.match(/^presence-task-(.+)$/)

    // Authorize private-user-{userId} channels (user can only subscribe to their own)
    if (privateUserMatch) {
      const channelUserId = privateUserMatch[1]
      if (channelUserId !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }

    // Authorize private-task-{taskId} and presence-task-{taskId} channels
    // User must be a participant in the task
    if (privateTaskMatch || presenceTaskMatch) {
      const taskId = privateTaskMatch?.[1] || presenceTaskMatch?.[1]
      
      // Check if user is a participant in this task
      const { prisma } = await import('@/lib/prisma')
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          clientId: true,
          workerId: true,
        },
      })

      if (!task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }

      // Allow if user is client, worker, or admin
      if (
        task.clientId !== user.id &&
        task.workerId !== user.id &&
        user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }

    // Authorize the channel
    // For presence channels, include user info
    if (presenceTaskMatch) {
      const auth = pusherServer.authorizeChannel(socket_id, channel_name, {
        user_id: user.id,
        user_info: {
          name: user.name || 'User',
          avatarUrl: user.avatarUrl || '',
        },
      })
      return NextResponse.json(auth)
    } else {
      const auth = pusherServer.authorizeChannel(socket_id, channel_name)
      return NextResponse.json(auth)
    }
  } catch (error: any) {
    console.error('Pusher auth error:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

