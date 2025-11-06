import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { calculateFees, calculateAmountInCents } from '@/lib/stripe-fees'

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

          // Calculate payout amounts using centralized function
          const baseAmount = task.price || 0
          const fees = calculateFees(baseAmount)

          // If worker has Stripe Connect account, transfer funds
          if (worker.stripeAccountId) {
            try {
              const transfer = await stripe.transfers.create({
                amount: calculateAmountInCents(fees.workerPayout),
                currency: 'usd',
                destination: worker.stripeAccountId,
                metadata: {
                  taskId: task.id,
                },
              })

              // Record payout
              await prisma.payout.create({
                data: {
                  workerId: worker.id,
                  amount: fees.workerPayout,
                  fee: fees.platformFee + fees.stripeFee,
                  stripePayoutId: transfer.id,
                  taskId: task.id,
                },
              })
            } catch (transferError: any) {
              console.error('Transfer error:', transferError)
              // Task is still marked complete, but payout needs manual handling
            }
          } else {
            // Record pending payout (worker needs to set up Stripe account)
            await prisma.payout.create({
              data: {
                workerId: worker.id,
                amount: fees.workerPayout,
                fee: fees.platformFee + fees.stripeFee,
                taskId: task.id,
              },
            })
          }
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

