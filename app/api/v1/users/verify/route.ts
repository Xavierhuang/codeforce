import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const worker = await requireRole('WORKER')

    // Check if profile is complete enough for verification
    const user = await prisma.user.findUnique({
      where: { id: worker.id },
      include: {
        skills: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Basic requirements check
    if (!user.skills || user.skills.length === 0) {
      return NextResponse.json(
        { error: 'Please add at least one skill before submitting for verification' },
        { status: 400 }
      )
    }

    if (!user.bio || user.bio.trim().length < 20) {
      return NextResponse.json(
        { error: 'Please add a bio (at least 20 characters) before submitting for verification' },
        { status: 400 }
      )
    }

    // Require ID document upload
    if (!user.idDocumentUrl || !user.idDocumentType) {
      return NextResponse.json(
        { error: 'Please upload your ID document before submitting for verification' },
        { status: 400 }
      )
    }

    // Require hourly rate
    if (!user.hourlyRate || user.hourlyRate <= 0) {
      return NextResponse.json(
        { error: 'Please set your hourly rate before submitting for verification' },
        { status: 400 }
      )
    }

    // Require service type
    if (!user.serviceType) {
      return NextResponse.json(
        { error: 'Please select your service type before submitting for verification' },
        { status: 400 }
      )
    }

    // If service type is IN_PERSON or BOTH, require location
    if ((user.serviceType === 'IN_PERSON' || user.serviceType === 'BOTH') && (!user.locationLat || !user.locationLng)) {
      return NextResponse.json(
        { error: 'Please provide your location for on-site services' },
        { status: 400 }
      )
    }

    // Set status to PENDING - requires admin approval
    const verificationStatus = 'PENDING'

    await prisma.user.update({
      where: { id: worker.id },
      data: {
        verificationStatus,
      },
    })

    // TODO: Send notification to admin about new verification request
    // Admins will review and approve/reject via admin panel

    return NextResponse.json({
      message: 'Verification submitted! An admin will review your profile within 24-48 hours.',
      status: verificationStatus,
    })
  } catch (error: any) {
    console.error('Error submitting verification:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

