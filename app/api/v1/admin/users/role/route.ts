import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN')
    const body = await req.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId and role are required' },
        { status: 400 }
      )
    }

    if (!['CLIENT', 'WORKER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be CLIENT or WORKER' },
        { status: 400 }
      )
    }

    // Don't allow changing admin roles
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
        { error: 'Cannot change admin role' },
        { status: 403 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role as 'CLIENT' | 'WORKER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    // Send notification to user
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'role_changed',
        message: `Your account role has been changed to ${role}.`,
      },
    })

    return NextResponse.json({
      message: `User role updated to ${role}`,
      user: updatedUser,
    })
  } catch (error: any) {
    console.error('Error updating user role:', error)
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


