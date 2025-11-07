import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { triggerMessageEvent } from '@/lib/pusher'

export async function GET(
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

    // Only task participants can see messages
    if (
      task.clientId !== user.id &&
      task.workerId !== user.id &&
      user.role !== 'ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const messages = await prisma.message.findMany({
      where: { taskId: params.id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        attachments: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json(messages)
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { content, attachmentIds } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

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

    // Only task participants can send messages
    if (
      task.clientId !== user.id &&
      task.workerId !== user.id &&
      user.role !== 'ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Determine receiver (the other participant)
    const receiverId = user.id === task.clientId ? task.workerId : task.clientId

    const message = await prisma.message.create({
      data: {
        taskId: params.id,
        senderId: user.id,
        receiverId: receiverId || undefined,
        content: content.trim(),
        attachments: attachmentIds
          ? {
              connect: attachmentIds.map((id: string) => ({ id })),
            }
          : undefined,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        attachments: true,
      },
    })

    // Trigger Pusher event for real-time updates
    try {
      await triggerMessageEvent(params.id, message)
    } catch (error) {
      console.error('Failed to trigger Pusher event:', error)
      // Don't fail the request if Pusher fails
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error: any) {
    console.error('Error creating message:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

