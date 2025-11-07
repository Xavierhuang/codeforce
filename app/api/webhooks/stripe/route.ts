import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { createNotification, checkAndSendOfflineNotification } from '@/lib/notifications'
import { triggerMessageEvent } from '@/lib/pusher'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events
 * Key events:
 * - payment_intent.succeeded: Auto-create task when offer is purchased
 * - payment_intent.payment_failed: Handle failed payments
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  try {
    // Handle payment_intent.succeeded - Auto-create task for offer purchases
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const metadata = paymentIntent.metadata

      // Check if this is an offer purchase
      if (metadata.type === 'offer_purchase' && metadata.offerId) {
        await handleOfferPurchase(paymentIntent, metadata)
      }
      // Handle direct booking
      else if (metadata.type === 'direct_booking') {
        await handleDirectBooking(paymentIntent, metadata)
      }
      // Handle existing task offer acceptance flow
      else if (metadata.taskId && metadata.offerId) {
        // Task already exists, just mark payment as succeeded
        // This is handled by the existing accept-offer flow
      }
    }

    // Handle payment_intent.payment_failed
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const metadata = paymentIntent.metadata

      if (metadata.buyerId) {
        await createNotification(
          metadata.buyerId,
          'payment_failed',
          'Your payment failed. Please try again.',
          metadata.taskId
        )
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle offer purchase: Auto-create task and assign to worker
 */
async function handleOfferPurchase(
  paymentIntent: Stripe.PaymentIntent,
  metadata: Record<string, string>
) {
  const { offerId, buyerId, workerId, taskId } = metadata

  // Get offer and related data
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      worker: true,
      task: true,
    },
  })

  if (!offer) {
    console.error('Offer not found:', offerId)
    return
  }

  // Get buyer
  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: { id: true, name: true, email: true, phone: true },
  })

  if (!buyer) {
    console.error('Buyer not found:', buyerId)
    return
  }

  // Create task from offer
  const task = await prisma.$transaction(async (tx) => {
    // Update offer status
    await tx.offer.update({
      where: { id: offerId },
      data: { status: 'ACCEPTED' },
    })

    // Create new task
    const newTask = await tx.task.create({
      data: {
        title: offer.task.title || `Task from ${offer.worker.name}`,
        description: offer.message || offer.task.description || '',
        clientId: buyerId,
        workerId: workerId,
        offerId: offerId,
        category: offer.task.category || 'General',
        type: offer.task.type || 'VIRTUAL',
        status: 'ASSIGNED', // Auto-assigned, no manual acceptance needed
        price: offer.price,
        estimatedDurationMins: offer.estimatedDurationMins,
        paymentIntentId: paymentIntent.id,
      },
      include: {
        client: true,
        worker: true,
      },
    })

    return newTask
  })

  // Create notifications
  await Promise.all([
    // Notify worker
    createNotification(
      workerId,
      'task_created',
      `New task "${task.title}" has been assigned to you`,
      task.id
    ),
    // Notify buyer
    createNotification(
      buyerId,
      'offer_purchased',
      `Your purchase was successful. Task "${task.title}" has been created`,
      task.id
    ),
  ])

  // Check if worker is offline and send SMS
  if (offer.worker.phone) {
    await checkAndSendOfflineNotification(
      workerId,
      offer.worker.name || 'Worker',
      offer.worker.phone,
      `you have a new task "${task.title}" on Skilly.com`,
      task.id
    )
  }

  // Emit Pusher event for real-time updates
  try {
    await triggerMessageEvent(`task-${task.id}`, {
      type: 'task_created',
      taskId: task.id,
      message: 'Task created and assigned',
    })
  } catch (error) {
    console.error('Failed to trigger Pusher event:', error)
  }
}

/**
 * Handle direct booking: Auto-create task from booking details
 */
async function handleDirectBooking(
  paymentIntent: Stripe.PaymentIntent,
  metadata: Record<string, string>
) {
  const { buyerId, workerId, taskType, category, scheduledAt, durationHours, baseAmount, taskDetails, address, unit, city, postalCode } = metadata

  // Get buyer and worker
  const [buyer, worker] = await Promise.all([
    prisma.user.findUnique({
      where: { id: buyerId },
      select: { id: true, name: true, email: true, phone: true },
    }),
    prisma.user.findUnique({
      where: { id: workerId },
      select: { id: true, name: true, email: true, phone: true },
    }),
  ])

  if (!buyer || !worker) {
    console.error('Buyer or worker not found')
    return
  }

  // Build address string for on-site tasks
  let fullAddress = null
  if (taskType === 'IN_PERSON' && address) {
    fullAddress = [address, unit, city, postalCode].filter(Boolean).join(', ')
  }

  // Create task
  const task = await prisma.task.create({
    data: {
      title: `Task with ${worker.name || 'Worker'}`,
      description: taskDetails || 'Direct booking task',
      clientId: buyerId,
      workerId: workerId,
      category: category || 'General',
      type: taskType === 'IN_PERSON' ? 'IN_PERSON' : 'VIRTUAL',
      status: 'ASSIGNED', // Auto-assigned, no manual acceptance needed
      price: parseFloat(baseAmount),
      estimatedDurationMins: Math.round(parseFloat(durationHours) * 60),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      address: fullAddress,
      paymentIntentId: paymentIntent.id,
    },
    include: {
      client: true,
      worker: true,
    },
  })

  // Create notifications
  await Promise.all([
    // Notify worker
    createNotification(
      workerId,
      'task_created',
      `New task "${task.title}" has been assigned to you`,
      task.id
    ),
    // Notify buyer
    createNotification(
      buyerId,
      'offer_purchased',
      `Your booking was successful. Task "${task.title}" has been created`,
      task.id
    ),
  ])

  // Check if worker is offline and send SMS
  if (worker.phone) {
    await checkAndSendOfflineNotification(
      workerId,
      worker.name || 'Worker',
      worker.phone,
      `you have a new task "${task.title}" on Skilly.com`,
      task.id
    )
  }

  // Emit Pusher event for real-time updates
  try {
    await triggerMessageEvent(`task-${task.id}`, {
      type: 'task_created',
      taskId: task.id,
      message: 'Task created and assigned',
    })
  } catch (error) {
    console.error('Failed to trigger Pusher event:', error)
  }
}

