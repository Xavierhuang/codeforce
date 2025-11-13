import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { handleOfferPurchase, handleDirectBooking } from '@/lib/payment-handlers'
import { logPaymentEvent } from '@/lib/payment-logger'
import { calculateFees, getFeeConfigFromSettings } from '@/lib/stripe-fees'
import { checkAndApplyPaymentProtection } from '@/lib/payment-protection'

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
    // Log all webhook events for debugging
    console.log(`[WEBHOOK] Received event: ${event.type}, ID: ${event.id}`)

    // Handle payment_intent.succeeded - Auto-create task for offer purchases
    // IMPORTANT: For manual capture, this fires when payment is AUTHORIZED (status: requires_capture)
    // NOT when it's captured. We need to handle both cases.
    if (event.type === 'payment_intent.succeeded') {
      let paymentIntent = event.data.object as Stripe.PaymentIntent
      const metadata = paymentIntent.metadata

      console.log(`[WEBHOOK] payment_intent.succeeded - Status: ${paymentIntent.status}, PaymentIntent: ${paymentIntent.id}`)
      console.log(`[WEBHOOK] Metadata:`, JSON.stringify(metadata, null, 2))

      // Log payment authorization
      const { logPaymentEvent } = await import('@/lib/payment-logger')
      await logPaymentEvent({
        paymentIntentId: paymentIntent.id,
        eventType: 'payment_authorized',
        level: 'INFO',
        message: `Payment authorized - status: ${paymentIntent.status}`,
        source: 'webhook',
        details: {
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          captureMethod: paymentIntent.capture_method,
        },
      })

      // For manual capture, status will be 'requires_capture' when authorized
      // For automatic capture, status will be 'succeeded'
      const isAuthorized = paymentIntent.status === 'requires_capture' || paymentIntent.status === 'succeeded'

      if (isAuthorized) {
        // AUTOMATIC CAPTURE: If payment is authorized but not captured, capture it immediately
        if (paymentIntent.status === 'requires_capture') {
          try {
            await logPaymentEvent({
              paymentIntentId: paymentIntent.id,
              eventType: 'capture_attempted',
              level: 'INFO',
              message: `Automatic capture initiated immediately after payment authorization`,
              source: 'webhook',
              details: {
                status: paymentIntent.status,
                amount: paymentIntent.amount,
              },
            })

            // Capture the payment immediately
            const capturedPayment = await stripe.paymentIntents.capture(paymentIntent.id)
            
            await logPaymentEvent({
              paymentIntentId: paymentIntent.id,
              eventType: 'payment_captured',
              level: 'INFO',
              message: `Payment automatically captured successfully`,
              source: 'webhook',
              details: {
                amount: capturedPayment.amount,
                amountReceived: capturedPayment.amount_received,
                status: capturedPayment.status,
                chargeId: capturedPayment.latest_charge,
              },
            })

            // Update paymentIntent reference to use captured version
            paymentIntent = capturedPayment
          } catch (captureError: any) {
            await logPaymentEvent({
              paymentIntentId: paymentIntent.id,
              eventType: 'capture_failed',
              level: 'ERROR',
              message: `Automatic capture failed: ${captureError.message}`,
              source: 'webhook',
              details: {
                error: captureError.message,
                errorCode: captureError.code,
                errorType: captureError.type,
              },
            })
            console.error(`[WEBHOOK] Failed to capture payment ${paymentIntent.id}:`, captureError)
            // Continue processing even if capture fails - payment is still authorized
          }
        }

        // Check if this is an offer purchase
        if (metadata.type === 'offer_purchase' && metadata.offerId) {
          console.log(`[WEBHOOK] Processing offer purchase: ${metadata.offerId}`)
          await handleOfferPurchase(paymentIntent, metadata)
        }
        // Handle direct booking
        else if (metadata.type === 'direct_booking') {
          console.log(`[WEBHOOK] Processing direct booking for worker: ${metadata.workerId}`)
          await handleDirectBooking(paymentIntent, metadata)
        }
        // Handle existing task offer acceptance flow
        else if (metadata.taskId && metadata.offerId) {
          console.log(`[WEBHOOK] Task already exists: ${metadata.taskId}, updating transaction`)
          // Task already exists, just update transaction status
          await updateTransactionStatus(paymentIntent.id, 'CAPTURED')
        }
      }
    }

    // Handle payment_intent.amount_capturable_updated - For manual capture
    // This fires when a payment is authorized and ready to be captured
    if (event.type === 'payment_intent.amount_capturable_updated') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const metadata = paymentIntent.metadata

      console.log(`[WEBHOOK] payment_intent.amount_capturable_updated - Status: ${paymentIntent.status}`)

      // Only process if status is requires_capture (authorized but not captured)
      if (paymentIntent.status === 'requires_capture') {
        // Check if this is an offer purchase
        if (metadata.type === 'offer_purchase' && metadata.offerId) {
          console.log(`[WEBHOOK] Processing offer purchase (amount_capturable_updated): ${metadata.offerId}`)
          await handleOfferPurchase(paymentIntent, metadata)
        }
        // Handle direct booking
        else if (metadata.type === 'direct_booking') {
          console.log(`[WEBHOOK] Processing direct booking (amount_capturable_updated) for worker: ${metadata.workerId}`)
          await handleDirectBooking(paymentIntent, metadata)
        }
      }
    }

    // Handle payment_intent.payment_failed
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const metadata = paymentIntent.metadata

      console.log(`[WEBHOOK] payment_intent.payment_failed - PaymentIntent: ${paymentIntent.id}`)

      // Check if this is a weekly payment (eligible for payment protection)
      if (metadata.type === 'weekly_payment' && metadata.weeklyPaymentId) {
        console.log(`[WEBHOOK] Weekly payment failed, checking payment protection eligibility`)
        
        // Apply payment protection (platform covers worker payment)
        const protectionApplied = await checkAndApplyPaymentProtection(metadata.weeklyPaymentId)
        
        if (protectionApplied) {
          console.log(`[WEBHOOK] Payment protection applied for weekly payment ${metadata.weeklyPaymentId}`)
          await logPaymentEvent({
            level: 'INFO',
            eventType: 'payment_protection_applied',
            paymentIntentId: paymentIntent.id,
            taskId: metadata.taskId,
            buyerId: metadata.buyerId,
            workerId: metadata.workerId,
            message: 'Payment protection applied via webhook after payment failure',
            source: 'webhook',
          })
        } else {
          // Update transaction status to FAILED
          await updateTransactionStatus(paymentIntent.id, 'FAILED')
        }
      } else {
        // Regular payment failure (not weekly payment)
        await updateTransactionStatus(paymentIntent.id, 'FAILED')
      }

      if (metadata.buyerId) {
        const { createNotification } = await import('@/lib/notifications')
        await createNotification(
          metadata.buyerId,
          'payment_received',
          metadata.type === 'weekly_payment' 
            ? 'Your weekly payment failed. Platform has covered the worker payment. Please update your payment method.'
            : 'Your payment failed. Please try again.',
          metadata.taskId
        )
      }
    }

    // Note: Stripe doesn't have a separate 'payment_intent.requires_payment_method' event
    // This is handled via payment_intent.payment_failed when payment method is required

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[WEBHOOK] Handler error:', error)
    console.error('[WEBHOOK] Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error.message },
      { status: 500 }
    )
  }
}

// Handler functions are imported from @/lib/payment-handlers

/**
 * Create or update transaction record
 */
async function createOrUpdateTransaction(
  paymentIntent: Stripe.PaymentIntent,
  metadata: Record<string, string>,
  taskId?: string
) {
  try {
    const existingTransaction = await prisma.transaction.findUnique({
      where: { paymentIntentId: paymentIntent.id },
    })

    if (existingTransaction) {
      // Update existing transaction - payment is captured immediately
      await prisma.transaction.update({
        where: { paymentIntentId: paymentIntent.id },
        data: { 
          status: 'CAPTURED',
          captureMethod: 'automatic',
          updatedAt: new Date() 
        },
      })
      console.log(`[WEBHOOK] Updated transaction ${existingTransaction.id} to CAPTURED`)
    } else {
      // Create new transaction
      const baseAmount = parseFloat(metadata.baseAmount || '0')
      const feeConfig = await getFeeConfigFromSettings()
      const fees = calculateFees(baseAmount, feeConfig)
      // Payment is captured immediately after authorization
      await prisma.transaction.create({
        data: {
          paymentIntentId: paymentIntent.id,
          buyerId: metadata.buyerId || metadata.clientId || '',
          workerId: metadata.workerId || undefined,
          taskId: taskId || undefined,
          amount: fees.totalAmount,
          baseAmount: baseAmount,
          platformFee: fees.platformFee,
          stripeFee: fees.stripeFee,
          status: 'CAPTURED', // Captured immediately in webhook
          captureMethod: 'automatic', // Automatic capture via webhook
          metadata: metadata as any,
        },
      })
      console.log(`[WEBHOOK] Created transaction for payment ${paymentIntent.id}`)
    }
  } catch (error: any) {
    console.error(`[WEBHOOK] Error creating/updating transaction:`, error)
  }
}

/**
 * Update transaction status
 */
async function updateTransactionStatus(paymentIntentId: string, status: 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED') {
  try {
    await prisma.transaction.update({
      where: { paymentIntentId },
      data: { 
        status, 
        captureMethod: status === 'CAPTURED' ? 'automatic' : undefined,
        updatedAt: new Date() 
      },
    })
    console.log(`[WEBHOOK] Updated transaction ${paymentIntentId} to status ${status}`)
  } catch (error: any) {
    console.error(`[WEBHOOK] Error updating transaction status:`, error)
  }
}

