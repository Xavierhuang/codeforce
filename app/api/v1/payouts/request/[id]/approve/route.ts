import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { calculateAmountInCents } from '@/lib/stripe-fees'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

// Approve payout request (admin only)
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
      include: {
        worker: true,
      },
    })

    if (!payoutRequest) {
      return NextResponse.json(
        { error: 'Payout request not found' },
        { status: 404 }
      )
    }

    if (payoutRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Payout request is already ${payoutRequest.status}` },
        { status: 400 }
      )
    }

    // Verify worker still has sufficient balance
    if (payoutRequest.worker.walletBalance < payoutRequest.amount) {
      return NextResponse.json(
        { error: 'Worker has insufficient wallet balance' },
        { status: 400 }
      )
    }

    // Approve the request
    const updated = await prisma.payoutRequest.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        adminNotes: adminNotes || null,
        processedBy: admin.id,
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
            walletBalance: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error approving payout request:', error)
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

