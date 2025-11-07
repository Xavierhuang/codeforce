import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { calculateFees, calculateAmountInCents } from '@/lib/stripe-fees'

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

    // Calculate fees
    const fees = calculateFees(baseAmount)

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: calculateAmountInCents(fees.totalAmount),
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
        baseAmount: baseAmount.toString(),
        taskDetails: taskDetails,
        address: address || '',
        unit: unit || '',
        city: city || '',
        postalCode: postalCode || '',
      },
      capture_method: 'manual', // Hold funds until completion
    })

    // Store booking details temporarily (will be used by webhook)
    // We could use Redis or database, but for now we'll pass everything in metadata
    // The webhook will create the task when payment succeeds

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

