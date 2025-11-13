import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { logPaymentEvent } from '@/lib/payment-logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

/**
 * POST /api/v1/admin/reprocess-payment
 * Admin utility to reprocess an existing payment intent and create missing records
 */
export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN')

    const body = await req.json()
    const { paymentIntentId } = body

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'PaymentIntent ID is required' },
        { status: 400 }
      )
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    await logPaymentEvent({
      paymentIntentId: paymentIntent.id,
      eventType: 'webhook_received',
      level: 'INFO',
      message: `Admin reprocessing payment intent`,
      source: 'server',
      details: {
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        metadata: paymentIntent.metadata,
      },
    })

    const metadata = paymentIntent.metadata

    // Check if transaction already exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: { paymentIntentId: paymentIntent.id },
    })

    // Check if task already exists
    const existingTask = await prisma.task.findFirst({
      where: { paymentIntentId: paymentIntent.id },
    })

    let task = existingTask
    let transaction = existingTransaction

    // If payment is authorized but not captured, capture it
    if (paymentIntent.status === 'requires_capture') {
      try {
        await logPaymentEvent({
          paymentIntentId: paymentIntent.id,
          eventType: 'capture_attempted',
          level: 'INFO',
          message: `Capturing payment during reprocessing`,
          source: 'server',
        })

        const capturedPayment = await stripe.paymentIntents.capture(paymentIntent.id)
        
        await logPaymentEvent({
          paymentIntentId: paymentIntent.id,
          eventType: 'payment_captured',
          level: 'INFO',
          message: `Payment captured during reprocessing`,
          source: 'server',
          details: {
            amount: capturedPayment.amount,
            status: capturedPayment.status,
          },
        })
      } catch (captureError: any) {
        await logPaymentEvent({
          paymentIntentId: paymentIntent.id,
          eventType: 'capture_failed',
          level: 'ERROR',
          message: `Failed to capture during reprocessing: ${captureError.message}`,
          source: 'server',
          details: {
            error: captureError.message,
          },
        })
      }
    }

    // Process based on metadata type - manually trigger webhook processing
    // We'll call the webhook endpoint internally to reuse the logic
    if (!existingTask) {
      if (metadata.type === 'direct_booking' && metadata.buyerId && metadata.workerId) {
        await logPaymentEvent({
          paymentIntentId: paymentIntent.id,
          eventType: 'task_created',
          level: 'INFO',
          message: `Reprocessing: Creating missing task for direct booking`,
          source: 'server',
        })

        // Use the payment handlers from lib
        const { handleDirectBooking, handleOfferPurchase } = await import('@/lib/payment-handlers')
        
        if (metadata.type === 'direct_booking') {
          task = await handleDirectBooking(paymentIntent, metadata)
        } else if (metadata.type === 'offer_purchase') {
          task = await handleOfferPurchase(paymentIntent, metadata)
        }
      }
    }

    // Ensure transaction exists
    if (!transaction) {
      const baseAmount = parseFloat(metadata.baseAmount || '0')
      const { calculateFees, getFeeConfigFromSettings } = await import('@/lib/stripe-fees')
      const feeConfig = await getFeeConfigFromSettings()
      const fees = calculateFees(baseAmount, feeConfig)

      // Find task if it exists
      const taskForTransaction = await prisma.task.findFirst({
        where: { paymentIntentId: paymentIntent.id },
      })

      transaction = await prisma.transaction.create({
        data: {
          paymentIntentId: paymentIntent.id,
          buyerId: metadata.buyerId || metadata.clientId || '',
          workerId: metadata.workerId || undefined,
          taskId: taskForTransaction?.id || undefined,
          amount: fees.totalAmount,
          baseAmount: baseAmount,
          platformFee: fees.platformFee,
          stripeFee: fees.stripeFee,
          status: paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture' ? 'CAPTURED' : 'PENDING',
          captureMethod: 'automatic',
          metadata: metadata as any,
        },
      })

      await logPaymentEvent({
        paymentIntentId: paymentIntent.id,
        eventType: 'payment_intent_created',
        level: 'INFO',
        message: `Created missing transaction record`,
        source: 'server',
        transactionId: transaction.id,
      })
    }

    // Refresh task and transaction
    const updatedTask = await prisma.task.findFirst({
      where: { paymentIntentId: paymentIntent.id },
      include: {
        client: true,
        worker: true,
      },
    })

    const updatedTransaction = await prisma.transaction.findUnique({
      where: { paymentIntentId: paymentIntent.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Payment reprocessed successfully',
      task: updatedTask,
      transaction: updatedTransaction,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
      },
    })
  } catch (error: any) {
    console.error('Error reprocessing payment:', error)
    return NextResponse.json(
      { error: 'Failed to reprocess payment', details: error.message },
      { status: 500 }
    )
  }
}

