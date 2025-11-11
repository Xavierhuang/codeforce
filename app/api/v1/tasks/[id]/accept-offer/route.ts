import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { sendTaskBookingNotification } from '@/lib/twilio'
import { calculateFees, calculateAmountInCents, getFeeConfigFromSettings } from '@/lib/stripe-fees'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { offerId } = body

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      )
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        offers: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.clientId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
      },
    })

    if (!offer || offer.taskId !== params.id) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    if (offer.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Offer is not pending' },
        { status: 400 }
      )
    }

    // Calculate fees using centralized function with database settings
    // Buyer pays: baseAmount + trustAndSupportFee (15%) + Stripe fees
    // Worker receives: baseAmount - platformFee (15%) - Stripe fees
    // Platform gets: platformFee (from worker) + trustAndSupportFee (from buyer)
    const feeConfig = await getFeeConfigFromSettings()
    const fees = calculateFees(offer.price, feeConfig)

    // Create PaymentIntent to hold funds in escrow
    let paymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: calculateAmountInCents(fees.totalAmount), // Total amount buyer pays
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: {
          taskId: task.id,
          offerId: offer.id,
          workerId: offer.workerId,
          clientId: user.id,
        },
        capture_method: 'manual', // Hold funds until completion
      })
    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError)
      return NextResponse.json(
        { error: 'Payment processing failed', details: stripeError.message },
        { status: 500 }
      )
    }

    // Update offer status and task
    await prisma.$transaction([
      prisma.offer.update({
        where: { id: offerId },
        data: { status: 'ACCEPTED' },
      }),
      prisma.offer.updateMany({
        where: {
          taskId: params.id,
          id: { not: offerId },
          status: 'PENDING',
        },
        data: { status: 'DECLINED' },
      }),
      prisma.task.update({
        where: { id: params.id },
        data: {
          status: 'ASSIGNED',
          workerId: offer.workerId,
          price: offer.price,
          paymentIntentId: paymentIntent.id,
        },
      }),
    ])

    // Send SMS notification to developer
    if (offer.worker.phone) {
      try {
        await sendTaskBookingNotification(
          offer.worker.phone,
          task.title,
          user.name || 'a client',
          task.scheduledAt ? new Date(task.scheduledAt) : undefined
        )
      } catch (error) {
        console.error('Failed to send SMS notification:', error)
        // Don't fail the request if SMS fails
      }
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      fees: {
        baseAmount: fees.baseAmount,
        platformFee: fees.platformFee,
        trustAndSupportFee: fees.trustAndSupportFee,
        stripeFee: fees.stripeFee,
        totalAmount: fees.totalAmount,
      },
    })
  } catch (error: any) {
    console.error('Error accepting offer:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

