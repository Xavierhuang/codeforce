import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { calculateFees, calculateAmountInCents, getFeeConfigFromSettings } from '@/lib/stripe-fees'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const worker = await requireRole('WORKER')
    const body = await req.json()
    const { proofOfWork } = body // Optional: links, screenshots, etc.

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        client: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.workerId !== worker.id) {
      return NextResponse.json(
        { error: 'You are not assigned to this task' },
        { status: 403 }
      )
    }

    if (task.status !== 'ASSIGNED' && task.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Task is not in a completable state' },
        { status: 400 }
      )
    }

    // Update task status to COMPLETED
    await prisma.task.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    // Process wallet update when task is completed
    // Note: Payment is already captured automatically when payment succeeded (in webhook)
    // We just need to update the worker's wallet here
    if (task.paymentIntentId) {
      try {
        const { logPaymentEvent } = await import('@/lib/payment-logger')
        
        // Check payment status (should already be captured)
        const paymentIntent = await stripe.paymentIntents.retrieve(
          task.paymentIntentId
        )

        await logPaymentEvent({
          paymentIntentId: task.paymentIntentId!,
          eventType: 'task_completed',
          level: 'INFO',
          message: `Task completed - processing wallet update`,
          source: 'task_completion',
          details: {
            taskId: task.id,
            workerId: worker.id,
            paymentStatus: paymentIntent.status,
          },
        })

        // Calculate payout amounts using centralized function with database settings
        // Worker gets: baseAmount - platformFee (platform covers Stripe fees)
        // Trust & Support fee is NOT deducted from worker (it's a buyer fee)
        const baseAmount = task.price || 0
        const feeConfig = await getFeeConfigFromSettings()
        const fees = calculateFees(baseAmount, feeConfig)

        // Add earnings to worker's wallet and update transaction status
        await prisma.$transaction(async (tx) => {
          // Update worker's wallet balance
          await tx.user.update({
            where: { id: worker.id },
            data: {
              walletBalance: {
                increment: fees.workerPayout,
              },
            },
          })

          // Record payout for tracking
          await tx.payout.create({
            data: {
              workerId: worker.id,
              amount: fees.workerPayout,
              fee: fees.platformFee,
              taskId: task.id,
            },
          })

          // Update transaction to set worker payout (payment already captured)
          const transaction = await tx.transaction.findUnique({
            where: { paymentIntentId: task.paymentIntentId! },
          })

          if (transaction) {
            await tx.transaction.update({
              where: { paymentIntentId: task.paymentIntentId! },
              data: {
                workerPayout: fees.workerPayout,
                stripeChargeId: paymentIntent.latest_charge as string | undefined,
                updatedAt: new Date(),
              },
            })

            await logPaymentEvent({
              paymentIntentId: task.paymentIntentId!,
              eventType: 'wallet_updated',
              level: 'INFO',
              message: `Worker wallet updated with payout: ${fees.workerPayout}`,
              source: 'task_completion',
              transactionId: transaction.id,
              details: {
                workerId: worker.id,
                workerPayout: fees.workerPayout,
                platformFee: fees.platformFee,
                baseAmount,
              },
            })
          }
        })
      } catch (error: any) {
        const { logPaymentEvent } = await import('@/lib/payment-logger')
        await logPaymentEvent({
          paymentIntentId: task.paymentIntentId!,
          eventType: 'wallet_update_failed',
          level: 'ERROR',
          message: `Failed to update wallet: ${error.message}`,
          source: 'task_completion',
          details: {
            taskId: task.id,
            error: error.message,
          },
        })
        console.error('Error updating wallet:', error)
        // Task is marked complete, but wallet update failed - needs manual review
      }
    }

    // TODO: Send notification to client

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error completing task:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



