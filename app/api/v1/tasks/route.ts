import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { validateBody } from '@/lib/validation'
import { TaskCreateSchema } from '@/lib/validation-schemas'
import { sanitizeText } from '@/lib/sanitize'
import { rateLimit, rateLimitConfigs } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Rate limiting for task creation
    const rateLimitResponse = await rateLimit(req, rateLimitConfigs.task, user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    // Task creation is disabled - tasks are only created through direct bookings
    return NextResponse.json({ error: 'Task creation is disabled. Please book developers directly.' }, { status: 403 })
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
    const user = await requireAuth().catch(() => null) // Optional auth for public browsing
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const near = searchParams.get('near')
    const radius = searchParams.get('radius')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const myTasks = searchParams.get('myTasks') === 'true' // For user's own tasks

    const where: any = {}

    // If user wants their own tasks, filter by their role
    if (myTasks) {
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required to view your tasks' },
          { status: 401 }
        )
      }
      if (user.role === 'WORKER') {
        where.workerId = user.id
      } else if (user.role === 'CLIENT') {
        where.clientId = user.id
      } else {
        // Admin or other roles - return empty array
        return NextResponse.json([])
      }
      // Show all statuses for user's own tasks
    } else if (status) {
      where.status = status
    } else if (!myTasks && !user) {
      // Public browsing: only show open tasks
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
  } catch (error: any) {
    console.error('Error fetching tasks:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    
    // Check if this is a Prisma schema mismatch error
    if (error?.message?.includes('Unknown field') || error?.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Database schema mismatch. Please run: npx prisma db push',
          details: 'The database schema is out of sync with the Prisma schema.',
          code: 'SCHEMA_MISMATCH'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

