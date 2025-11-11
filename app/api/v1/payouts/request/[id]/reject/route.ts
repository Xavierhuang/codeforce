import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

// Reject payout request (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireRole('ADMIN')
    const body = await req.json()
    const { adminNotes } = body

    const payoutRequest = await prisma.payoutRequest.findUnique({
      where: { id: params.id },
    })

    if (!payoutRequest) {
      return NextResponse.json(
        { error: 'Payout request not found' },
        { status: 404 }
      )
    }

    if (payoutRequest.status !== 'PENDING' && payoutRequest.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Cannot reject payout request with status ${payoutRequest.status}` },
        { status: 400 }
      )
    }

    // Reject the request
    const updated = await prisma.payoutRequest.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        adminNotes: adminNotes || null,
        processedBy: admin.id,
        processedAt: new Date(),
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error rejecting payout request:', error)
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




