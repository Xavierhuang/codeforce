import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateBadgeTier } from '@/lib/badge-tier'
import { getAvailabilityScore, hasAvailabilitySet } from '@/lib/availability'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const skills = searchParams.get('skills')
    const near = searchParams.get('near')
    const radius = searchParams.get('radius')
    const minRating = searchParams.get('minRating')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const serviceType = searchParams.get('serviceType')
    const availableOnly = searchParams.get('availableOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {
      role: 'WORKER',
      // Show both VERIFIED and PENDING workers (buyers can see all available workers)
      verificationStatus: {
        in: ['VERIFIED', 'PENDING'],
      },
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

    // Filter by price range
    if (minPrice || maxPrice) {
      where.hourlyRate = {}
      if (minPrice) {
        where.hourlyRate.gte = parseFloat(minPrice)
      }
      if (maxPrice) {
        where.hourlyRate.lte = parseFloat(maxPrice)
      }
    }

    // Filter by service type
    if (serviceType) {
      const serviceTypes = serviceType.split(',').map((s: string) => s.trim())
      const normalizedTypes: string[] = []
      
      serviceTypes.forEach((type: string) => {
        if (type.toLowerCase() === 'remote') {
          normalizedTypes.push('VIRTUAL')
        } else if (type.toLowerCase() === 'on-site') {
          normalizedTypes.push('IN_PERSON')
        } else if (type.toLowerCase() === 'both') {
          // If "Both" is selected, don't filter
          return
        }
      })
      
      if (normalizedTypes.length > 0 && !serviceTypes.some((t: string) => t.toLowerCase() === 'both')) {
        if (normalizedTypes.length === 1) {
          where.serviceType = normalizedTypes[0]
        } else {
          where.serviceType = {
            in: normalizedTypes,
          }
        }
      }
      // If "Both" is in the list, don't add serviceType filter (show all)
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
      select: {
        id: true,
        name: true,
        email: true,
        slug: true,
        avatarUrl: true,
        avatarCropX: true,
        avatarCropY: true,
        avatarCropScale: true,
        bio: true,
        hourlyRate: true,
        rating: true,
        serviceType: true,
        locationLat: true,
        locationLng: true,
        serviceRadiusMiles: true,
        verificationStatus: true,
        badgeTier: true,
        createdAt: true,
        updatedAt: true,
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
      orderBy: [
        { rating: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit * 2, // Fetch more to filter by availability
    })

    // Calculate badge tiers and availability scores
    const developersWithMetrics = developers.map((dev: any) => {
      const tasksCompleted = dev._count?.tasksAssigned || 0
      const rating = dev.rating || 0
      const reviewCount = dev._count?.reviewsReceived || 0
      
      const calculatedTier = calculateBadgeTier(tasksCompleted, rating, reviewCount)
      const availabilityScore = getAvailabilityScore(dev.availability)
      const hasAvailability = hasAvailabilitySet(dev.availability)
      
      return {
        ...dev,
        badgeTier: dev.badgeTier || calculatedTier,
        calculatedBadgeTier: calculatedTier,
        availabilityScore,
        hasAvailability,
      }
    })

    // Filter by availability if requested
    let filteredDevelopers = developersWithMetrics
    if (availableOnly) {
      filteredDevelopers = developersWithMetrics.filter((dev: any) => dev.hasAvailability)
    }

    // Sort by availability score (higher = more available), then by rating
    filteredDevelopers.sort((a: any, b: any) => {
      // First sort by availability score (if available)
      if (a.hasAvailability && !b.hasAvailability) return -1
      if (!a.hasAvailability && b.hasAvailability) return 1
      if (a.hasAvailability && b.hasAvailability) {
        if (b.availabilityScore !== a.availabilityScore) {
          return b.availabilityScore - a.availabilityScore
        }
      }
      
      // Then by rating
      if (b.rating !== a.rating) {
        return b.rating - a.rating
      }
      
      // Finally by creation date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // Limit results
    const limitedDevelopers = filteredDevelopers.slice(0, limit)

    return NextResponse.json(limitedDevelopers)
  } catch (error: any) {
    console.error('Error searching developers:', error)
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
          details: 'The database schema is out of sync with the Prisma schema. Stop the dev server and run `npx prisma db push` to fix this.',
          code: 'SCHEMA_MISMATCH'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

