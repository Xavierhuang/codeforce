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

    // Process payment release if PaymentIntent exists
    if (task.paymentIntentId) {
      try {
        // Capture the payment (releases from hold)
        const paymentIntent = await stripe.paymentIntents.retrieve(
          task.paymentIntentId
        )

        if (paymentIntent.status === 'requires_capture') {
          await stripe.paymentIntents.capture(task.paymentIntentId)

          // Calculate payout amounts using centralized function with database settings
          // Worker gets: baseAmount - platformFee (platform covers Stripe fees)
          // Trust & Support fee is NOT deducted from worker (it's a buyer fee)
          const baseAmount = task.price || 0
          const feeConfig = await getFeeConfigFromSettings()
          const fees = calculateFees(baseAmount, feeConfig)

          // Add earnings to worker's wallet instead of automatic transfer
          await prisma.$transaction([
            // Update worker's wallet balance
            prisma.user.update({
              where: { id: worker.id },
              data: {
                walletBalance: {
                  increment: fees.workerPayout,
                },
              },
            }),
            // Record payout for tracking
            prisma.payout.create({
              data: {
                workerId: worker.id,
                amount: fees.workerPayout,
                fee: fees.platformFee,
                taskId: task.id,
              },
            }),
          ])
        }
      } catch (stripeError: any) {
        console.error('Stripe capture error:', stripeError)
        // Task is marked complete, but payment needs manual review
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



