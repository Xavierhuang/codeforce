import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
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

  // Check if event already processed (idempotency check)
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { stripeEventId: event.id },
  })

  if (existingEvent && existingEvent.processed) {
    console.log(`Event ${event.id} already processed, skipping`)
    return NextResponse.json({ received: true, status: 'duplicate' })
  }

  // Create or update webhook event record
  await prisma.webhookEvent.upsert({
    where: { stripeEventId: event.id },
    create: {
      stripeEventId: event.id,
      type: event.type,
      data: event.data as any,
      processed: false,
      retryCount: 0,
    },
    update: {
      retryCount: { increment: 1 },
      error: null, // Clear previous error on retry
    },
  })

  try {
    // Process the webhook event
    await processWebhookEvent(event)

    // Mark as processed
    await prisma.webhookEvent.update({
      where: { stripeEventId: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
        error: null,
      },
    })

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing webhook:', error)

    // Update error in database
    await prisma.webhookEvent.update({
      where: { stripeEventId: event.id },
      data: {
        error: error.message || 'Unknown error',
      },
    })

    // Return 200 to prevent Stripe from retrying immediately
    // We can implement our own retry logic later
    return NextResponse.json(
      { error: 'Webhook processing failed', received: true },
      { status: 200 }
    )
  }
}

async function processWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Payment was successfully authorized/captured
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      if (paymentIntent.metadata.taskId) {
        await prisma.task.update({
          where: { id: paymentIntent.metadata.taskId },
          data: { stripeChargeId: paymentIntent.latest_charge as string },
        })
      }
      break

    case 'payment_intent.payment_failed':
      // Handle failed payment
      const failedPaymentIntent = event.data.object as Stripe.PaymentIntent
      console.error('Payment failed:', {
        paymentIntentId: failedPaymentIntent.id,
        taskId: failedPaymentIntent.metadata.taskId,
        error: failedPaymentIntent.last_payment_error,
      })
      // TODO: Notify client about failed payment
      break

    case 'transfer.created':
      // Transfer to worker was created
      const transfer = event.data.object as Stripe.Transfer
      if (transfer.metadata?.taskId) {
        await prisma.payout.updateMany({
          where: {
            taskId: transfer.metadata.taskId,
            stripePayoutId: null,
          },
          data: { stripePayoutId: transfer.id },
        })
      }
      break

    case 'account.updated':
      // Stripe Connect account was updated (e.g., onboarding completed)
      const account = event.data.object as Stripe.Account
      await prisma.user.updateMany({
        where: { stripeAccountId: account.id },
        data: {
          // You can add fields here to track account status
        },
      })
      break

    case 'charge.refunded':
      // Handle refund
      const charge = event.data.object as Stripe.Charge
      if (charge.metadata?.taskId) {
        await prisma.task.update({
          where: { id: charge.metadata.taskId },
          data: {
            refundStatus: 'PROCESSED',
            refundId: charge.refunds?.data[0]?.id || null,
          },
        })
      }
      break

    case 'refund.created':
      // Refund was created
      const refund = event.data.object as Stripe.Refund
      if (refund.metadata?.taskId) {
        await prisma.task.update({
          where: { id: refund.metadata.taskId },
          data: {
            refundStatus: 'PROCESSED',
            refundId: refund.id,
          },
        })
      }
      break

    case 'refund.updated':
      // Refund status updated
      const updatedRefund = event.data.object as Stripe.Refund
      if (updatedRefund.metadata?.taskId) {
        const status = updatedRefund.status === 'succeeded' ? 'PROCESSED' : 'REQUESTED'
        await prisma.task.update({
          where: { id: updatedRefund.metadata.taskId },
          data: {
            refundStatus: status,
          },
        })
      }
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}

