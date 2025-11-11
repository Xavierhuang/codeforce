import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { calculateAmountInCents } from '@/lib/stripe-fees'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

// Process approved payout request (admin only) - Actually transfer the money
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireRole('ADMIN')

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

    if (payoutRequest.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Payout request must be APPROVED to process. Current status: ${payoutRequest.status}` },
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

    let stripePayoutId: string | null = null

    // Process Stripe transfer if worker has Stripe account
    if (payoutRequest.worker.stripeAccountId) {
      try {
        const transfer = await stripe.transfers.create({
          amount: calculateAmountInCents(payoutRequest.amount),
          currency: 'usd',
          destination: payoutRequest.worker.stripeAccountId,
          metadata: {
            payoutRequestId: payoutRequest.id,
            workerId: payoutRequest.workerId,
          },
        })
        stripePayoutId = transfer.id
      } catch (stripeError: any) {
        console.error('Stripe transfer error:', stripeError)
        return NextResponse.json(
          { error: 'Failed to process Stripe transfer', details: stripeError.message },
          { status: 500 }
        )
      }
    }

    // Update wallet balance and mark request as processed
    const result = await prisma.$transaction([
      // Deduct from wallet
      prisma.user.update({
        where: { id: payoutRequest.workerId },
        data: {
          walletBalance: {
            decrement: payoutRequest.amount,
          },
        },
      }),
      // Update payout request
      prisma.payoutRequest.update({
        where: { id: params.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
          processedBy: admin.id,
          stripePayoutId,
        },
      }),
      // Create payout record
      prisma.payout.create({
        data: {
          workerId: payoutRequest.workerId,
          amount: payoutRequest.amount,
          fee: 0, // No fee on manual payouts (already deducted when task completed)
          payoutRequestId: payoutRequest.id,
          stripePayoutId,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      payoutRequest: result[1],
      payout: result[2],
    })
  } catch (error: any) {
    console.error('Error processing payout request:', error)
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




