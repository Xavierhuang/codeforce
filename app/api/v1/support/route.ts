import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List user's support tickets
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: any = {
      userId: user.id,
    }

    if (status) {
      where.status = status
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          take: 1, // Get first message for preview
        },
        assignedAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(tickets)
  } catch (error: any) {
    console.error('Error fetching support tickets:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new support ticket
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { category, subject, description, attachments } = body

    if (!category || !subject || !description) {
      return NextResponse.json(
        { error: 'Category, subject, and description are required' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = [
      'GENERAL_SUPPORT',
      'TECHNICAL_ISSUE',
      'ACCOUNT_ISSUE',
      'REPORT_USER',
      'REPORT_TASK',
      'PAYMENT_ISSUE',
      'VERIFICATION',
      'OTHER',
    ]

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    // Create ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        category,
        subject,
        description,
        priority: category === 'PAYMENT_ISSUE' || category === 'REPORT_USER' ? 'HIGH' : 'MEDIUM',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Create initial message
    await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        userId: user.id,
        message: description,
        isAdmin: false,
        attachments: attachments ? JSON.stringify(attachments) : undefined,
      },
    })

    // TODO: Send notification to admins about new support ticket

    return NextResponse.json(ticket, { status: 201 })
  } catch (error: any) {
    console.error('Error creating support ticket:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

