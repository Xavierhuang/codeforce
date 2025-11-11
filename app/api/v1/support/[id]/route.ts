import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Get specific ticket with all messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
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
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Users can only view their own tickets unless they're admin
    if (user.role !== 'ADMIN' && ticket.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(ticket)
  } catch (error: any) {
    console.error('Error fetching support ticket:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


