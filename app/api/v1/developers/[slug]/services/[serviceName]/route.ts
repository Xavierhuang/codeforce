import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; serviceName: string } }
) {
  try {
    const { slug, serviceName } = params
    const decodedServiceName = decodeURIComponent(serviceName)

    // First get the expert
    const developer = await prisma.user.findUnique({
      where: {
        slug: slug,
        role: 'WORKER',
        verificationStatus: 'VERIFIED',
      },
    })

    if (!developer) {
      return NextResponse.json(
        { error: 'Expert not found' },
        { status: 404 }
      )
    }

    // Get the service from workerServices JSON field
    const workerServices = ((developer as any).workerServices as any) || []
    const service = Array.isArray(workerServices)
      ? workerServices.find((s: any) => s.skillName === decodedServiceName && s.isActive !== false)
      : null

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Get reviews for this expert (serviceName field doesn't exist on Review model)
    const reviews = await prisma.review.findMany({
      where: {
        targetUserId: developer.id,
      },
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
      take: 50,
    })

    return NextResponse.json({
      ...service,
      reviews,
    })
  } catch (error) {
    console.error('Error fetching service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

