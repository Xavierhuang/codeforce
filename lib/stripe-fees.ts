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
 * Can be overridden via environment variables or database settings
 */
const DEFAULT_FEE_CONFIG: FeeConfig = {
  platformFeeRate: parseFloat(process.env.STRIPE_PLATFORM_FEE_RATE || '0.15'),
  trustAndSupportFeeRate: parseFloat(process.env.STRIPE_TRUST_SUPPORT_FEE_RATE || '0.15'), // 15% trust and support fee
  stripeFeeRate: parseFloat(process.env.STRIPE_FEE_RATE || '0.029'),
  stripeFeeFixed: parseFloat(process.env.STRIPE_FEE_FIXED || '0.30'),
}

/**
 * Get fee config from database settings (async)
 * Falls back to defaults if database is unavailable
 */
export async function getFeeConfigFromSettings(): Promise<FeeConfig> {
  try {
    const { getPlatformSettings } = await import('./settings')
    const settings = await getPlatformSettings()
    return {
      platformFeeRate: settings.platformFeeRate,
      trustAndSupportFeeRate: settings.trustAndSupportFeeRate,
      stripeFeeRate: parseFloat(process.env.STRIPE_FEE_RATE || '0.029'),
      stripeFeeFixed: parseFloat(process.env.STRIPE_FEE_FIXED || '0.30'),
    }
  } catch (error) {
    console.error('Error fetching fee config from settings:', error)
    return DEFAULT_FEE_CONFIG
  }
}

/**
 * Calculate all fees and amounts for a given base amount
 * @param baseAmount - The base price amount in dollars
 * @param platformFeeRateOrConfig - Platform fee rate (0-1) or full FeeConfig object (uses defaults if not provided)
 * @returns FeeCalculation object with all calculated amounts
 */
export function calculateFees(
  baseAmount: number,
  platformFeeRateOrConfig?: number | FeeConfig
): FeeCalculation {
  // Handle both number (platformFeeRate) and FeeConfig object
  const config: FeeConfig = typeof platformFeeRateOrConfig === 'number'
    ? { ...DEFAULT_FEE_CONFIG, platformFeeRate: platformFeeRateOrConfig }
    : platformFeeRateOrConfig || DEFAULT_FEE_CONFIG
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

