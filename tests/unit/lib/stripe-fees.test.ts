import { describe, it, expect } from 'vitest'
import { calculateFees, calculateAmountInCents } from '@/lib/stripe-fees'

describe('Stripe Fees Calculation', () => {
  describe('calculateFees', () => {
    it('should calculate platform fee correctly', () => {
      const baseAmount = 100
      const platformFeeRate = 0.15
      const result = calculateFees(baseAmount, platformFeeRate)
      
      expect(result.platformFee).toBe(15)
      expect(result.trustAndSupportFee).toBe(3)
      expect(result.stripeFee).toBeGreaterThan(0)
      expect(result.totalAmount).toBeGreaterThan(baseAmount)
    })

    it('should calculate total including all fees', () => {
      const baseAmount = 100
      const platformFeeRate = 0.15
      const result = calculateFees(baseAmount, platformFeeRate)
      
      const expectedTotal = baseAmount + result.platformFee + result.trustAndSupportFee + result.stripeFee
      expect(result.totalAmount).toBeCloseTo(expectedTotal, 2)
    })

    it('should handle zero platform fee rate', () => {
      const result = calculateFees(100, 0)
      expect(result.platformFee).toBe(0)
      expect(result.totalAmount).toBeGreaterThan(100) // Still includes Stripe fee
    })

    it('should handle different platform fee rates', () => {
      const result1 = calculateFees(100, 0.10)
      const result2 = calculateFees(100, 0.20)
      
      expect(result2.platformFee).toBeGreaterThan(result1.platformFee)
    })
  })

  describe('calculateAmountInCents', () => {
    it('should convert dollars to cents', () => {
      expect(calculateAmountInCents(10.50)).toBe(1050)
      expect(calculateAmountInCents(100)).toBe(10000)
    })

    it('should round to nearest cent', () => {
      expect(calculateAmountInCents(10.999)).toBe(1100)
      expect(calculateAmountInCents(10.001)).toBe(1000)
    })

    it('should handle zero', () => {
      expect(calculateAmountInCents(0)).toBe(0)
    })
  })
})




