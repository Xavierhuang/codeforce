import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { calculateFees, getFeeConfigFromSettings } from '@/lib/stripe-fees'
import { createNotification } from '@/lib/notifications'
import { logPaymentEvent } from '@/lib/payment-logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

/**
 * Payment Protection for Hourly Work
 * If buyer payment fails, platform covers worker payment
 * This ensures workers get paid for approved time reports even if buyer payment fails
 */
export async function processPaymentProtection(
  weeklyPaymentId: string,
  paymentIntentId: string
): Promise<{
  success: boolean
  platformCovered: boolean
  error?: string
}> {
  try {
    // Get weekly payment with related data
    const weeklyPayment = await prisma.weeklyPayment.findUnique({
      where: { id: weeklyPaymentId },
      include: {
        task: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            worker: {
              select: {
                id: true,
                name: true,
                email: true,
                walletBalance: true,
              },
            },
          },
        },
        timeReport: true,
      },
    })

    if (!weeklyPayment) {
      return {
        success: false,
        platformCovered: false,
        error: 'Weekly payment not found',
      }
    }

    // Check payment intent status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    // If payment succeeded, no protection needed
    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        platformCovered: false,
      }
    }

    // If payment requires payment method (failed to charge), check if we should cover it
    // Note: 'payment_failed' is an event type, not a status. Status can be 'requires_payment_method'
    if (paymentIntent.status === 'requires_payment_method' || paymentIntent.status === 'canceled') {
      // Verify time report is approved (required for protection)
      if (weeklyPayment.timeReport.status !== 'APPROVED') {
        return {
          success: false,
          platformCovered: false,
          error: 'Time report must be approved for payment protection',
        }
      }

      // Platform covers the worker payment
      const workerPayout = weeklyPayment.workerPayout

      // Ensure workerId exists
      if (!weeklyPayment.task.workerId) {
        return {
          success: false,
          platformCovered: false,
          error: 'Task has no assigned worker',
        }
      }

      // Update worker wallet
      await prisma.user.update({
        where: { id: weeklyPayment.task.workerId },
        data: {
          walletBalance: {
            increment: workerPayout,
          },
        },
      })

      // Update weekly payment status
      await prisma.weeklyPayment.update({
        where: { id: weeklyPaymentId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      })

      // Update transaction status
      if (weeklyPayment.transactionId) {
        const transaction = await prisma.transaction.findUnique({
          where: { id: weeklyPayment.transactionId },
        })
        
        if (transaction) {
          await prisma.transaction.update({
            where: { id: weeklyPayment.transactionId },
            data: {
              status: 'CAPTURED',
              metadata: {
                ...(transaction.metadata as any || {}),
                platformCovered: true,
                buyerPaymentFailed: true,
                protectionReason: 'Buyer payment failed',
              } as any,
            },
          })
        }
      }

      // Mark time report as processed
      await prisma.timeReport.update({
        where: { id: weeklyPayment.timeReportId },
        data: {
          paymentProcessed: true,
          paymentProcessedAt: new Date(),
        },
      })

      // Notify worker
      await createNotification(
        weeklyPayment.task.workerId,
        'payment_received',
        `Payment protection applied: $${workerPayout.toFixed(2)} for ${weeklyPayment.hoursWorked} hours (buyer payment failed, platform covered)`,
        weeklyPayment.taskId
      )

      // Notify buyer
      await createNotification(
        weeklyPayment.task.clientId,
        'payment_received',
        `Payment failed for weekly time report. Platform has covered the worker payment. Please update your payment method.`,
        weeklyPayment.taskId
      )

      // Log payment protection event
      await logPaymentEvent({
        level: 'INFO',
        eventType: 'payment_protection_applied',
        paymentIntentId,
        taskId: weeklyPayment.taskId,
        buyerId: weeklyPayment.task.clientId,
        workerId: weeklyPayment.task.workerId,
        amount: workerPayout,
        message: `Payment protection applied: Platform covered $${workerPayout} for worker due to buyer payment failure`,
        metadata: {
          weeklyPaymentId,
          timeReportId: weeklyPayment.timeReportId,
          buyerPaymentStatus: paymentIntent.status,
        },
      })

      return {
        success: true,
        platformCovered: true,
      }
    }

    // Payment is still pending or in another state
    return {
      success: false,
      platformCovered: false,
      error: `Payment status is ${paymentIntent.status}, not eligible for protection yet`,
    }
  } catch (error: any) {
    console.error('[PAYMENT_PROTECTION] Error processing payment protection:', error)
    
    await logPaymentEvent({
      level: 'ERROR',
      eventType: 'payment_protection_failed',
      taskId: weeklyPaymentId,
      message: `Failed to process payment protection: ${error.message}`,
      metadata: {
        error: error.message,
      },
    })

    return {
      success: false,
      platformCovered: false,
      error: error.message,
    }
  }
}

/**
 * Check and apply payment protection for failed payments
 * Should be called after payment processing attempts
 */
export async function checkAndApplyPaymentProtection(
  weeklyPaymentId: string
): Promise<boolean> {
  try {
    const weeklyPayment = await prisma.weeklyPayment.findUnique({
      where: { id: weeklyPaymentId },
    })

    if (!weeklyPayment || !weeklyPayment.paymentIntentId) {
      return false
    }

    const result = await processPaymentProtection(
      weeklyPaymentId,
      weeklyPayment.paymentIntentId
    )

    return result.success && result.platformCovered
  } catch (error) {
    console.error('[PAYMENT_PROTECTION] Error checking payment protection:', error)
    return false
  }
}

