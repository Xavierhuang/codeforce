import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN')
    const body = await req.json()
    const { userId, reason, duration } = body

    if (!userId || !reason) {
      return NextResponse.json(
        { error: 'userId and reason are required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot suspend admin accounts' },
        { status: 403 }
      )
    }

    // Calculate suspension end date
    let suspendedUntil: Date | null = null
    if (duration) {
      const days = parseInt(duration)
      if (!isNaN(days) && days > 0) {
        suspendedUntil = new Date()
        suspendedUntil.setDate(suspendedUntil.getDate() + days)
      }
    }

    // Update user with suspension details
    await prisma.user.update({
      where: { id: userId },
      data: {
        suspendedUntil,
        suspensionReason: reason,
      },
    })
    
    // Send notification to user
    const durationText = duration 
      ? `Your account has been suspended for ${duration} day${parseInt(duration) !== 1 ? 's' : ''}.`
      : 'Your account has been permanently suspended.'
    
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'account_suspended',
        message: `${durationText} Reason: ${reason}`,
      },
    })

    return NextResponse.json({
      message: `User suspended ${duration ? `for ${duration} days` : 'permanently'}`,
      suspendedUntil: suspendedUntil?.toISOString() || null,
    })
  } catch (error: any) {
    console.error('Error suspending user:', error)
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


