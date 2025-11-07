# Fee Structure Documentation

## Correct Fee Structure (Platform Gets Cut from Both Sides)

### Buyer Fees (What the client pays)

When a client accepts an offer, they pay:

1. **Base Amount**: The developer's hourly rate or fixed price
2. **Trust & Support Fee**: 15% of base amount (buyer side fee)
3. **Estimated Stripe Processing Fee**: 2.9% + $0.30 (helps platform cover card fees)

**Total Buyer Payment** = Base Amount + Trust & Support Fee + Estimated Stripe Fees

**Note**: Platform fee is NOT added to buyer - it's deducted from worker. Stripe fees are ultimately covered by the platform (not deducted from worker payout).

### Worker Payout (What the developer/tasker receives)

When the task is completed, the developer receives:

**Worker Payout** = Base Amount - Platform Fee

**Note**: The Platform Fee (15%) is deducted from the worker's payout (tasker side fee). Stripe fees are covered by the platform and are not deducted from the worker.

### Platform Revenue

The platform receives revenue from BOTH sides:

1. **Platform Fee**: 15% deducted from worker (tasker side)
2. **Trust & Support Fee**: 15% added to buyer (buyer side)

**Total Platform Revenue** = Platform Fee + Trust & Support Fee

## Example Calculation

### Scenario: Developer charges $100/hour

**Buyer Pays:**
- Base Amount: $100.00
- Trust & Support Fee (15%): $15.00 ← Platform keeps
- Estimated Stripe Fee (2.9% + $0.30): $3.20 ← Collected to help cover processing costs
- **Total: $118.20**

**Developer Receives:**
- Base Amount: $100.00
- Minus Platform Fee (15%): -$15.00 ← Platform keeps
- **Payout: $85.00** (Stripe fee is covered by platform, not deducted)

**Platform Revenue (before covering Stripe):**
- Platform Fee (from worker): $15.00
- Trust & Support Fee (from buyer): $15.00
- **Gross Platform Revenue: $30.00**
- Minus Stripe Processing Cost (~$3.20) → **Net ≈ $26.80**

## Fee Breakdown

| Component | Rate | Amount (on $100) | Who Pays/Receives | Platform Keeps? |
|-----------|------|------------------|-------------------|----------------|
| Base Amount | - | $100.00 | Developer receives | No |
| Platform Fee | 15% | $15.00 | Deducted from worker payout | ✅ Yes (worker side) |
| Trust & Support Fee | 15% | $15.00 | Added to buyer total | ✅ Yes (buyer side) |
| Estimated Stripe Fee | 2.9% + $0.30 | $3.20 | Included in buyer total → paid to Stripe | ❌ (platform covers actual fee) |
| **Total Buyer Pays** | - | **$118.20** | Buyer | - |
| **Developer Payout** | - | **$85.00** | Developer | - |
| **Platform Gross Revenue** | - | **$30.00** | Platform | ✅ Both fees |
| **Platform Net Revenue (after Stripe)** | - | **≈ $26.80** | Platform | ✅ |

## Implementation Details

### Code Location

- **Fee Calculation**: `lib/stripe-fees.ts`
- **Accept Offer**: `app/api/v1/tasks/[id]/accept-offer/route.ts`
- **Complete Task**: `app/api/v1/tasks/[id]/complete/route.ts`

### Environment Variables

```env
STRIPE_PLATFORM_FEE_RATE=0.15          # 15% platform fee (deducted from worker)
STRIPE_TRUST_SUPPORT_FEE_RATE=0.15     # 15% trust & support fee (added to buyer)
STRIPE_FEE_RATE=0.029                   # 2.9% Stripe fee
STRIPE_FEE_FIXED=0.30                   # $0.30 fixed Stripe fee
```

### Fee Calculation Function

```typescript
const fees = calculateFees(baseAmount)

// Returns:
{
  baseAmount: 100.00,
  platformFee: 15.00,          // Deducted from worker payout
  trustAndSupportFee: 15.00,   // Added to buyer total
  stripeFee: 3.20,             // Estimated Stripe fee (for reference/coverage)
  totalAmount: 118.20,         // What buyer is charged
  workerPayout: 85.00          // What developer receives (base - platform fee)
}
```

## Important Notes

1. **Platform Fee (15%)**: Deducted from worker/tasker side - they receive less
2. **Trust & Support Fee (15%)**: Added to buyer side - they pay more
3. **Platform gets both**: Platform receives revenue from both sides (15% from each)
4. **Worker payout**: Developer receives baseAmount - platformFee (Stripe fees covered by platform)
5. **Buyer payment**: Buyer pays baseAmount + trustAndSupportFee + estimated Stripe fees (so platform can cover card processing)

## Revenue Flow

```
Buyer Payment ($118.20)
├─ Base Amount: $100.00 → Ultimately paid out to worker (after platform fee)
├─ Trust & Support Fee: $15.00 → Platform keeps
├─ Estimated Stripe Fee: $3.20 → Covered by platform/paid to Stripe

Worker Payout ($85.00)
├─ Base Amount: $100.00
└─ Minus Platform Fee: -$15.00 → Platform keeps

Platform Revenue:
├─ Platform Fee (from worker): $15.00
├─ Trust & Support Fee (from buyer): $15.00
└─ Minus Stripe Processing Cost (~$3.20) → Net ≈ $26.80
```

## API Response Example

When accepting an offer, the API returns:

```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "fees": {
    "baseAmount": 100.00,
    "platformFee": 15.00,
    "trustAndSupportFee": 15.00,
    "stripeFee": 3.20,
    "totalAmount": 118.20
  }
}
```

This allows the frontend to show buyers exactly what they're paying for.

---

**Last Updated**: Current
**Status**: ✅ Correctly Implemented - Platform gets cut from both sides
