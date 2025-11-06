import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'CLIENT' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only clients can create tasks' }, { status: 403 })
    }

    const body = await req.json()
    const {
      title,
      description,
      type,
      category,
      subcategory,
      scheduledAt,
      address,
      lat,
      lng,
      budget,
      estimatedDurationMins,
    } = body

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        category,
        subcategory: subcategory || null,
        type: type || 'VIRTUAL',
        clientId: user.id,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        address: address || null,
        addressLat: lat || null,
        addressLng: lng || null,
        price: budget || null,
        estimatedDurationMins: estimatedDurationMins || null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error: any) {
    console.error('Error creating task:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const near = searchParams.get('near')
    const radius = searchParams.get('radius')
    const category = searchParams.get('category')
    const type = searchParams.get('type')

    const where: any = {}

    if (status) {
      where.status = status
    } else {
      where.status = { in: ['OPEN', 'OFFERED'] }
    }

    if (category) {
      where.category = category
    }

    if (type) {
      where.type = type
    }

    // Geo-location filtering for in-person tasks
    if (near && radius) {
      const [lat, lng] = near.split(',').map(Number)
      // Simple bounding box filter (can be improved with PostGIS)
      const radiusDegrees = Number(radius) / 69 // approximate miles to degrees
      where.OR = [
        { type: 'VIRTUAL' },
        {
          type: 'IN_PERSON',
          addressLat: {
            gte: lat - radiusDegrees,
            lte: lat + radiusDegrees,
          },
          addressLng: {
            gte: lng - radiusDegrees,
            lte: lng + radiusDegrees,
          },
        },
      ]
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            rating: true,
            ratingCount: true,
          },
        },
        offers: {
          select: {
            id: true,
            price: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            offers: true,
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

