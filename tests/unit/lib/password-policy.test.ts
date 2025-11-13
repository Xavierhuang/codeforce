import { describe, it, expect } from 'vitest'
import {
  validatePasswordStrength,
  meetsPasswordRequirements,
  getPasswordFeedback,
} from '@/lib/password-policy'

describe('Password Policy', () => {
  describe('validatePasswordStrength', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePasswordStrength('Short1!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should reject passwords without uppercase letters', () => {
      const result = validatePasswordStrength('lowercase123!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('should reject passwords without lowercase letters', () => {
      const result = validatePasswordStrength('UPPERCASE123!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('should reject passwords without numbers', () => {
      const result = validatePasswordStrength('NoNumbers!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should reject passwords without special characters', () => {
      const result = validatePasswordStrength('NoSpecial123')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('should reject passwords with spaces', () => {
      const result = validatePasswordStrength('Has Space123!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password cannot contain spaces')
    })

    it('should reject passwords longer than 100 characters', () => {
      const longPassword = 'A'.repeat(101) + '1!'
      const result = validatePasswordStrength(longPassword)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be less than 100 characters')
    })

    it('should reject common passwords', () => {
      const result = validatePasswordStrength('password123!')
      expect(result.valid).toBe(false)
      expect(result.errors.some(err => err.includes('common'))).toBe(true)
    })

    it('should reject passwords with too many repeated characters', () => {
      const result = validatePasswordStrength('aaaaA123!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password contains too many repeated characters')
    })

    it('should reject passwords with common sequences', () => {
      const result = validatePasswordStrength('abcd1234!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password contains common sequences')
    })

    it('should accept valid strong passwords', () => {
      const result = validatePasswordStrength('SecurePass123!')
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
      expect(result.strength).toMatch(/strong|very-strong/)
    })

    it('should calculate correct strength scores', () => {
      const weak = validatePasswordStrength('Weak1!')
      expect(weak.score).toBeLessThan(40)
      expect(weak.strength).toBe('weak')

      const medium = validatePasswordStrength('MediumPass1!')
      expect(medium.score).toBeGreaterThanOrEqual(40)
      expect(medium.score).toBeLessThan(60)
      expect(medium.strength).toBe('medium')

      const strong = validatePasswordStrength('StrongPassword123!')
      expect(strong.score).toBeGreaterThanOrEqual(60)
      expect(strong.score).toBeLessThan(80)
      expect(strong.strength).toBe('strong')

      const veryStrong = validatePasswordStrength('VeryStrongPassword123!@#')
      expect(veryStrong.score).toBeGreaterThanOrEqual(80)
      expect(veryStrong.strength).toBe('very-strong')
    })

    it('should give higher scores for longer passwords', () => {
      const short = validatePasswordStrength('Short1!')
      const long = validatePasswordStrength('VeryLongPassword123!')
      expect(long.score).toBeGreaterThan(short.score)
    })
  })

  describe('meetsPasswordRequirements', () => {
    it('should return true for valid passwords', () => {
      expect(meetsPasswordRequirements('ValidPass123!')).toBe(true)
    })

    it('should return false for invalid passwords', () => {
      expect(meetsPasswordRequirements('short')).toBe(false)
      expect(meetsPasswordRequirements('password123!')).toBe(false)
    })
  })

  describe('getPasswordFeedback', () => {
    it('should provide helpful feedback for weak passwords', () => {
      const feedback = getPasswordFeedback('weak')
      expect(feedback.feedback.length).toBeGreaterThan(0)
      expect(feedback.strength).toBe('weak')
    })

    it('should provide positive feedback for strong passwords', () => {
      const feedback = getPasswordFeedback('VeryStrongPassword123!@#')
      expect(feedback.strength).toMatch(/strong|very-strong/)
      if (feedback.score >= 80) {
        expect(feedback.feedback.some(f => f.includes('Excellent'))).toBe(true)
      }
    })

    it('should include specific improvement suggestions', () => {
      const feedback = getPasswordFeedback('lowercase')
      expect(feedback.feedback.some(f => f.includes('uppercase'))).toBe(true)
      expect(feedback.feedback.some(f => f.includes('number'))).toBe(true)
    })
  })
})




