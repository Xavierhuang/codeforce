import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const role = searchParams.get('role')

    const where: any = {}
    if (status) {
      where.verificationStatus = status
    }
    if (role) {
      where.role = role
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        _count: {
          select: {
            tasksPosted: true,
            tasksAssigned: true,
            reviewsReceived: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    })

    // Don't expose sensitive info
    const safeUsers = users.map((u: any) => ({
      ...u,
      hashedPassword: undefined,
      phone: u.phone ? '***' : null,
    }))

    return NextResponse.json(safeUsers)
  } catch (error: any) {
    console.error('Error fetching users:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

