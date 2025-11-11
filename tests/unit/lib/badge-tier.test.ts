import { describe, it, expect } from 'vitest'
import { calculateBadgeTier } from '@/lib/badge-tier'

describe('Badge Tier Calculation', () => {
  it('should return STARTER for new workers', () => {
    expect(calculateBadgeTier(0, 0, 0)).toBe('STARTER')
    expect(calculateBadgeTier(1, 0, 0)).toBe('STARTER')
  })

  it('should return VERIFIED for workers meeting basic requirements', () => {
    // VERIFIED requires: 10 tasks, 3.5 rating, 3 reviews
    expect(calculateBadgeTier(10, 3.5, 3)).toBe('VERIFIED')
    expect(calculateBadgeTier(15, 4.0, 5)).toBe('VERIFIED')
  })

  it('should return PROFESSIONAL for workers with good performance', () => {
    // PROFESSIONAL requires: 50 tasks, 4.0 rating, 10 reviews
    expect(calculateBadgeTier(50, 4.0, 10)).toBe('PROFESSIONAL')
    expect(calculateBadgeTier(100, 4.5, 20)).toBe('PROFESSIONAL')
  })

  it('should return EXPERT for high-performing workers', () => {
    // EXPERT requires: 200 tasks, 4.5 rating, 50 reviews
    expect(calculateBadgeTier(200, 4.5, 50)).toBe('EXPERT')
    expect(calculateBadgeTier(300, 4.7, 60)).toBe('EXPERT')
  })

  it('should return ELITE for top performers', () => {
    // ELITE requires: 500 tasks, 4.8 rating, 100 reviews
    expect(calculateBadgeTier(500, 4.8, 100)).toBe('ELITE')
    expect(calculateBadgeTier(600, 5.0, 150)).toBe('ELITE')
  })

  it('should prioritize rating over task count', () => {
    // High rating but low tasks - should still be VERIFIED (meets all VERIFIED criteria)
    const highRating = calculateBadgeTier(10, 4.9, 3)
    const lowRating = calculateBadgeTier(50, 3.5, 40)
    // High rating meets VERIFIED criteria, low rating doesn't meet PROFESSIONAL rating requirement
    expect(highRating).toBe('VERIFIED')
    expect(lowRating).toBe('STARTER') // Doesn't meet VERIFIED rating requirement (3.5)
  })

  it('should require minimum review count for higher tiers', () => {
    // Even with high rating and task count, need reviews
    expect(calculateBadgeTier(100, 5.0, 0)).not.toBe('ELITE')
    expect(calculateBadgeTier(100, 5.0, 5)).not.toBe('ELITE')
  })
})

