/**
 * Script to reprocess a payment intent
 * Usage: node scripts/reprocess-payment.js <paymentIntentId>
 */

const { PrismaClient } = require('@prisma/client')
const Stripe = require('stripe')

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

async function reprocessPayment(paymentIntentId) {
  try {
    console.log(`[REPROCESS] Starting reprocess for payment: ${paymentIntentId}`)

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    const metadata = paymentIntent.metadata

    console.log(`[REPROCESS] Payment status: ${paymentIntent.status}`)
    console.log(`[REPROCESS] Metadata:`, JSON.stringify(metadata, null, 2))

    // Check if transaction already exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: { paymentIntentId: paymentIntent.id },
    })

    // Check if task already exists
    const existingTask = await prisma.task.findFirst({
      where: { paymentIntentId: paymentIntent.id },
    })

    console.log(`[REPROCESS] Existing transaction: ${existingTransaction ? 'Yes' : 'No'}`)
    console.log(`[REPROCESS] Existing task: ${existingTask ? 'Yes' : 'No'}`)

    // If payment is authorized but not captured, capture it
    if (paymentIntent.status === 'requires_capture') {
      console.log(`[REPROCESS] Capturing payment...`)
      try {
        const capturedPayment = await stripe.paymentIntents.capture(paymentIntent.id)
        console.log(`[REPROCESS] Payment captured successfully. New status: ${capturedPayment.status}`)
      } catch (captureError) {
        console.error(`[REPROCESS] Failed to capture:`, captureError.message)
      }
    }

    // Import handlers
    const { handleDirectBooking, handleOfferPurchase } = require('../lib/payment-handlers')

    let task = existingTask

    // Process based on metadata type
    if (!existingTask) {
      if (metadata.type === 'direct_booking' && metadata.buyerId && metadata.workerId) {
        console.log(`[REPROCESS] Creating task for direct booking...`)
        task = await handleDirectBooking(paymentIntent, metadata)
        console.log(`[REPROCESS] Task created: ${task?.id}`)
      } else if (metadata.type === 'offer_purchase' && metadata.offerId) {
        console.log(`[REPROCESS] Creating task for offer purchase...`)
        task = await handleOfferPurchase(paymentIntent, metadata)
        console.log(`[REPROCESS] Task created: ${task?.id}`)
      }
    }

    // Ensure transaction exists
    if (!existingTransaction) {
      const baseAmount = parseFloat(metadata.baseAmount || '0')
      const { calculateFees, getFeeConfigFromSettings } = require('../lib/stripe-fees')
      const feeConfig = await getFeeConfigFromSettings()
      const fees = calculateFees(baseAmount, feeConfig)

      const taskForTransaction = await prisma.task.findFirst({
        where: { paymentIntentId: paymentIntent.id },
      })

      const transaction = await prisma.transaction.create({
        data: {
          paymentIntentId: paymentIntent.id,
          buyerId: metadata.buyerId || metadata.clientId || '',
          workerId: metadata.workerId || undefined,
          taskId: taskForTransaction?.id || undefined,
          amount: fees.totalAmount,
          baseAmount: baseAmount,
          platformFee: fees.platformFee,
          stripeFee: fees.stripeFee,
          status: 'CAPTURED',
          captureMethod: 'automatic',
          metadata: metadata,
        },
      })

      console.log(`[REPROCESS] Transaction created: ${transaction.id}`)
    }

    // Refresh data
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

    console.log(`[REPROCESS] ✅ Success!`)
    console.log(`[REPROCESS] Task ID: ${updatedTask?.id}`)
    console.log(`[REPROCESS] Transaction ID: ${updatedTransaction?.id}`)
    console.log(`[REPROCESS] Buyer: ${updatedTask?.client?.name || updatedTask?.client?.email}`)
    console.log(`[REPROCESS] Worker: ${updatedTask?.worker?.name || updatedTask?.worker?.email}`)

    return { success: true, task: updatedTask, transaction: updatedTransaction }
  } catch (error) {
    console.error(`[REPROCESS] Error:`, error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  const paymentIntentId = process.argv[2]
  if (!paymentIntentId) {
    console.error('Usage: node scripts/reprocess-payment.js <paymentIntentId>')
    process.exit(1)
  }

  reprocessPayment(paymentIntentId)
    .then(() => {
      console.log('[REPROCESS] Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[REPROCESS] Failed:', error)
      process.exit(1)
    })
}

module.exports = { reprocessPayment }


