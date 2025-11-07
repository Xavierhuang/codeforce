import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { generateUniqueSlug } from '@/lib/slug'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userWithRelations = await prisma.user.findUnique({
      where: { id: user.id },
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
      },
    })

    return NextResponse.json(userWithRelations)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      bio,
      phone,
      locationLat,
      locationLng,
      serviceRadiusMiles,
      availability,
      skills,
      idDocumentUrl,
      idDocumentType,
      slug,
      hourlyRate,
      serviceType,
    } = body

    // Get current user to check existing slug
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { slug: true, role: true },
    })

    // Validate and update slug for workers
    let updatedSlug = currentUser?.slug
    if (slug !== undefined && currentUser?.role === 'WORKER') {
      if (slug && slug.trim()) {
        // Check if slug is already taken by another user
        const existingUser = await prisma.user.findFirst({
          where: {
            slug: slug.trim(),
            id: { not: user.id },
          },
        })

        if (existingUser) {
          return NextResponse.json(
            { error: 'This profile URL is already taken' },
            { status: 400 }
          )
        }

        updatedSlug = slug.trim()
      } else {
        // Generate slug if not provided
        const baseSlug = name || user.email?.split('@')[0] || user.id
        const existingSlugs = await prisma.user.findMany({
          where: {
            slug: { not: null },
            id: { not: user.id },
          },
          select: { slug: true },
        })
        updatedSlug = generateUniqueSlug(
          baseSlug,
          existingSlugs.map((u: { slug: string | null }) => u.slug!).filter(Boolean)
        )
      }
    }

    // Update user
    const updateData: any = {
      name: name !== undefined ? name : undefined,
      bio: bio !== undefined ? bio : undefined,
      phone: phone !== undefined ? phone : undefined,
      locationLat: locationLat !== undefined ? locationLat : undefined,
      locationLng: locationLng !== undefined ? locationLng : undefined,
      serviceRadiusMiles:
        serviceRadiusMiles !== undefined ? serviceRadiusMiles : undefined,
      availability: availability ? JSON.parse(JSON.stringify(availability)) : undefined,
      idDocumentUrl: idDocumentUrl !== undefined ? idDocumentUrl : undefined,
      idDocumentType: idDocumentType !== undefined ? idDocumentType : undefined,
      idDocumentUploadedAt: idDocumentUrl && !user.idDocumentUrl ? new Date() : undefined,
      hourlyRate: hourlyRate !== undefined ? hourlyRate : undefined,
      serviceType: serviceType !== undefined ? serviceType : undefined,
    }

    // Add slug if it's a worker and slug was provided or needs to be generated
    if (currentUser?.role === 'WORKER' && updatedSlug) {
      updateData.slug = updatedSlug
    }

    // Also ensure workers have a slug (generate if missing)
    if (currentUser?.role === 'WORKER' && !currentUser.slug && !updatedSlug) {
      const baseSlug = name || user.email?.split('@')[0] || user.id
      const existingSlugs = await prisma.user.findMany({
        where: {
          slug: { not: null },
          id: { not: user.id },
        },
        select: { slug: true },
      })
      updateData.slug = generateUniqueSlug(
        baseSlug,
        existingSlugs.map((u: { slug: string | null }) => u.slug!).filter(Boolean)
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    })

    // Update skills if provided
    if (skills && Array.isArray(skills)) {
      await prisma.userSkill.deleteMany({
        where: { userId: user.id },
      })

      if (skills.length > 0) {
        await prisma.userSkill.createMany({
          data: skills.map((skill: { skill: string; level: string }) => ({
            userId: user.id,
            skill: skill.skill,
            level: skill.level,
          })),
        })
      }
    }

    const userWithRelations = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        skills: true,
      },
    })

    return NextResponse.json(userWithRelations)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

