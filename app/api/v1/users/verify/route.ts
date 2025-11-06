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

    // AUTO-VERIFY: Automatically verify if basic requirements are met
    // This allows instant verification without admin bottleneck
    // Admins can still manually reject if needed via admin panel
    
    const verificationStatus = 'VERIFIED' // Auto-verify for MVP

    await prisma.user.update({
      where: { id: worker.id },
      data: {
        verificationStatus,
      },
    })

    // TODO: Send notification to admin about new verification (for monitoring)
    // Admins can review and manually reject if needed

    return NextResponse.json({
      message: 'You are now verified! You can start receiving task invitations.',
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

