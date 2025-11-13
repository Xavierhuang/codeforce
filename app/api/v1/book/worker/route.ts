import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { calculateFees, calculateAmountInCents, getFeeConfigFromSettings } from '@/lib/stripe-fees'
import { getPlatformSettings } from '@/lib/settings'
import { logPaymentEvent } from '@/lib/payment-logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

/**
 * POST /api/v1/book/worker
 * Creates a direct booking (task + payment) for a worker
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    if (user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Only buyers can book workers' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      workerId,
      taskType,
      scheduledAt,
      durationHours,
      taskDetails,
      category,
      relevantSkills,
      weeklyHourLimit,
      address,
      unit,
      city,
      postalCode,
      baseAmount,
    } = body

    // Validate required fields
    if (!workerId || !scheduledAt || !durationHours || !taskDetails || !category || !baseAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (taskType === 'IN_PERSON' && (!address || !city || !postalCode)) {
      return NextResponse.json(
        { error: 'Complete address required for on-site tasks' },
        { status: 400 }
      )
    }

    // Get worker
    const worker = await prisma.user.findUnique({
      where: { id: workerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        hourlyRate: true,
        serviceType: true,
        role: true,
        verificationStatus: true,
      },
    })

    if (!worker || worker.role !== 'WORKER') {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      )
    }

    if (!worker.hourlyRate) {
      return NextResponse.json(
        { error: 'Worker does not have an hourly rate set' },
        { status: 400 }
      )
    }

    // Validate service type compatibility
    if (taskType === 'IN_PERSON' && worker.serviceType === 'VIRTUAL') {
      return NextResponse.json(
        { error: 'This worker only offers remote services' },
        { status: 400 }
      )
    }

    // Check platform settings
    const settings = await getPlatformSettings()
    
    // Check worker verification requirement
    if (settings.workerVerificationRequired && worker.verificationStatus !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'This worker must be verified before accepting bookings' },
        { status: 403 }
      )
    }
    
    // Validate task amount limits
    if (baseAmount < settings.minTaskAmount) {
      return NextResponse.json(
        { error: `Minimum task amount is $${settings.minTaskAmount.toFixed(2)}` },
        { status: 400 }
      )
    }
    
    if (baseAmount > settings.maxTaskAmount) {
      return NextResponse.json(
        { error: `Maximum task amount is $${settings.maxTaskAmount.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Calculate fees with database settings
    const feeConfig = await getFeeConfigFromSettings()
    const fees = calculateFees(baseAmount, feeConfig)
    const amountInCents = calculateAmountInCents(fees.totalAmount)

    // Extensive payment logging
    console.log('[PAYMENT] Creating PaymentIntent:', {
      buyerId: user.id,
      workerId: worker.id,
      baseAmount,
      feeConfig: {
        platformFeeRate: feeConfig.platformFeeRate,
        trustAndSupportFeeRate: feeConfig.trustAndSupportFeeRate,
        stripeFeeRate: feeConfig.stripeFeeRate,
        stripeFeeFixed: feeConfig.stripeFeeFixed,
      },
      fees: {
        baseAmount: fees.baseAmount,
        platformFee: fees.platformFee,
        trustAndSupportFee: fees.trustAndSupportFee,
        stripeFee: fees.stripeFee,
        totalAmount: fees.totalAmount,
        workerPayout: fees.workerPayout,
      },
      amountInCents,
      amountInDollars: amountInCents / 100,
      timestamp: new Date().toISOString(),
    })

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        type: 'direct_booking',
        buyerId: user.id,
        workerId: worker.id,
        taskType,
        category,
        relevantSkills: relevantSkills?.join(',') || '',
        scheduledAt,
        durationHours: durationHours.toString(),
        weeklyHourLimit: weeklyHourLimit?.toString() || '',
        baseAmount: baseAmount.toString(),
        totalAmount: fees.totalAmount.toString(), // Store total amount in metadata for verification
        taskDetails: taskDetails,
        address: address || '',
        unit: unit || '',
        city: city || '',
        postalCode: postalCode || '',
      },
      capture_method: 'manual', // Hold funds until completion
    })

    console.log('[PAYMENT] PaymentIntent created:', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      amountReceived: paymentIntent.amount_received,
      status: paymentIntent.status,
      expectedAmount: amountInCents,
      amountMatch: paymentIntent.amount === amountInCents,
      currency: paymentIntent.currency,
      captureMethod: paymentIntent.capture_method,
      clientSecret: paymentIntent.client_secret ? '***' : null,
    })

    // Verify amount matches
    if (paymentIntent.amount !== amountInCents) {
      await logPaymentEvent({
        paymentIntentId: paymentIntent.id,
        eventType: 'amount_mismatch',
        level: 'CRITICAL',
        message: `PaymentIntent amount mismatch - expected ${amountInCents}, got ${paymentIntent.amount}`,
        source: 'server',
        details: {
          expected: amountInCents,
          actual: paymentIntent.amount,
          difference: paymentIntent.amount - amountInCents,
          baseAmount,
          fees,
        },
      })
      console.error('[PAYMENT] CRITICAL: PaymentIntent amount mismatch!', {
        expected: amountInCents,
        actual: paymentIntent.amount,
        difference: paymentIntent.amount - amountInCents,
        paymentIntentId: paymentIntent.id,
      })
    } else {
      await logPaymentEvent({
        paymentIntentId: paymentIntent.id,
        eventType: 'payment_intent_created',
        level: 'INFO',
        message: `PaymentIntent created successfully - amount verified`,
        source: 'server',
        details: {
          amount: paymentIntent.amount,
          baseAmount,
          fees,
          captureMethod: 'manual',
        },
      })
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      fees,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error: any) {
    console.error('Error creating booking:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

