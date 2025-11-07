/**
 * Stripe fee calculation utilities
 * Centralized fee configuration for consistent calculations across the app
 */

export interface FeeCalculation {
  baseAmount: number
  platformFee: number
  trustAndSupportFee: number // 15% trust and support fee for buyers
  stripeFee: number
  totalAmount: number // Total amount buyer pays
  workerPayout: number // Amount worker receives (baseAmount - platformFee - Stripe fees)
}

export interface FeeConfig {
  platformFeeRate: number
  trustAndSupportFeeRate: number // New: 15% trust and support fee
  stripeFeeRate: number
  stripeFeeFixed: number
}

/**
 * Default fee configuration
 * Can be overridden via environment variables
 */
const DEFAULT_FEE_CONFIG: FeeConfig = {
  platformFeeRate: parseFloat(process.env.STRIPE_PLATFORM_FEE_RATE || '0.15'),
  trustAndSupportFeeRate: parseFloat(process.env.STRIPE_TRUST_SUPPORT_FEE_RATE || '0.15'), // 15% trust and support fee
  stripeFeeRate: parseFloat(process.env.STRIPE_FEE_RATE || '0.029'),
  stripeFeeFixed: parseFloat(process.env.STRIPE_FEE_FIXED || '0.30'),
}

/**
 * Calculate all fees and amounts for a given base amount
 * @param baseAmount - The base price amount in dollars
 * @param config - Optional fee configuration (uses defaults if not provided)
 * @returns FeeCalculation object with all calculated amounts
 */
export function calculateFees(
  baseAmount: number,
  config: FeeConfig = DEFAULT_FEE_CONFIG
): FeeCalculation {
  const platformFee = baseAmount * config.platformFeeRate // 15% deducted from worker (tasker side)
  const trustAndSupportFee = baseAmount * config.trustAndSupportFeeRate // 15% added to buyer (buyer side)
  const stripeFee = baseAmount * config.stripeFeeRate + config.stripeFeeFixed
  
  // Total amount buyer pays: base + trust & support fee + Stripe fees
  // Platform fee is NOT added to buyer - it's deducted from worker
  // Stripe fee is estimated so the platform can account for it (covered by platform revenue)
  const totalAmount = baseAmount + trustAndSupportFee + stripeFee
  
  // Worker payout: base amount minus platform fee only (platform covers Stripe fees)
  const workerPayout = baseAmount - platformFee

  return {
    baseAmount,
    platformFee,
    trustAndSupportFee,
    stripeFee,
    totalAmount,
    workerPayout,
  }
}

/**
 * Convert dollar amount to cents (for Stripe API)
 * @param amount - Amount in dollars
 * @returns Amount in cents (rounded)
 */
export function calculateAmountInCents(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Convert cents to dollar amount
 * @param cents - Amount in cents
 * @returns Amount in dollars
 */
export function calculateAmountFromCents(cents: number): number {
  return cents / 100
}

/**
 * Get the default fee configuration
 * @returns FeeConfig object
 */
export function getFeeConfig(): FeeConfig {
  return DEFAULT_FEE_CONFIG
}

