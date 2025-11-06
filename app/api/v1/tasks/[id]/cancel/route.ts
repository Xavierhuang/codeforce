import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { reason } = body

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        worker: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only client or assigned worker can cancel
    if (task.clientId !== user.id && task.workerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You do not have permission to cancel this task' },
        { status: 403 }
      )
    }

    // Can't cancel if already completed or cancelled
    if (task.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed task' },
        { status: 400 }
      )
    }

    if (task.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Task is already cancelled' },
        { status: 400 }
      )
    }

    // Handle refund if payment was made
    let refundProcessed = false
    if (task.paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(task.paymentIntentId)

        // If payment was captured, create a refund
        if (paymentIntent.status === 'succeeded' && task.stripeChargeId) {
          const refund = await stripe.refunds.create({
            charge: task.stripeChargeId,
            reason: 'requested_by_customer',
            metadata: {
              taskId: task.id,
              cancelledBy: user.id,
              reason: reason || 'No reason provided',
            },
          })

          refundProcessed = true

          // TODO: Send notification to client about refund
        } else if (paymentIntent.status === 'requires_capture') {
          // If payment is still on hold, just cancel the payment intent
          await stripe.paymentIntents.cancel(task.paymentIntentId)
          refundProcessed = true
        }
      } catch (stripeError: any) {
        console.error('Stripe refund error:', stripeError)
        // Continue with cancellation even if refund fails (admin can handle manually)
      }
    }

    // Update task status to CANCELLED
    await prisma.task.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        workerId: null, // Unassign worker
      },
    })

    // Decline all pending offers
    await prisma.offer.updateMany({
      where: {
        taskId: params.id,
        status: 'PENDING',
      },
      data: {
        status: 'DECLINED',
      },
    })

    // TODO: Send notifications to client and worker

    return NextResponse.json({
      success: true,
      message: 'Task cancelled successfully',
      refundProcessed,
    })
  } catch (error: any) {
    console.error('Error cancelling task:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


