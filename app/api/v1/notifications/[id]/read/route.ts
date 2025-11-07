import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/v1/notifications/[id]/read
 * Mark a notification as read
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const notification = await prisma.notification.update({
      where: {
        id: params.id,
        userId: user.id, // Ensure user owns the notification
      },
      data: {
        readStatus: true,
      },
    })

    return NextResponse.json(notification)
  } catch (error: any) {
    console.error('Error updating notification:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


