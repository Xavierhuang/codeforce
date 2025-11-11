import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { calculateFees, calculateAmountInCents, getFeeConfigFromSettings } from '@/lib/stripe-fees'
import { createNotification, checkAndSendOfflineNotification } from '@/lib/notifications'
import { triggerMessageEvent } from '@/lib/pusher'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

/**
 * POST /api/v1/offers/:offerId/purchase
 * Creates a PaymentIntent for purchasing an offer directly
 * When payment succeeds (via webhook), a task is auto-created
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { offerId: string } }
) {
  try {
    const user = await requireAuth()
    const { offerId } = params

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      )
    }

    // Get offer with worker and task details
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            type: true,
          },
        },
      },
    })

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    if (offer.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Offer is not available for purchase' },
        { status: 400 }
      )
    }

    // Calculate fees with database settings
    const feeConfig = await getFeeConfigFromSettings()
    const fees = calculateFees(offer.price, feeConfig)

    // Create PaymentIntent with metadata for webhook processing
    const paymentIntent = await stripe.paymentIntents.create({
      amount: calculateAmountInCents(fees.totalAmount),
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        offerId: offer.id,
        buyerId: user.id,
        workerId: offer.workerId,
        taskId: offer.taskId,
        type: 'offer_purchase', // Indicates this is a direct offer purchase
      },
      capture_method: 'manual', // Hold funds until task completion
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      fees,
    })
  } catch (error: any) {
    console.error('Error creating purchase:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}









