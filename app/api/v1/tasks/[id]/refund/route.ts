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
    const { reason, amount } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Refund reason is required' },
        { status: 400 }
      )
    }

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

    // Only client can request refund
    if (task.clientId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if task is in a refundable state
    if (task.status !== 'COMPLETED' && task.status !== 'ASSIGNED' && task.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Task is not in a refundable state' },
        { status: 400 }
      )
    }

    // Check if refund already requested
    if (task.refundStatus && task.refundStatus !== 'NONE') {
      return NextResponse.json(
        { error: 'Refund already requested for this task' },
        { status: 400 }
      )
    }

    // Check if payment was made
    if (!task.stripeChargeId && !task.paymentIntentId) {
      return NextResponse.json(
        { error: 'No payment found for this task' },
        { status: 400 }
      )
    }

    // Calculate refund amount (default to full amount if not specified)
    const refundAmount = amount || task.price || 0

    if (refundAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid refund amount' },
        { status: 400 }
      )
    }

    // Update task with refund request
    await prisma.task.update({
      where: { id: params.id },
      data: {
        refundStatus: 'REQUESTED',
        refundRequestedAt: new Date(),
        refundReason: reason,
        refundAmount: refundAmount,
      },
    })

    // TODO: Notify worker about refund request
    // TODO: Auto-approve or send to admin for review

    return NextResponse.json({
      success: true,
      message: 'Refund request submitted successfully',
      refundAmount,
    })
  } catch (error: any) {
    console.error('Error requesting refund:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Process refund (admin or auto-approve)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { action } = body // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      )
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only client (for auto-approve after time) or admin can process
    const isClient = task.clientId === user.id
    // TODO: Add admin check
    // const isAdmin = user.role === 'ADMIN'

    if (!isClient) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (task.refundStatus !== 'REQUESTED') {
      return NextResponse.json(
        { error: 'No refund request found for this task' },
        { status: 400 }
      )
    }

    if (action === 'reject') {
      await prisma.task.update({
        where: { id: params.id },
        data: {
          refundStatus: 'REJECTED',
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Refund request rejected',
      })
    }

    // Approve refund - process with Stripe
    if (!task.stripeChargeId) {
      return NextResponse.json(
        { error: 'No charge ID found for refund' },
        { status: 400 }
      )
    }

    try {
      const refundAmountCents = Math.round((task.refundAmount || task.price || 0) * 100)

      const refund = await stripe.refunds.create({
        charge: task.stripeChargeId,
        amount: refundAmountCents,
        metadata: {
          taskId: task.id,
          reason: task.refundReason || 'Client request',
        },
        reason: 'requested_by_customer',
      })

      // Update task with refund status
      await prisma.task.update({
        where: { id: params.id },
        data: {
          refundStatus: 'PROCESSED',
          refundId: refund.id,
        },
      })

      // TODO: Notify client and worker about refund

      return NextResponse.json({
        success: true,
        message: 'Refund processed successfully',
        refundId: refund.id,
        amount: refundAmountCents / 100,
      })
    } catch (stripeError: any) {
      console.error('Stripe refund error:', stripeError)
      return NextResponse.json(
        {
          error: 'Failed to process refund',
          details: stripeError.message,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error processing refund:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

