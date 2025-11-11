import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const buyer = await prisma.user.findUnique({
      where: {
        slug: slug,
        role: 'CLIENT', // Only clients have public buyer profiles
      },
      select: {
        id: true,
        name: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        slug: true,
        rating: true,
        ratingCount: true,
        location: true,
        locationLat: true,
        locationLng: true,
        verificationStatus: true,
        // Professional links (public)
        website: true,
        linkedinUrl: true,
        // Buyer-specific fields
        company: true,
        companySize: true,
        industry: true,
        projectTypes: true,
        budgetRange: true,
        preferredCommunication: true,
        typicalProjectDuration: true,
        createdAt: true,
        updatedAt: true,
        tasksPosted: {
          where: {
            status: { in: ['COMPLETED', 'IN_PROGRESS'] },
          },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            tasksPosted: {
              where: {
                status: 'COMPLETED',
              },
            },
            reviewsGiven: true,
          },
        },
      },
    })

    if (!buyer) {
      return NextResponse.json(
        { error: 'Buyer profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(buyer)
  } catch (error) {
    console.error('Error fetching buyer profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

