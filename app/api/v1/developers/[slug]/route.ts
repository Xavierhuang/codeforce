import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const developer = await prisma.user.findUnique({
      where: {
        slug: slug,
        role: 'WORKER', // Only workers have public profiles
        verificationStatus: 'VERIFIED', // Only show verified experts
      },
      select: {
        id: true,
        name: true,
        bio: true,
        avatarUrl: true,
        avatarCropX: true,
        avatarCropY: true,
        avatarCropScale: true,
        bannerUrl: true,
        slug: true,
        rating: true,
        ratingCount: true,
        hourlyRate: true,
        serviceType: true,
        serviceRadiusMiles: true,
        locationLat: true,
        locationLng: true,
        verificationStatus: true,
        badgeTier: true,
        // Professional links (public)
        website: true,
        linkedinUrl: true,
        githubUrl: true,
        // Professional information (public)
        yearsOfExperience: true,
        education: true,
        languages: true,
        certifications: true,
        skills: true,
        reviewsReceived: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            tasksAssigned: {
              where: {
                status: 'COMPLETED',
              },
            },
            reviewsReceived: true,
          },
        },
      },
    })

    if (!developer) {
      return NextResponse.json(
        { error: 'Expert not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(developer)
  } catch (error) {
    console.error('Error fetching expert profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

