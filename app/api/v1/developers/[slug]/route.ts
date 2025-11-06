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
      },
      include: {
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
        { error: 'Developer not found' },
        { status: 404 }
      )
    }

    // Don't expose sensitive information
    const { hashedPassword, email, phone, idDocumentUrl, ...publicProfile } =
      developer

    return NextResponse.json({
      ...publicProfile,
      // Include email for display (but not full user object)
      email: developer.email,
    })
  } catch (error) {
    console.error('Error fetching developer profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

