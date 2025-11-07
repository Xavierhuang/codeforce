import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { calculateAmountInCents } from '@/lib/stripe-fees'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

// Create payout request
export async function POST(req: NextRequest) {
  try {
    const worker = await requireRole('WORKER')
    const body = await req.json()
    const { amount, notes } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Get current wallet balance
    const user = await prisma.user.findUnique({
      where: { id: worker.id },
      select: { walletBalance: true },
    })

    if (!user || user.walletBalance < amount) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance' },
        { status: 400 }
      )
    }

    // Check for pending requests
    const pendingRequest = await prisma.payoutRequest.findFirst({
      where: {
        workerId: worker.id,
        status: 'PENDING',
      },
    })

    if (pendingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending payout request' },
        { status: 400 }
      )
    }

    // Create payout request
    const payoutRequest = await prisma.payoutRequest.create({
      data: {
        workerId: worker.id,
        amount,
        notes: notes || null,
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
            walletBalance: true,
          },
        },
      },
    })

    return NextResponse.json(payoutRequest)
  } catch (error: any) {
    console.error('Error creating payout request:', error)
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

// List payout requests
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    let where: any = {}

    if (user.role === 'WORKER') {
      // Workers can only see their own requests
      where.workerId = user.id
    } else if (user.role === 'ADMIN') {
      // Admins can filter by status
      if (status) {
        where.status = status
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requests = await prisma.payoutRequest.findMany({
      where,
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
            walletBalance: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(requests)
  } catch (error: any) {
    console.error('Error fetching payout requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

