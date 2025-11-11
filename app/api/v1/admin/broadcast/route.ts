import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { createNotifications } from '@/lib/notifications'
import { pusherServer } from '@/lib/pusher'

export const dynamic = 'force-dynamic'

// POST - Send broadcast message to all users
export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN')
    const body = await req.json()
    const { message, targetRole } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get all users (or filter by role if specified)
    const whereClause = targetRole ? { role: targetRole } : {}
    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true },
    })

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No users found to send message to' },
        { status: 400 }
      )
    }

    const userIds = users.map((user) => user.id)

    // Create notifications for all users
    await createNotifications(
      userIds,
      'platform_announcement',
      message.trim()
    )

    // Trigger Pusher events for real-time notifications
    try {
      // Trigger notification events for each user's private channel
      await Promise.all(
        userIds.map((userId) =>
          pusherServer.trigger(`private-user-${userId}`, 'notification', {
            type: 'platform_announcement',
            message: message.trim(),
            createdAt: new Date().toISOString(),
          })
        )
      )
    } catch (pusherError) {
      console.error('Failed to trigger Pusher events for broadcast:', pusherError)
      // Don't fail the request if Pusher fails
    }

    return NextResponse.json({
      success: true,
      message: `Broadcast sent to ${users.length} user(s)`,
      count: users.length,
    })
  } catch (error: unknown) {
    // Log error details without circular references
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorName = error instanceof Error ? error.name : 'Error'
    
    console.error('Error sending broadcast:', {
      message: errorMessage,
      name: errorName,
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

