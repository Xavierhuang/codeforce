import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Close support ticket (user can close their own tickets)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Users can only close their own tickets unless they're admin
    if (user.role !== 'ADMIN' && ticket.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Can't close already closed tickets
    if (ticket.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Ticket is already closed' },
        { status: 400 }
      )
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    })

    return NextResponse.json(updatedTicket)
  } catch (error: any) {
    console.error('Error closing support ticket:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


