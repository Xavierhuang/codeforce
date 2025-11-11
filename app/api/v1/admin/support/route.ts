import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List all support tickets (admin only)
export async function GET(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN')
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const assignedTo = searchParams.get('assignedTo')

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (category) {
      where.category = category
    }

    if (priority) {
      where.priority = priority
    }

    if (assignedTo) {
      where.assignedTo = assignedTo === 'unassigned' ? null : assignedTo
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Get latest message for preview
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(tickets)
  } catch (error: any) {
    console.error('Error fetching admin support tickets:', error)
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


