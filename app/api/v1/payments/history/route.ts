import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get tasks where user is client or worker with payments
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { clientId: user.id },
          { workerId: user.id },
        ],
        AND: [
          {
            OR: [
              { paymentIntentId: { not: null } },
              { stripeChargeId: { not: null } },
            ],
          },
        ],
      },
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })

    // Enrich with Stripe payment data
    const payments = await Promise.all(
      tasks.map(async (task) => {
        let paymentData: any = {
          taskId: task.id,
          taskTitle: task.title,
          amount: task.price || 0,
          status: task.status,
          createdAt: task.createdAt,
          completedAt: task.completedAt,
          client: task.client,
          worker: task.worker,
          refundStatus: task.refundStatus,
          refundAmount: task.refundAmount,
        }

        // Fetch payment details from Stripe if available
        if (task.paymentIntentId) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(
              task.paymentIntentId
            )
            paymentData.paymentIntent = {
              id: paymentIntent.id,
              status: paymentIntent.status,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              created: new Date(paymentIntent.created * 1000),
            }
          } catch (error) {
            console.error('Error fetching payment intent:', error)
          }
        }

        if (task.stripeChargeId) {
          try {
            const charge = await stripe.charges.retrieve(task.stripeChargeId)
            paymentData.charge = {
              id: charge.id,
              amount: charge.amount / 100,
              currency: charge.currency,
              status: charge.status,
              created: new Date(charge.created * 1000),
              refunded: charge.refunded,
              amountRefunded: charge.amount_refunded / 100,
            }
          } catch (error) {
            console.error('Error fetching charge:', error)
          }
        }

        if (task.refundId) {
          try {
            const refund = await stripe.refunds.retrieve(task.refundId)
            paymentData.refund = {
              id: refund.id,
              amount: refund.amount / 100,
              currency: refund.currency,
              status: refund.status,
              created: new Date(refund.created * 1000),
              reason: refund.reason,
            }
          } catch (error) {
            console.error('Error fetching refund:', error)
          }
        }

        return paymentData
      })
    )

    // Get total count
    const totalCount = await prisma.task.count({
      where: {
        OR: [
          { clientId: user.id },
          { workerId: user.id },
        ],
        AND: [
          {
            OR: [
              { paymentIntentId: { not: null } },
              { stripeChargeId: { not: null } },
            ],
          },
        ],
      },
    })

    return NextResponse.json({
      payments,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error: any) {
    console.error('Error fetching payment history:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

