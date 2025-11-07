import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

/**
 * POST /api/v1/stripe/account-link
 * Create account link for Stripe dashboard access
 */
export async function POST(req: NextRequest) {
  try {
    const worker = await requireRole('WORKER')
    const body = await req.json()
    const { accountId } = body

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Verify the account belongs to the user
    if (worker.stripeAccountId !== accountId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Create account link for dashboard access
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=true`,
      type: 'account_onboarding',
    })

    return NextResponse.json({
      url: accountLink.url,
    })
  } catch (error: any) {
    console.error('Error creating Stripe account link:', error)
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


