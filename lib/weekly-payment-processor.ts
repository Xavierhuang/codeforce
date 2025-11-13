import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { calculateFees, getFeeConfigFromSettings, calculateAmountInCents } from '@/lib/stripe-fees'
import { createNotification } from '@/lib/notifications'
import { logPaymentEvent } from '@/lib/payment-logger'
import { sendReceiptEmail } from '@/lib/email'
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

interface ProcessedPayment {
  timeReportId: string
  taskId: string
  buyerId: string
  workerId: string
  weeklyPaymentId: string
  transactionId: string
  paymentIntentId: string
  success: boolean
  error?: string
}

/**
 * Process weekly payments for approved time reports from the previous week
 * Runs on Monday 00:00 UTC to process reports from Sunday 23:59 UTC deadline
 */
export async function processWeeklyPayments(): Promise<{
  success: boolean
  processed: ProcessedPayment[]
  errors: string[]
}> {
  const errors: string[] = []
  const processed: ProcessedPayment[] = []

  try {
    // Get previous week (Monday to Sunday)
    const now = new Date()
    const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    const previousWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    previousWeekEnd.setHours(23, 59, 59, 999)

    console.log(`[WEEKLY_PAYMENT] Processing payments for week: ${previousWeekStart.toISOString()} to ${previousWeekEnd.toISOString()}`)

    // Find all APPROVED time reports from previous week that haven't been processed
    const approvedReports = await prisma.timeReport.findMany({
      where: {
        status: 'APPROVED',
        weekStartDate: {
          gte: previousWeekStart,
          lte: previousWeekEnd,
        },
        paymentProcessed: false,
      },
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
                hourlyRate: true,
                stripeAccountId: true,
              },
            },
          },
        },
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
            hourlyRate: true,
            stripeAccountId: true,
          },
        },
      },
    })

    if (approvedReports.length === 0) {
      console.log('[WEEKLY_PAYMENT] No approved time reports to process')
      return { success: true, processed: [], errors: [] }
    }

    console.log(`[WEEKLY_PAYMENT] Found ${approvedReports.length} approved time reports to process`)

    // Get fee configuration
    const feeConfig = await getFeeConfigFromSettings()

    // Process each time report
    for (const report of approvedReports) {
      try {
        const task = report.task
        const worker = report.worker
        const buyer = task.client

        if (!worker.hourlyRate) {
          errors.push(`Task ${task.id}: Worker has no hourly rate set`)
          continue
        }

        // Calculate payment amounts
        const baseAmount = report.hoursWorked * worker.hourlyRate
        const fees = calculateFees(baseAmount, feeConfig)

        console.log(`[WEEKLY_PAYMENT] Processing report ${report.id}: ${report.hoursWorked}h @ $${worker.hourlyRate}/h = $${baseAmount}`)

        // Get buyer's payment method (from previous payment or stored payment method)
        // For now, we'll create a new PaymentIntent and require buyer to confirm
        // In production, you might want to store payment methods for recurring charges

        // Create WeeklyPayment record first (we need the ID for metadata)
        const weeklyPayment = await prisma.weeklyPayment.create({
          data: {
            taskId: task.id,
            timeReportId: report.id,
            weekStartDate: report.weekStartDate,
            weekEndDate: report.weekEndDate,
            hoursWorked: report.hoursWorked,
            hourlyRate: worker.hourlyRate,
            baseAmount: fees.baseAmount,
            platformFee: fees.platformFee,
            stripeFee: fees.stripeFee,
            totalAmount: fees.totalAmount,
            workerPayout: fees.workerPayout,
            status: 'PENDING',
          },
        })

        // Create PaymentIntent for buyer
        const paymentIntent = await stripe.paymentIntents.create({
          amount: calculateAmountInCents(fees.totalAmount),
          currency: 'usd',
          customer: buyer.id, // You may need to create Stripe customers
          description: `Weekly payment for "${task.title}" - ${report.hoursWorked} hours`,
          metadata: {
            type: 'weekly_payment',
            taskId: task.id,
            timeReportId: report.id,
            weeklyPaymentId: weeklyPayment.id,
            buyerId: buyer.id,
            workerId: worker.id,
            hoursWorked: report.hoursWorked.toString(),
            hourlyRate: worker.hourlyRate.toString(),
            weekStartDate: report.weekStartDate.toISOString(),
          },
          automatic_payment_methods: {
            enabled: true,
          },
        })

        // Update WeeklyPayment with payment intent ID
        await prisma.weeklyPayment.update({
          where: { id: weeklyPayment.id },
          data: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
          },
        })

        // Create Transaction record
        const transaction = await prisma.transaction.create({
          data: {
            paymentIntentId: paymentIntent.id,
            buyerId: buyer.id,
            workerId: worker.id,
            taskId: task.id,
            amount: fees.totalAmount,
            baseAmount: fees.baseAmount,
            platformFee: fees.platformFee,
            stripeFee: fees.stripeFee,
            status: paymentIntent.status === 'succeeded' ? 'CAPTURED' : 'PENDING',
            captureMethod: 'automatic',
            metadata: {
              type: 'weekly_payment',
              timeReportId: report.id,
              weeklyPaymentId: weeklyPayment.id,
              hoursWorked: report.hoursWorked,
              hourlyRate: worker.hourlyRate,
              weekStartDate: report.weekStartDate.toISOString(),
            } as any,
          },
        })

        // Update WeeklyPayment with transaction ID
        await prisma.weeklyPayment.update({
          where: { id: weeklyPayment.id },
          data: { transactionId: transaction.id },
        })

        // If payment succeeded, update worker wallet
        if (paymentIntent.status === 'succeeded') {
          await prisma.user.update({
            where: { id: worker.id },
            data: {
              walletBalance: {
                increment: fees.workerPayout,
              },
            },
          })

          // Update time report as processed
          await prisma.timeReport.update({
            where: { id: report.id },
            data: {
              paymentProcessed: true,
              paymentProcessedAt: new Date(),
            },
          })

          // Update weekly payment status
          await prisma.weeklyPayment.update({
            where: { id: weeklyPayment.id },
            data: {
              status: 'COMPLETED',
              processedAt: new Date(),
            },
          })

          // Send notifications
          await createNotification(
            worker.id,
            'payment_received',
            `Weekly payment processed: $${fees.workerPayout.toFixed(2)} for ${report.hoursWorked} hours worked`,
            task.id
          )

          await createNotification(
            buyer.id,
            'payment_received',
            `Weekly payment charged: $${fees.totalAmount.toFixed(2)} for ${report.hoursWorked} hours`,
            task.id
          )

          // Send receipt email
          try {
            await sendReceiptEmail({
              buyerEmail: buyer.email,
              buyerName: buyer.name || 'Customer',
              amount: fees.totalAmount,
              baseAmount: fees.baseAmount,
              platformFee: fees.platformFee,
              stripeFee: fees.stripeFee,
              taskTitle: task.title,
              taskId: task.id,
              transactionId: transaction.id,
              paymentIntentId: paymentIntent.id,
              workerName: worker.name || undefined,
              date: new Date(),
              status: 'COMPLETED',
            })
          } catch (emailError) {
            console.error(`[WEEKLY_PAYMENT] Failed to send receipt email:`, emailError)
          }

          // Log payment event
          await logPaymentEvent({
            level: 'INFO',
            eventType: 'weekly_payment_processed',
            paymentIntentId: paymentIntent.id,
            taskId: task.id,
            buyerId: buyer.id,
            workerId: worker.id,
            amount: fees.totalAmount,
            message: `Weekly payment processed successfully: ${report.hoursWorked}h @ $${worker.hourlyRate}/h`,
            metadata: {
              timeReportId: report.id,
              weeklyPaymentId: weeklyPayment.id,
              transactionId: transaction.id,
            },
          })

          processed.push({
            timeReportId: report.id,
            taskId: task.id,
            buyerId: buyer.id,
            workerId: worker.id,
            weeklyPaymentId: weeklyPayment.id,
            transactionId: transaction.id,
            paymentIntentId: paymentIntent.id,
            success: true,
          })
        } else {
          // Payment requires action or failed - check if we should apply payment protection
          // Wait a bit before applying protection (give buyer time to update payment method)
          // For now, just notify buyer
          await createNotification(
            buyer.id,
            'payment_received',
            `Payment required for weekly time report: $${fees.totalAmount.toFixed(2)}`,
            task.id
          )

          // Note: Payment protection will be applied automatically after payment failure
          // This is handled by webhook or manual admin action

          processed.push({
            timeReportId: report.id,
            taskId: task.id,
            buyerId: buyer.id,
            workerId: worker.id,
            weeklyPaymentId: weeklyPayment.id,
            transactionId: transaction.id,
            paymentIntentId: paymentIntent.id,
            success: false,
            error: `Payment requires action: ${paymentIntent.status}`,
          })
        }
      } catch (error: any) {
        const errorMsg = `Failed to process time report ${report.id}: ${error.message}`
        console.error(`[WEEKLY_PAYMENT] ${errorMsg}`, error)
        errors.push(errorMsg)

        // Log error
        await logPaymentEvent({
          level: 'ERROR',
          eventType: 'weekly_payment_failed',
          taskId: report.task.id,
          buyerId: report.task.clientId,
          workerId: report.workerId,
          message: errorMsg,
          metadata: {
            timeReportId: report.id,
            error: error.message,
          },
        })
      }
    }

    return {
      success: errors.length === 0,
      processed,
      errors,
    }
  } catch (error: any) {
    const errorMsg = `Failed to process weekly payments: ${error.message}`
    console.error(`[WEEKLY_PAYMENT] ${errorMsg}`, error)
    return {
      success: false,
      processed,
      errors: [errorMsg, ...errors],
    }
  }
}

