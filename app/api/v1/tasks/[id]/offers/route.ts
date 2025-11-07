import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const worker = await requireRole('WORKER')
    const body = await req.json()
    const { price, hourly, message, estimatedDurationMins } = body

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      )
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.status !== 'OPEN' && task.status !== 'OFFERED') {
      return NextResponse.json(
        { error: 'Task is not accepting offers' },
        { status: 400 }
      )
    }

    // Check if worker already made an offer
    const existingOffer = await prisma.offer.findFirst({
      where: {
        taskId: params.id,
        workerId: worker.id,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    })

    if (existingOffer) {
      return NextResponse.json(
        { error: 'You already have a pending offer for this task' },
        { status: 400 }
      )
    }

    const offer = await prisma.offer.create({
      data: {
        taskId: params.id,
        workerId: worker.id,
        price,
        hourly: hourly || false,
        message: message || null,
        estimatedDurationMins: estimatedDurationMins || null,
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            rating: true,
            ratingCount: true,
            skills: true,
          },
        },
      },
    })

    // Update task status to OFFERED if it was OPEN
    if (task.status === 'OPEN') {
      await prisma.task.update({
        where: { id: params.id },
        data: { status: 'OFFERED' },
      })
    }

    // TODO: Send notification to client

    return NextResponse.json(offer, { status: 201 })
  } catch (error: any) {
    console.error('Error creating offer:', error)
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    
    const task = await prisma.task.findUnique({
      where: { id: params.id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only client or admin can see offers
    if (task.clientId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const offers = await prisma.offer.findMany({
      where: { taskId: params.id },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            rating: true,
            ratingCount: true,
            skills: true,
            verificationStatus: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(offers)
  } catch (error: any) {
    console.error('Error fetching offers:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

