import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { pusherServer, getPusherServerInstance } from '@/lib/pusher'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Check if Pusher is configured
    const server = getPusherServerInstance()
    if (!server) {
      console.error('Pusher auth: Pusher is not configured')
      return NextResponse.json(
        { error: 'Pusher is not configured' },
        { status: 503 }
      )
    }

    let user
    try {
      user = await requireAuth()
    } catch (authError: any) {
      console.error('Pusher auth: Authentication failed:', authError?.message)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const contentType = req.headers.get('content-type') || ''
    let socket_id: string | null = null
    let channel_name: string | null = null

    try {
      if (contentType.includes('application/json')) {
        const body = await req.json()
        socket_id = body?.socket_id ?? null
        channel_name = body?.channel_name ?? null
      } else {
        const rawBody = await req.text()
        const params = new URLSearchParams(rawBody)
        socket_id = params.get('socket_id')
        channel_name = params.get('channel_name')
      }
    } catch (bodyError: any) {
      console.error('Pusher auth: Error reading request body:', bodyError)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    if (!socket_id || !channel_name) {
      console.error('Pusher auth: Missing socket_id or channel_name', { socket_id, channel_name })
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
      
      try {
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
          console.error('Pusher auth: Task not found', { taskId })
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
          console.error('Pusher auth: User not authorized for task', { taskId, userId: user.id, clientId: task.clientId, workerId: task.workerId })
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      } catch (dbError: any) {
        console.error('Pusher auth: Database error checking task:', dbError)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }

    // Authorize the channel
    // For presence channels, include user info
    try {
      if (presenceTaskMatch) {
        const auth = server.authorizeChannel(socket_id, channel_name, {
          user_id: user.id,
          user_info: {
            name: user.name || 'User',
            avatarUrl: user.avatarUrl || '',
          },
        })
        return NextResponse.json(auth)
      } else {
        const auth = server.authorizeChannel(socket_id, channel_name)
        return NextResponse.json(auth)
      }
    } catch (authError: any) {
      console.error('Pusher auth: Error authorizing channel:', {
        error: authError?.message,
        socket_id,
        channel_name,
      })
      return NextResponse.json(
        { error: 'Failed to authorize channel' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Pusher auth error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
    })
    
    if (error?.message === 'Unauthorized' || error?.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Don't expose internal error details to client
    return NextResponse.json(
      { error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error?.message : undefined },
      { status: 500 }
    )
  }
}

