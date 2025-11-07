import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const skills = searchParams.get('skills')
    const near = searchParams.get('near')
    const radius = searchParams.get('radius')
    const minRating = searchParams.get('minRating')

    const where: any = {
      role: 'WORKER',
      verificationStatus: 'VERIFIED', // Only show verified workers
    }

    // Filter by skills
    if (skills) {
      const skillList = skills.split(',').map((s: string) => s.trim())
      where.skills = {
        some: {
          skill: {
            in: skillList,
          },
        },
      }
    }

    // Filter by minimum rating
    if (minRating) {
      where.rating = {
        gte: parseFloat(minRating),
      }
    }

    // Geo-location filtering
    if (near && radius) {
      const [lat, lng] = near.split(',').map(Number)
      const radiusDegrees = Number(radius) / 69
      where.locationLat = {
        gte: lat - radiusDegrees,
        lte: lat + radiusDegrees,
      }
      where.locationLng = {
        gte: lng - radiusDegrees,
        lte: lng + radiusDegrees,
      }
    }

    const developers = await prisma.user.findMany({
      where,
      include: {
        skills: true,
        reviewsReceived: {
          take: 5,
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            tasksAssigned: true,
            reviewsReceived: true,
          },
        },
      },
      orderBy: {
        rating: 'desc',
      },
      take: 50,
    })

    return NextResponse.json(developers)
  } catch (error) {
    console.error('Error searching developers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

