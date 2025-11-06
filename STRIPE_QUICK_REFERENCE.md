# Stripe Integration Quick Reference

Quick reference guide for CodeForce's Stripe integration.

## Current Implementation

### Payment Flow
1. Client accepts offer → Creates PaymentIntent (escrow)
2. Client authorizes payment → Funds held
3. Worker completes task → Captures PaymentIntent
4. Funds transferred to worker → Via Stripe Connect

### Key Files
- `app/api/v1/stripe/create-account/route.ts` - Stripe Connect onboarding
- `app/api/v1/stripe/webhook/route.ts` - Webhook handler
- `app/api/v1/tasks/[id]/accept-offer/route.ts` - PaymentIntent creation
- `app/api/v1/tasks/[id]/complete/route.ts` - Payment capture & transfer
- `components/PaymentForm.tsx` - Payment UI (needs update)

### Database Fields

**User Model**:
- `stripeAccountId` - Stripe Connect account ID

**Task Model**:
- `paymentIntentId` - PaymentIntent ID (escrow)
- `stripeChargeId` - Charge ID (after capture)

**Payout Model**:
- `stripePayoutId` - Transfer ID
- `amount` - Worker payout amount
- `fee` - Platform + Stripe fees

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Fee Calculation (Current)

```typescript
platformFeeRate = 0.15  // 15%
stripeFeeRate = 0.029   // 2.9%
stripeFeeFixed = 0.30   // $0.30

baseAmount = offer.price
platformFee = baseAmount * platformFeeRate
stripeFee = baseAmount * stripeFeeRate + stripeFeeFixed
totalAmount = baseAmount + platformFee + stripeFee
workerPayout = baseAmount - platformFee - stripeFee
```

## Common Stripe Operations

### Create PaymentIntent (Escrow)

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(totalAmount * 100),
  currency: 'usd',
  payment_method_types: ['card'],
  metadata: {
    taskId: task.id,
    offerId: offer.id,
    workerId: offer.workerId,
    clientId: user.id,
  },
  capture_method: 'manual', // Hold until completion
})
```

### Capture PaymentIntent

```typescript
await stripe.paymentIntents.capture(paymentIntentId)
```

### Transfer to Worker

```typescript
const transfer = await stripe.transfers.create({
  amount: Math.round(workerPayout * 100),
  currency: 'usd',
  destination: worker.stripeAccountId,
  metadata: {
    taskId: task.id,
  },
})
```

### Create Stripe Connect Account

```typescript
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: worker.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
})
```

## Webhook Events Handled

- `payment_intent.succeeded` - Payment authorized
- `payment_intent.payment_failed` - Payment failed
- `transfer.created` - Transfer to worker created
- `account.updated` - Stripe Connect account updated

## Testing

### Stripe CLI Commands

```bash
# Forward webhooks locally
stripe listen --forward-to localhost:3000/api/v1/stripe/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger transfer.created

# View events
stripe events list
```

### Test Cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`
- Insufficient funds: `4000 0000 0000 9995`

## Current Issues

1. ⚠️ Payment form uses deprecated `CardElement`
2. ⚠️ No webhook idempotency
3. ⚠️ Fee calculations hardcoded
4. ⚠️ No refund flow
5. ⚠️ Limited error handling

## Quick Fixes Needed

### 1. Update Payment Form
Replace `CardElement` with `PaymentElement` in `components/PaymentForm.tsx`

### 2. Add Webhook Idempotency
Track processed events in database to prevent duplicates

### 3. Centralize Fees
Create `lib/stripe-fees.ts` for fee calculations

## API Endpoints

### Stripe
- `POST /api/v1/stripe/create-account` - Create Connect account
- `POST /api/v1/stripe/webhook` - Webhook handler

### Tasks (Payment Related)
- `POST /api/v1/tasks/[id]/accept-offer` - Accept offer, create PaymentIntent
- `POST /api/v1/tasks/[id]/complete` - Complete task, capture & transfer

## Error Handling

### Common Errors

**Invalid API Key**
- Check `STRIPE_SECRET_KEY` in environment
- Verify key is correct for test/live mode

**Webhook Signature Invalid**
- Check `STRIPE_WEBHOOK_SECRET`
- Verify webhook endpoint URL matches

**Payment Failed**
- Check card details
- Verify PaymentIntent status
- Check Stripe dashboard for details

**Transfer Failed**
- Verify worker has Stripe Connect account
- Check account status
- Verify sufficient funds

## Monitoring

### Stripe Dashboard
- View payments: https://dashboard.stripe.com/payments
- View transfers: https://dashboard.stripe.com/connect/transfers
- View webhooks: https://dashboard.stripe.com/webhooks

### Key Metrics
- Payment success rate
- Average payment amount
- Platform fee revenue
- Worker payout success rate

## Resources

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Payment Intents Guide](https://stripe.com/docs/payments/payment-intents)
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Test Cards](https://stripe.com/docs/testing)

## Next Steps

See `STRIPE_INTEGRATION_PLAN.md` for detailed implementation plan.
