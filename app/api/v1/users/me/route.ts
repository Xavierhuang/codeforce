import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { generateUniqueSlug } from '@/lib/slug'

export const dynamic = 'force-dynamic'

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
      avatarUrl,
      avatarCropX,
      avatarCropY,
      avatarCropScale,
      bannerUrl,
      website,
      linkedinUrl,
      githubUrl,
      location,
      locationLat,
      locationLng,
      serviceRadiusMiles,
      availability,
      skills,
      workerServices,
      workExperience,
      idDocumentUrl,
      idDocumentType,
      slug,
      hourlyRate,
      serviceType,
      yearsOfExperience,
      education,
      languages,
      certifications,
      gender,
      birthdate,
      schedulingUrl,
      twitterUrl,
      instagramUrl,
      referralSource,
      // Buyer-specific fields
      company,
      companySize,
      industry,
      projectTypes,
      budgetRange,
      preferredCommunication,
      typicalProjectDuration,
    } = body

    // Get current user to check existing slug and idDocumentUrl
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { slug: true, role: true, idDocumentUrl: true },
    })

    // Validate and update slug for workers and clients
    let updatedSlug = currentUser?.slug
    if (slug !== undefined && (currentUser?.role === 'WORKER' || currentUser?.role === 'CLIENT')) {
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

    // Update user - filter out undefined values to avoid Prisma errors
    const updateData: any = {}
    
    if (name !== undefined) updateData.name = name && name.trim() ? name.trim() : null
    if (bio !== undefined) updateData.bio = bio && bio.trim() ? bio.trim() : null
    if (phone !== undefined) updateData.phone = phone && phone.trim() ? phone.trim() : null // Private - not shown on public profiles
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl && avatarUrl.trim() ? avatarUrl.trim() : null
    if (avatarCropX !== undefined) updateData.avatarCropX = avatarCropX
    if (avatarCropY !== undefined) updateData.avatarCropY = avatarCropY
    if (avatarCropScale !== undefined) updateData.avatarCropScale = avatarCropScale
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl && bannerUrl.trim() ? bannerUrl.trim() : null
    if (website !== undefined) updateData.website = website && website.trim() ? website.trim() : null
    if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl && linkedinUrl.trim() ? linkedinUrl.trim() : null
    if (githubUrl !== undefined) updateData.githubUrl = githubUrl && githubUrl.trim() ? githubUrl.trim() : null
    if (location !== undefined) updateData.location = location && location.trim() ? location.trim() : null
    if (locationLat !== undefined) updateData.locationLat = locationLat
    if (locationLng !== undefined) updateData.locationLng = locationLng
    if (serviceRadiusMiles !== undefined) updateData.serviceRadiusMiles = serviceRadiusMiles
    if (availability) updateData.availability = JSON.parse(JSON.stringify(availability))
    if (workerServices !== undefined && Array.isArray(workerServices)) updateData.workerServices = workerServices
    if (workExperience !== undefined && Array.isArray(workExperience)) updateData.workExperience = JSON.parse(JSON.stringify(workExperience))
    if (idDocumentUrl !== undefined) {
      updateData.idDocumentUrl = idDocumentUrl
      // Set upload date if this is a new document
      if (!currentUser?.idDocumentUrl) {
        updateData.idDocumentUploadedAt = new Date()
      }
    }
    if (idDocumentType !== undefined) updateData.idDocumentType = idDocumentType
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate
    if (serviceType !== undefined) updateData.serviceType = serviceType
    if (yearsOfExperience !== undefined) updateData.yearsOfExperience = yearsOfExperience
    if (education !== undefined) updateData.education = education && education.trim() ? education.trim() : null
    if (languages !== undefined) updateData.languages = languages && languages.trim() ? languages.trim() : null
    if (certifications !== undefined) updateData.certifications = certifications && certifications.trim() ? certifications.trim() : null
    if (gender !== undefined) updateData.gender = gender && gender.trim() ? gender.trim() : null
    if (birthdate !== undefined) {
      updateData.birthdate = birthdate ? new Date(birthdate) : null
    }
    if (schedulingUrl !== undefined) updateData.schedulingUrl = schedulingUrl && schedulingUrl.trim() ? schedulingUrl.trim() : null
    if (twitterUrl !== undefined) updateData.twitterUrl = twitterUrl && twitterUrl.trim() ? twitterUrl.trim() : null
    if (instagramUrl !== undefined) updateData.instagramUrl = instagramUrl && instagramUrl.trim() ? instagramUrl.trim() : null
    if (referralSource !== undefined) updateData.referralSource = referralSource && referralSource.trim() ? referralSource.trim() : null
    // Buyer-specific fields
    if (company !== undefined) updateData.company = company && company.trim() ? company.trim() : null
    if (companySize !== undefined) updateData.companySize = companySize && companySize.trim() ? companySize.trim() : null
    if (industry !== undefined) updateData.industry = industry && industry.trim() ? industry.trim() : null
    if (projectTypes !== undefined) updateData.projectTypes = projectTypes && projectTypes.trim() ? projectTypes.trim() : null
    if (budgetRange !== undefined) updateData.budgetRange = budgetRange && budgetRange.trim() ? budgetRange.trim() : null
    if (preferredCommunication !== undefined) updateData.preferredCommunication = preferredCommunication && preferredCommunication.trim() ? preferredCommunication.trim() : null
    if (typicalProjectDuration !== undefined) updateData.typicalProjectDuration = typicalProjectDuration && typicalProjectDuration.trim() ? typicalProjectDuration.trim() : null

    // Add slug if it's a worker or client and slug was provided or needs to be generated
    if ((currentUser?.role === 'WORKER' || currentUser?.role === 'CLIENT') && updatedSlug) {
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

    // workerServices are now saved directly in the updateData above

    const userWithRelations = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        skills: true,
      },
    })

    return NextResponse.json(userWithRelations)
  } catch (error: any) {
    console.error('Error updating user:', error)
    
    // Provide more detailed error messages
    if (error?.code === 'P2002') {
      // Prisma unique constraint violation
      return NextResponse.json(
        { error: 'This value is already taken. Please choose a different one.', details: error.message },
        { status: 400 }
      )
    }
    
    if (error?.name === 'PrismaClientValidationError') {
      return NextResponse.json(
        { error: 'Invalid data provided. Please check your input.', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

