# Stripe Integration Plan for CodeForce

## Executive Summary

This document outlines a comprehensive plan to enhance and complete the Stripe integration for CodeForce. The platform already has a solid foundation with Stripe Connect for marketplace payments, but there are opportunities to improve user experience, reliability, and feature completeness.

## Current State Analysis

### What's Working
- ✅ Stripe Connect Express accounts for workers
- ✅ PaymentIntent creation for escrow
- ✅ Manual capture on task completion
- ✅ Stripe Connect transfers to workers
- ✅ Basic webhook handling
- ✅ Payment form component

### What Needs Improvement
- ⚠️ Payment form uses deprecated CardElement
- ⚠️ No webhook idempotency handling
- ⚠️ Fee calculations hardcoded in multiple places
- ⚠️ No refund flow
- ⚠️ No dispute handling
- ⚠️ Limited error handling
- ⚠️ No payment history for users
- ⚠️ No admin payment dashboard

## Implementation Phases

### Phase 1: Modernize Payment Components (Priority: HIGH)

**Goal**: Replace deprecated CardElement with Payment Element for better UX and future-proofing.

**Tasks**:
1. Update `components/PaymentForm.tsx` to use Payment Element
2. Migrate from `CardElement` to `PaymentElement`
3. Add support for multiple payment methods
4. Improve error handling and validation
5. Add loading states and better UX

**Estimated Time**: 4-6 hours

**Files to Modify**:
- `components/PaymentForm.tsx`
- `app/api/v1/tasks/[id]/accept-offer/route.ts` (if needed)

**Dependencies**:
- `@stripe/react-stripe-js` (already installed)
- Stripe API version 2023-10-16+ (already using)

### Phase 2: Improve Webhook Reliability (Priority: HIGH)

**Goal**: Ensure webhooks are processed reliably and idempotently.

**Tasks**:
1. Add webhook event tracking table
2. Implement idempotency checks
3. Add retry logic for failed webhooks
4. Improve error logging
5. Add webhook event replay capability

**Estimated Time**: 6-8 hours

**Files to Modify**:
- `app/api/v1/stripe/webhook/route.ts`
- `prisma/schema.prisma` (add WebhookEvent model)
- Create migration

**Database Changes**:
```prisma
model WebhookEvent {
  id          String   @id @default(cuid())
  stripeEventId String @unique
  type        String
  processed   Boolean  @default(false)
  processedAt DateTime?
  error       String?
  retryCount  Int      @default(0)
  data        Json?
  createdAt   DateTime @default(now())
}
```

### Phase 3: Centralize Fee Configuration (Priority: MEDIUM)

**Goal**: Create a single source of truth for fee calculations.

**Tasks**:
1. Create `lib/stripe-fees.ts` utility
2. Move fee calculations to centralized functions
3. Update all payment-related endpoints
4. Add environment variables for fee rates
5. Document fee structure

**Estimated Time**: 3-4 hours

**Files to Create**:
- `lib/stripe-fees.ts`

**Files to Modify**:
- `app/api/v1/tasks/[id]/accept-offer/route.ts`
- `app/api/v1/tasks/[id]/complete/route.ts`
- Any other files with fee calculations

### Phase 4: Implement Refund Flow (Priority: MEDIUM)

**Goal**: Allow clients to request refunds and handle disputes.

**Tasks**:
1. Add refund endpoint
2. Create refund request UI
3. Handle partial refunds
4. Add refund status tracking
5. Update webhook handler for refund events

**Estimated Time**: 8-10 hours

**Files to Create**:
- `app/api/v1/tasks/[id]/refund/route.ts`
- `components/RefundRequestForm.tsx`

**Files to Modify**:
- `prisma/schema.prisma` (add refund fields to Task)
- `app/api/v1/stripe/webhook/route.ts`

**Database Changes**:
```prisma
model Task {
  // ... existing fields
  refundRequestedAt DateTime?
  refundAmount      Float?
  refundStatus      RefundStatus?
  refundReason      String?
}

enum RefundStatus {
  NONE
  REQUESTED
  APPROVED
  REJECTED
  PROCESSED
}
```

### Phase 5: Payment History & Receipts (Priority: LOW)

**Goal**: Provide users with payment history and downloadable receipts.

**Tasks**:
1. Create payment history endpoint
2. Build payment history UI component
3. Generate PDF receipts
4. Add email receipts via Stripe
5. Add to user dashboard

**Estimated Time**: 6-8 hours

**Files to Create**:
- `app/api/v1/payments/history/route.ts`
- `components/PaymentHistory.tsx`
- `lib/receipt-generator.ts`

**Files to Modify**:
- `app/dashboard/page.tsx`
- `app/api/v1/stripe/webhook/route.ts` (enable email receipts)

### Phase 6: Admin Payment Dashboard (Priority: LOW)

**Goal**: Give admins visibility into payments, disputes, and revenue.

**Tasks**:
1. Create admin payment overview
2. Add payment reconciliation tools
3. Build dispute management interface
4. Add revenue analytics
5. Export payment data

**Estimated Time**: 10-12 hours

**Files to Create**:
- `app/admin/payments/page.tsx`
- `app/api/v1/admin/payments/route.ts`
- `components/admin/PaymentDashboard.tsx`

**Files to Modify**:
- `app/admin/page.tsx`

## Detailed Implementation Guides

### Phase 1: Modernize Payment Components

#### Step 1: Update PaymentForm.tsx

**Current Implementation Issues**:
- Uses deprecated `CardElement`
- Limited payment method support
- Basic error handling

**New Implementation**:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface PaymentFormProps {
  clientSecret: string
  amount: number
  onSuccess: () => void
  onCancel: () => void
}

function PaymentFormContent({ clientSecret, amount, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setError(submitError.message || 'Payment failed')
        setIsProcessing(false)
        return
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/tasks/payment-success`,
        },
        redirect: 'if_required',
      })

      if (confirmError) {
        setError(confirmError.message || 'Payment failed')
        setIsProcessing(false)
        return
      }

      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
        toast.success('Payment authorized! Task is now assigned.')
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
          <CardDescription>
            Total amount: ${(amount / 100).toFixed(2)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-md bg-muted/50">
            <PaymentElement
              options={{
                layout: 'tabs',
              }}
            />
          </div>
          
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your payment will be held in escrow until the task is completed.
          </p>
        </CardContent>
      </Card>
    </form>
  )
}

export function PaymentForm({ clientSecret, amount, onSuccess, onCancel }: PaymentFormProps) {
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: 'hsl(var(--primary))',
      },
    },
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormContent
        clientSecret={clientSecret}
        amount={amount}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  )
}
```

**Key Changes**:
- ✅ Replaced `CardElement` with `PaymentElement`
- ✅ Added better error handling
- ✅ Improved loading states
- ✅ Better UX with tabs layout
- ✅ Uses `confirmPayment` with `redirect: 'if_required'`

#### Step 2: Test Payment Flow

1. Test with Stripe test cards
2. Verify payment authorization
3. Check webhook processing
4. Test error scenarios

### Phase 2: Improve Webhook Reliability

#### Step 1: Add WebhookEvent Model

```prisma
model WebhookEvent {
  id            String   @id @default(cuid())
  stripeEventId String   @unique
  type          String
  processed     Boolean  @default(false)
  processedAt   DateTime?
  error         String?
  retryCount    Int      @default(0)
  data          Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([stripeEventId])
  @@index([processed])
  @@index([type])
}
```

#### Step 2: Update Webhook Handler

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  // Check if event already processed (idempotency)
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { stripeEventId: event.id },
  })

  if (existingEvent && existingEvent.processed) {
    console.log(`Event ${event.id} already processed, skipping`)
    return NextResponse.json({ received: true, status: 'duplicate' })
  }

  // Create or update webhook event record
  await prisma.webhookEvent.upsert({
    where: { stripeEventId: event.id },
    create: {
      stripeEventId: event.id,
      type: event.type,
      data: event.data as any,
      processed: false,
    },
    update: {
      retryCount: { increment: 1 },
    },
  })

  try {
    // Process event
    await processWebhookEvent(event)

    // Mark as processed
    await prisma.webhookEvent.update({
      where: { stripeEventId: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    })

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing webhook:', error)

    // Update error in database
    await prisma.webhookEvent.update({
      where: { stripeEventId: event.id },
      data: {
        error: error.message,
      },
    })

    // Return 200 to prevent Stripe from retrying immediately
    // Implement your own retry logic
    return NextResponse.json(
      { error: 'Webhook processing failed', received: true },
      { status: 200 }
    )
  }
}

async function processWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      if (paymentIntent.metadata.taskId) {
        await prisma.task.update({
          where: { id: paymentIntent.metadata.taskId },
          data: { stripeChargeId: paymentIntent.latest_charge as string },
        })
      }
      break

    case 'payment_intent.payment_failed':
      console.error('Payment failed:', event.data.object)
      // Handle failed payment
      break

    case 'transfer.created':
      const transfer = event.data.object as Stripe.Transfer
      if (transfer.metadata?.taskId) {
        await prisma.payout.updateMany({
          where: {
            taskId: transfer.metadata.taskId,
            stripePayoutId: null,
          },
          data: { stripePayoutId: transfer.id },
        })
      }
      break

    case 'account.updated':
      const account = event.data.object as Stripe.Account
      await prisma.user.updateMany({
        where: { stripeAccountId: account.id },
        data: {
          // Update account status if needed
        },
      })
      break

    case 'charge.refunded':
      // Handle refund
      const charge = event.data.object as Stripe.Charge
      if (charge.metadata.taskId) {
        await prisma.task.update({
          where: { id: charge.metadata.taskId },
          data: {
            refundStatus: 'PROCESSED',
            refundAmount: (charge.amount_refunded || 0) / 100,
          },
        })
      }
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}
```

### Phase 3: Centralize Fee Configuration

#### Create lib/stripe-fees.ts

```typescript
export interface FeeCalculation {
  baseAmount: number
  platformFee: number
  stripeFee: number
  totalAmount: number
  workerPayout: number
}

export interface FeeConfig {
  platformFeeRate: number
  stripeFeeRate: number
  stripeFeeFixed: number
}

const DEFAULT_FEE_CONFIG: FeeConfig = {
  platformFeeRate: parseFloat(process.env.STRIPE_PLATFORM_FEE_RATE || '0.15'),
  stripeFeeRate: parseFloat(process.env.STRIPE_FEE_RATE || '0.029'),
  stripeFeeFixed: parseFloat(process.env.STRIPE_FEE_FIXED || '0.30'),
}

export function calculateFees(
  baseAmount: number,
  config: FeeConfig = DEFAULT_FEE_CONFIG
): FeeCalculation {
  const platformFee = baseAmount * config.platformFeeRate
  const stripeFee = baseAmount * config.stripeFeeRate + config.stripeFeeFixed
  const totalAmount = baseAmount + platformFee + stripeFee
  const workerPayout = baseAmount - platformFee - stripeFee

  return {
    baseAmount,
    platformFee,
    stripeFee,
    totalAmount,
    workerPayout,
  }
}

export function calculateAmountInCents(amount: number): number {
  return Math.round(amount * 100)
}

export function calculateAmountFromCents(cents: number): number {
  return cents / 100
}
```

#### Update accept-offer route

```typescript
import { calculateFees, calculateAmountInCents } from '@/lib/stripe-fees'

// In the route handler:
const fees = calculateFees(offer.price)
const paymentIntent = await stripe.paymentIntents.create({
  amount: calculateAmountInCents(fees.totalAmount),
  // ... rest of config
})
```

## Testing Strategy

### Local Testing with Stripe CLI

1. **Install Stripe CLI**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   scoop install stripe
   ```

2. **Login and Forward Webhooks**
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
   ```

3. **Test Events**
   ```bash
   stripe trigger payment_intent.succeeded
   stripe trigger payment_intent.payment_failed
   stripe trigger transfer.created
   ```

### Test Cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

## Environment Variables

Add to `.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Fee Configuration (optional, defaults in code)
STRIPE_PLATFORM_FEE_RATE=0.15
STRIPE_FEE_RATE=0.029
STRIPE_FEE_FIXED=0.30
```

## Success Criteria

### Phase 1 Complete When:
- ✅ Payment Element working in production
- ✅ All test cards processing correctly
- ✅ Error messages user-friendly
- ✅ No deprecated warnings

### Phase 2 Complete When:
- ✅ Webhook events tracked in database
- ✅ Idempotency working (test with duplicate events)
- ✅ Failed webhooks logged and retriable
- ✅ No duplicate processing

### Phase 3 Complete When:
- ✅ All fee calculations use centralized functions
- ✅ Fee rates configurable via environment
- ✅ No hardcoded fee values

## Timeline Estimate

- **Phase 1**: 1 week (4-6 hours)
- **Phase 2**: 1 week (6-8 hours)
- **Phase 3**: 3 days (3-4 hours)
- **Phase 4**: 2 weeks (8-10 hours)
- **Phase 5**: 1.5 weeks (6-8 hours)
- **Phase 6**: 2 weeks (10-12 hours)

**Total Estimated Time**: 8-10 weeks (part-time)

## Risk Mitigation

1. **Payment Flow Changes**: Test thoroughly in Stripe test mode before production
2. **Webhook Changes**: Use idempotency to prevent duplicate processing
3. **Database Migrations**: Backup before running migrations
4. **Feature Flags**: Consider feature flags for gradual rollout

## Next Steps

1. Review and approve this plan
2. Prioritize phases based on business needs
3. Set up development environment with Stripe CLI
4. Begin Phase 1 implementation
5. Test each phase before moving to next

## Resources

- [Stripe Payment Element Docs](https://stripe.com/docs/payments/payment-element)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Connect Marketplace Guide](https://stripe.com/docs/connect)
- [Stripe Testing Guide](https://stripe.com/docs/testing)





