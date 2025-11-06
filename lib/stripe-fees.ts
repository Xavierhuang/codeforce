/**
 * Stripe fee calculation utilities
 * Centralized fee configuration for consistent calculations across the app
 */

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

/**
 * Default fee configuration
 * Can be overridden via environment variables
 */
const DEFAULT_FEE_CONFIG: FeeConfig = {
  platformFeeRate: parseFloat(process.env.STRIPE_PLATFORM_FEE_RATE || '0.15'),
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





