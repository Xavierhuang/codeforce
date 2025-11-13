import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { createNotification, checkAndSendOfflineNotification } from '@/lib/notifications'
import { triggerMessageEvent } from '@/lib/pusher'
import { calculateFees, getFeeConfigFromSettings } from '@/lib/stripe-fees'
import { sendReceiptEmail } from '@/lib/email'
import { logPaymentEvent } from '@/lib/payment-logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

/**
 * Handle offer purchase: Auto-create task and assign to worker
 */
export async function handleOfferPurchase(
  paymentIntent: Stripe.PaymentIntent,
  metadata: Record<string, string>
) {
  const { offerId, buyerId, workerId, taskId } = metadata

  console.log(`[PAYMENT_HANDLER] handleOfferPurchase - offerId: ${offerId}, buyerId: ${buyerId}, workerId: ${workerId}`)

  // Check if task already exists (prevent duplicates)
  const existingTask = await prisma.task.findFirst({
    where: { paymentIntentId: paymentIntent.id },
  })

  if (existingTask) {
    console.log(`[PAYMENT_HANDLER] Task already exists for payment intent ${paymentIntent.id}: ${existingTask.id}`)
    return existingTask
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      worker: true,
      task: true,
    },
  })

  if (!offer) {
    console.error('[PAYMENT_HANDLER] Offer not found:', offerId)
    return null
  }

  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: { id: true, name: true, email: true, phone: true },
  })

  if (!buyer) {
    console.error('[PAYMENT_HANDLER] Buyer not found:', buyerId)
    return null
  }

  const feeConfig = await getFeeConfigFromSettings()
  const fees = calculateFees(offer.price, feeConfig)

  const task = await prisma.$transaction(async (tx) => {
    await tx.offer.update({
      where: { id: offerId },
      data: { status: 'ACCEPTED' },
    })

    const newTask = await tx.task.create({
      data: {
        title: offer.task.title || `Task from ${offer.worker.name}`,
        description: offer.message || offer.task.description || '',
        clientId: buyerId,
        workerId: workerId,
        offerId: offerId,
        category: offer.task.category || 'General',
        type: offer.task.type || 'VIRTUAL',
        status: 'ASSIGNED',
        price: offer.price,
        estimatedDurationMins: offer.estimatedDurationMins,
        paymentIntentId: paymentIntent.id,
      },
      include: {
        client: true,
        worker: true,
      },
    })

    await tx.transaction.create({
      data: {
        paymentIntentId: paymentIntent.id,
        buyerId: buyerId,
        workerId: workerId,
        taskId: newTask.id,
        amount: fees.totalAmount,
        baseAmount: offer.price,
        platformFee: fees.platformFee,
        stripeFee: fees.stripeFee,
        status: 'CAPTURED',
        captureMethod: 'automatic',
        metadata: metadata as any,
      },
    })

    console.log(`[PAYMENT_HANDLER] Created task ${newTask.id} and transaction for payment ${paymentIntent.id}`)
    return newTask
  })

  await Promise.all([
    createNotification(
      workerId,
      'task_created',
      `New task "${task.title}" has been assigned to you`,
      task.id
    ),
    createNotification(
      buyerId,
      'offer_accepted',
      `Your purchase was successful. Task "${task.title}" has been created`,
      task.id
    ),
  ])

  try {
    const receiptSent = await sendReceiptEmail({
      transactionId: paymentIntent.id,
      paymentIntentId: paymentIntent.id,
      buyerName: buyer.name || buyer.email,
      buyerEmail: buyer.email,
      workerName: offer.worker.name || undefined,
      taskTitle: task.title,
      taskId: task.id,
      amount: fees.totalAmount,
      baseAmount: offer.price,
      platformFee: fees.platformFee,
      stripeFee: fees.stripeFee,
      date: new Date(),
      status: 'Completed',
    })

    if (receiptSent) {
      await prisma.transaction.update({
        where: { paymentIntentId: paymentIntent.id },
        data: { receiptSent: true, receiptSentAt: new Date() },
      })
    }
  } catch (emailError: any) {
    console.error(`[PAYMENT_HANDLER] Failed to send receipt email:`, emailError)
  }

  if (offer.worker.phone) {
    await checkAndSendOfflineNotification(
      workerId,
      offer.worker.name || 'Worker',
      offer.worker.phone,
      `you have a new task "${task.title}" on Skilly.com`,
      task.id
    )
  }

  try {
    await triggerMessageEvent(`task-${task.id}`, {
      type: 'task_created',
      taskId: task.id,
      message: 'Task created and assigned',
    })
  } catch (error) {
    console.error('[PAYMENT_HANDLER] Failed to trigger Pusher event:', error)
  }

  return task
}

/**
 * Handle direct booking: Auto-create task from booking details
 */
export async function handleDirectBooking(
  paymentIntent: Stripe.PaymentIntent,
  metadata: Record<string, string>
) {
  const { buyerId, workerId, taskType, category, scheduledAt, durationHours, weeklyHourLimit, baseAmount, taskDetails, address, unit, city, postalCode } = metadata

  console.log(`[PAYMENT_HANDLER] handleDirectBooking - buyerId: ${buyerId}, workerId: ${workerId}, baseAmount: ${baseAmount}`)

  const existingTask = await prisma.task.findFirst({
    where: { paymentIntentId: paymentIntent.id },
  })

  if (existingTask) {
    console.log(`[PAYMENT_HANDLER] Task already exists for payment intent ${paymentIntent.id}: ${existingTask.id}`)
    return existingTask
  }

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
    console.error(`[PAYMENT_HANDLER] Buyer or worker not found - buyerId: ${buyerId}, workerId: ${workerId}`)
    return null
  }

  const feeConfig = await getFeeConfigFromSettings()
  const baseAmountNum = parseFloat(baseAmount)
  const fees = calculateFees(baseAmountNum, feeConfig)

  let fullAddress = null
  if (taskType === 'IN_PERSON' && address) {
    fullAddress = [address, unit, city, postalCode].filter(Boolean).join(', ')
  }

  const task = await prisma.$transaction(async (tx) => {
    const newTask = await tx.task.create({
      data: {
        title: `Task with ${worker.name || 'Worker'}`,
        description: taskDetails || 'Direct booking task',
        clientId: buyerId,
        workerId: workerId,
        category: category || 'General',
        type: taskType === 'IN_PERSON' ? 'IN_PERSON' : 'VIRTUAL',
        status: 'ASSIGNED',
        price: baseAmountNum,
        estimatedDurationMins: Math.round(parseFloat(durationHours) * 60),
        weeklyHourLimit: weeklyHourLimit ? parseInt(weeklyHourLimit) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        address: fullAddress,
        paymentIntentId: paymentIntent.id,
      },
      include: {
        client: true,
        worker: true,
      },
    })

    await tx.transaction.create({
      data: {
        paymentIntentId: paymentIntent.id,
        buyerId: buyerId,
        workerId: workerId,
        taskId: newTask.id,
        amount: fees.totalAmount,
        baseAmount: baseAmountNum,
        platformFee: fees.platformFee,
        stripeFee: fees.stripeFee,
        status: 'CAPTURED',
        captureMethod: 'automatic',
        metadata: metadata as any,
      },
    })

    console.log(`[PAYMENT_HANDLER] Created task ${newTask.id} and transaction for payment ${paymentIntent.id}`)

    return newTask
  })

  await Promise.all([
    createNotification(
      workerId,
      'task_created',
      `New task "${task.title}" has been assigned to you`,
      task.id
    ),
    createNotification(
      buyerId,
      'offer_accepted',
      `Your booking was successful. Task "${task.title}" has been created`,
      task.id
    ),
  ])

  try {
    const receiptSent = await sendReceiptEmail({
      transactionId: paymentIntent.id,
      paymentIntentId: paymentIntent.id,
      buyerName: buyer.name || buyer.email,
      buyerEmail: buyer.email,
      workerName: worker.name || undefined,
      taskTitle: task.title,
      taskId: task.id,
      amount: fees.totalAmount,
      baseAmount: baseAmountNum,
      platformFee: fees.platformFee,
      stripeFee: fees.stripeFee,
      date: new Date(),
      status: 'Completed',
    })

    if (receiptSent) {
      await prisma.transaction.update({
        where: { paymentIntentId: paymentIntent.id },
        data: { receiptSent: true, receiptSentAt: new Date() },
      })
    }
  } catch (emailError: any) {
    console.error(`[PAYMENT_HANDLER] Failed to send receipt email:`, emailError)
  }

  if (worker.phone) {
    await checkAndSendOfflineNotification(
      workerId,
      worker.name || 'Worker',
      worker.phone,
      `you have a new task "${task.title}" on Skilly.com`,
      task.id
    )
  }

  try {
    await triggerMessageEvent(`task-${task.id}`, {
      type: 'task_created',
      taskId: task.id,
      message: 'Task created and assigned',
    })
  } catch (error) {
    console.error('[PAYMENT_HANDLER] Failed to trigger Pusher event:', error)
  }

  return task
}

