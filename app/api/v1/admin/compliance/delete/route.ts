import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN')
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
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
        { error: 'Cannot delete admin accounts' },
        { status: 403 }
      )
    }

    // Delete user (cascade will handle related records)
    // Note: Prisma will cascade delete:
    // - Tasks (both posted and assigned)
    // - Messages
    // - Reviews
    // - Support tickets
    // - Payout requests
    // - Notifications
    // - Skills
    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({
      message: 'User account and all associated data deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting user account:', error)
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


