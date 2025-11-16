import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN')
    const body = await req.json()
    const { userId, status, reason } = body

    if (!userId || !status) {
      return NextResponse.json(
        { error: 'userId and status are required' },
        { status: 400 }
      )
    }

    if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be VERIFIED, REJECTED, or PENDING' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: status,
      },
      select: {
        id: true,
        email: true,
        name: true,
        verificationStatus: true,
      },
    })

    // Send notification to user about verification status change
    if (user) {
      // Get user role for personalized messages
      const fullUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
      
      const isBuyer = fullUser?.role === 'CLIENT'
      
      let notificationMessage = ''
      if (status === 'VERIFIED') {
        notificationMessage = isBuyer
          ? 'Your verification has been approved! You can now book experts and hire talent.'
          : 'Your verification has been approved! You can now receive task invitations.'
      } else if (status === 'REJECTED') {
        notificationMessage = reason 
          ? `Your verification was rejected: ${reason}`
          : 'Your verification was rejected. Please review your profile and resubmit.'
      } else if (status === 'PENDING') {
        notificationMessage = 'Your verification status has been reset to pending. Please wait for admin review.'
      }

      if (notificationMessage) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'verification_status_changed',
            message: notificationMessage,
          },
        })
      }
    }

    return NextResponse.json({
      message: `User verification status updated to ${status}`,
      user,
    })
  } catch (error: any) {
    console.error('Error updating verification status:', error)
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

