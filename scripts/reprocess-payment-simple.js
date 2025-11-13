/**
 * Simple script to reprocess payment - uses direct Prisma/Stripe calls
 * Usage: node scripts/reprocess-payment-simple.js <paymentIntentId>
 */

const { PrismaClient } = require('@prisma/client')
const Stripe = require('stripe')

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

async function reprocessPayment(paymentIntentId) {
  try {
    console.log(`\n[REPROCESS] Starting reprocess for: ${paymentIntentId}\n`)

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    const metadata = paymentIntent.metadata

    console.log(`Status: ${paymentIntent.status}`)
    console.log(`Amount: $${(paymentIntent.amount / 100).toFixed(2)}`)
    console.log(`Type: ${metadata.type}`)
    console.log(`Buyer: ${metadata.buyerId}`)
    console.log(`Worker: ${metadata.workerId}`)

    // Capture if needed
    if (paymentIntent.status === 'requires_capture') {
      console.log(`\n[REPROCESS] Capturing payment...`)
      const captured = await stripe.paymentIntents.capture(paymentIntent.id)
      console.log(`✅ Captured! New status: ${captured.status}\n`)
    }

    // Check existing records
    const existingTask = await prisma.task.findFirst({
      where: { paymentIntentId: paymentIntent.id },
    })
    const existingTransaction = await prisma.transaction.findUnique({
      where: { paymentIntentId: paymentIntent.id },
    })

    console.log(`Existing task: ${existingTask ? existingTask.id : 'None'}`)
    console.log(`Existing transaction: ${existingTransaction ? existingTransaction.id : 'None'}\n`)

    // Process direct booking
    if (metadata.type === 'direct_booking' && !existingTask) {
      console.log(`[REPROCESS] Creating task for direct booking...`)

      const buyer = await prisma.user.findUnique({
        where: { id: metadata.buyerId },
        select: { id: true, name: true, email: true },
      })
      const worker = await prisma.user.findUnique({
        where: { id: metadata.workerId },
        select: { id: true, name: true, email: true },
      })

      if (!buyer || !worker) {
        throw new Error(`Buyer or worker not found - buyer: ${buyer ? 'found' : 'missing'}, worker: ${worker ? 'found' : 'missing'}`)
      }

      const baseAmount = parseFloat(metadata.baseAmount || '0')
      
      // Calculate fees
      const settings = await prisma.settings.findFirst()
      const feeConfig = {
        platformFeeRate: settings?.platformFeeRate || 0.15,
        trustAndSupportFeeRate: settings?.trustAndSupportFeeRate || 0.15,
        stripeFeeRate: settings?.stripeFeeRate || 0.029,
        stripeFeeFixed: settings?.stripeFeeFixed || 0.30,
      }

      const platformFee = baseAmount * feeConfig.platformFeeRate
      const trustAndSupportFee = baseAmount * feeConfig.trustAndSupportFeeRate
      const stripeFee = (baseAmount * feeConfig.stripeFeeRate) + feeConfig.stripeFeeFixed
      const totalAmount = baseAmount + platformFee + trustAndSupportFee + stripeFee
      const workerPayout = baseAmount - platformFee

      let fullAddress = null
      if (metadata.taskType === 'IN_PERSON' && metadata.address) {
        fullAddress = [metadata.address, metadata.unit, metadata.city, metadata.postalCode].filter(Boolean).join(', ')
      }

      // Create task and transaction
      const result = await prisma.$transaction(async (tx) => {
        const task = await tx.task.create({
          data: {
            title: `Task with ${worker.name || 'Worker'}`,
            description: metadata.taskDetails || 'Direct booking task',
            clientId: metadata.buyerId,
            workerId: metadata.workerId,
            category: metadata.category || 'General',
            type: metadata.taskType === 'IN_PERSON' ? 'IN_PERSON' : 'VIRTUAL',
            status: 'ASSIGNED',
            price: baseAmount,
            estimatedDurationMins: Math.round(parseFloat(metadata.durationHours || '1') * 60),
            scheduledAt: metadata.scheduledAt ? new Date(metadata.scheduledAt) : null,
            address: fullAddress,
            paymentIntentId: paymentIntent.id,
          },
        })

        const transaction = await tx.transaction.create({
          data: {
            paymentIntentId: paymentIntent.id,
            buyerId: metadata.buyerId,
            workerId: metadata.workerId,
            taskId: task.id,
            amount: totalAmount,
            baseAmount: baseAmount,
            platformFee: platformFee,
            stripeFee: stripeFee,
            status: 'CAPTURED',
            captureMethod: 'automatic',
            metadata: metadata,
          },
        })

        return { task, transaction }
      })

      console.log(`✅ Task created: ${result.task.id}`)
      console.log(`✅ Transaction created: ${result.transaction.id}`)

      // Create notifications (skip if module not found - notifications are optional)
      try {
        const { createNotification } = require('../lib/notifications')
        await Promise.all([
          createNotification(
            metadata.workerId,
            'task_created',
            `New task "${result.task.title}" has been assigned to you`,
            result.task.id
          ),
          createNotification(
            metadata.buyerId,
            'offer_accepted',
            `Your booking was successful. Task "${result.task.title}" has been created`,
            result.task.id
          ),
        ])
        console.log(`✅ Notifications sent\n`)
      } catch (notifError) {
        console.log(`⚠️  Notifications skipped (module not available)\n`)
      }
    } else if (existingTask) {
      console.log(`✅ Task already exists: ${existingTask.id}`)
    }

    // Ensure transaction exists (check again after task creation)
    const currentTransaction = await prisma.transaction.findUnique({
      where: { paymentIntentId: paymentIntent.id },
    })
    
    if (!currentTransaction) {
      const baseAmount = parseFloat(metadata.baseAmount || '0')
      const settings = await prisma.settings.findFirst()
      const feeConfig = {
        platformFeeRate: settings?.platformFeeRate || 0.15,
        trustAndSupportFeeRate: settings?.trustAndSupportFeeRate || 0.15,
        stripeFeeRate: settings?.stripeFeeRate || 0.029,
        stripeFeeFixed: settings?.stripeFeeFixed || 0.30,
      }

      const platformFee = baseAmount * feeConfig.platformFeeRate
      const trustAndSupportFee = baseAmount * feeConfig.trustAndSupportFeeRate
      const stripeFee = (baseAmount * feeConfig.stripeFeeRate) + feeConfig.stripeFeeFixed
      const totalAmount = baseAmount + platformFee + trustAndSupportFee + stripeFee

      const taskForTransaction = await prisma.task.findFirst({
        where: { paymentIntentId: paymentIntent.id },
      })

      const transaction = await prisma.transaction.create({
        data: {
          paymentIntentId: paymentIntent.id,
          buyerId: metadata.buyerId || metadata.clientId || '',
          workerId: metadata.workerId || undefined,
          taskId: taskForTransaction?.id || undefined,
          amount: totalAmount,
          baseAmount: baseAmount,
          platformFee: platformFee,
          stripeFee: stripeFee,
          status: 'CAPTURED',
          captureMethod: 'automatic',
          metadata: metadata,
        },
      })

      console.log(`✅ Transaction created: ${transaction.id}\n`)
    }

    // Final check
    const finalTask = await prisma.task.findFirst({
      where: { paymentIntentId: paymentIntent.id },
      include: { client: true, worker: true },
    })
    const finalTransaction = await prisma.transaction.findUnique({
      where: { paymentIntentId: paymentIntent.id },
    })

    console.log(`\n✅ REPROCESS COMPLETE!\n`)
    console.log(`Task ID: ${finalTask?.id}`)
    console.log(`Task Title: ${finalTask?.title}`)
    console.log(`Buyer: ${finalTask?.client?.name || finalTask?.client?.email}`)
    console.log(`Worker: ${finalTask?.worker?.name || finalTask?.worker?.email}`)
    console.log(`Transaction ID: ${finalTransaction?.id}`)
    console.log(`Status: ${finalTransaction?.status}`)
    console.log(`Amount: $${finalTransaction?.amount?.toFixed(2)}\n`)

    return { success: true, task: finalTask, transaction: finalTransaction }
  } catch (error) {
    console.error(`\n❌ ERROR:`, error.message)
    console.error(error.stack)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  const paymentIntentId = process.argv[2]
  if (!paymentIntentId) {
    console.error('Usage: node scripts/reprocess-payment-simple.js <paymentIntentId>')
    process.exit(1)
  }

  reprocessPayment(paymentIntentId)
    .then(() => {
      console.log('Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Failed:', error)
      process.exit(1)
    })
}

module.exports = { reprocessPayment }

