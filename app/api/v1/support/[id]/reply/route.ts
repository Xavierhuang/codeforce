import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Reply to support ticket
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params
    const body = await req.json()
    const { message, attachments } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get ticket
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Users can only reply to their own tickets unless they're admin
    if (user.role !== 'ADMIN' && ticket.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Can't reply to closed tickets
    if (ticket.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Cannot reply to closed ticket' },
        { status: 400 }
      )
    }

    // Create message
    const supportMessage = await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        userId: user.id,
        message: message.trim(),
        isAdmin: user.role === 'ADMIN',
        attachments: attachments ? JSON.stringify(attachments) : undefined,
      },
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
    })

    // Update ticket status
    // If admin replies, set to IN_PROGRESS if it was OPEN
    // If user replies, set to OPEN if it was RESOLVED
    let newStatus = ticket.status
    if (user.role === 'ADMIN' && ticket.status === 'OPEN') {
      newStatus = 'IN_PROGRESS'
    } else if (user.role !== 'ADMIN' && ticket.status === 'RESOLVED') {
      newStatus = 'OPEN'
    }

    await prisma.supportTicket.update({
      where: { id },
      data: {
        status: newStatus,
        // Auto-assign to admin if not assigned and admin is replying
        assignedTo: user.role === 'ADMIN' && !ticket.assignedTo ? user.id : ticket.assignedTo,
      },
    })

    // TODO: Send notification to user if admin replied, or to admins if user replied

    return NextResponse.json(supportMessage, { status: 201 })
  } catch (error: any) {
    console.error('Error replying to support ticket:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

