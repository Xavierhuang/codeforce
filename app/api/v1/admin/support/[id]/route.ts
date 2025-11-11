import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH - Update ticket status, priority, or assignment (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireRole('ADMIN')
    const { id } = params
    const body = await req.json()
    const { status, priority, assignedTo } = body

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}

    if (status) {
      const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        )
      }
      updateData.status = status

      // Set resolvedAt or closedAt timestamps
      if (status === 'RESOLVED' && !ticket.resolvedAt) {
        updateData.resolvedAt = new Date()
      }
      if (status === 'CLOSED' && !ticket.closedAt) {
        updateData.closedAt = new Date()
      }
    }

    if (priority) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: 'Invalid priority' },
          { status: 400 }
        )
      }
      updateData.priority = priority
    }

    if (assignedTo !== undefined) {
      // Can be null to unassign
      if (assignedTo === null || assignedTo === '') {
        updateData.assignedTo = null
      } else {
        // Verify the assigned user is an admin
        const assignedUser = await prisma.user.findUnique({
          where: { id: assignedTo },
        })
        if (!assignedUser || assignedUser.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Can only assign to admin users' },
            { status: 400 }
          )
        }
        updateData.assignedTo = assignedTo
      }
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: updateData,
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

    // TODO: Send notification to user if status changed

    return NextResponse.json(updatedTicket)
  } catch (error: any) {
    console.error('Error updating support ticket:', error)
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


