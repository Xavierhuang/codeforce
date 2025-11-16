import { describe, it, expect } from 'vitest'
import {
  sanitizeHtml,
  sanitizeText,
  sanitizeForDisplay,
  sanitizeUrl,
  sanitizeEmail,
  sanitizePhone,
  sanitizeFilename,
  escapeHtml,
} from '@/lib/sanitize'

describe('Sanitization Utilities', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script><p>Safe content</p>'
      const result = sanitizeHtml(input)
      expect(result).not.toContain('<script>')
      expect(result).toContain('Safe content')
    })

    it('should allow safe HTML tags', () => {
      const input = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>'
      const result = sanitizeHtml(input)
      expect(result).toContain('<p>')
      expect(result).toContain('<strong>')
      expect(result).toContain('<em>')
    })

    it('should remove dangerous attributes', () => {
      const input = '<p onclick="alert(1)">Click me</p>'
      const result = sanitizeHtml(input)
      expect(result).not.toContain('onclick')
    })

    it('should handle null and undefined', () => {
      expect(sanitizeHtml(null)).toBe('')
      expect(sanitizeHtml(undefined)).toBe('')
    })
  })

  describe('sanitizeText', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Text</p><script>alert(1)</script>'
      const result = sanitizeText(input)
      expect(result).toBe('Text')
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
    })

    it('should remove dangerous characters', () => {
      const input = 'Text<>with<>dangerous<>chars'
      const result = sanitizeText(input)
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
    })

    it('should decode HTML entities', () => {
      const input = '&lt;script&gt;alert(1)&lt;/script&gt;'
      const result = sanitizeText(input)
      expect(result).not.toContain('&lt;')
      expect(result).not.toContain('&gt;')
    })

    it('should trim whitespace', () => {
      const input = '  Text with spaces  '
      const result = sanitizeText(input)
      expect(result).toBe('Text with spaces')
    })

    it('should handle null and undefined', () => {
      expect(sanitizeText(null)).toBe('')
      expect(sanitizeText(undefined)).toBe('')
    })
  })

  describe('sanitizeForDisplay', () => {
    it('should allow basic formatting tags', () => {
      const input = '<p>Paragraph</p><br/><strong>Bold</strong>'
      const result = sanitizeForDisplay(input)
      expect(result).toContain('<p>')
      expect(result).toContain('<br')
      expect(result).toContain('<strong>')
    })

    it('should remove script tags', () => {
      const input = '<script>alert(1)</script><p>Safe</p>'
      const result = sanitizeForDisplay(input)
      expect(result).not.toContain('<script>')
    })
  })

  describe('sanitizeUrl', () => {
    it('should accept valid HTTP URLs', () => {
      const url = 'http://example.com'
      expect(sanitizeUrl(url)).toBe(url)
    })

    it('should accept valid HTTPS URLs', () => {
      const url = 'https://example.com/path?query=1'
      expect(sanitizeUrl(url)).toBe(url)
    })

    it('should reject javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
    })

    it('should reject data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    })

    it('should handle invalid URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBeNull()
    })

    it('should handle null and undefined', () => {
      expect(sanitizeUrl(null)).toBeNull()
      expect(sanitizeUrl(undefined)).toBeNull()
    })
  })

  describe('sanitizeEmail', () => {
    it('should accept valid email addresses', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com')
      expect(sanitizeEmail('user.name@example.co.uk')).toBe('user.name@example.co.uk')
    })

    it('should normalize email to lowercase', () => {
      expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com')
    })

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com')
    })

    it('should reject invalid email addresses', () => {
      expect(sanitizeEmail('not-an-email')).toBeNull()
      expect(sanitizeEmail('user@')).toBeNull()
      expect(sanitizeEmail('@example.com')).toBeNull()
      expect(sanitizeEmail('user@example')).toBeNull()
    })

    it('should handle null and undefined', () => {
      expect(sanitizeEmail(null)).toBeNull()
      expect(sanitizeEmail(undefined)).toBeNull()
    })
  })

  describe('sanitizePhone', () => {
    it('should accept valid E.164 phone numbers', () => {
      expect(sanitizePhone('+1234567890')).toBe('+1234567890')
      expect(sanitizePhone('+14155552671')).toBe('+14155552671')
    })

    it('should reject invalid phone numbers', () => {
      expect(sanitizePhone('1234567890')).toBeNull() // Missing +
      expect(sanitizePhone('+123')).toBeNull() // Too short
      expect(sanitizePhone('+0123456789012345')).toBeNull() // Too long
      expect(sanitizePhone('+12345678901a')).toBeNull() // Contains letters
    })

    it('should trim whitespace', () => {
      expect(sanitizePhone('  +1234567890  ')).toBe('+1234567890')
    })

    it('should handle null and undefined', () => {
      expect(sanitizePhone(null)).toBeNull()
      expect(sanitizePhone(undefined)).toBeNull()
    })
  })

  describe('sanitizeFilename', () => {
    it('should remove path separators', () => {
      expect(sanitizeFilename('file/name.txt')).toBe('filename.txt')
      expect(sanitizeFilename('file\\name.txt')).toBe('filename.txt')
    })

    it('should remove dangerous characters', () => {
      expect(sanitizeFilename('file<>:"|?*name.txt')).toBe('filename.txt')
    })

    it('should remove parent directory references', () => {
      expect(sanitizeFilename('../../file.txt')).toBe('file.txt')
    })

    it('should limit length to 255 characters', () => {
      const longName = 'a'.repeat(300) + '.txt'
      const result = sanitizeFilename(longName)
      expect(result.length).toBeLessThanOrEqual(255)
    })

    it('should preserve safe filenames', () => {
      expect(sanitizeFilename('safe-file-name.txt')).toBe('safe-file-name.txt')
    })
  })

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
      expect(escapeHtml('Text & more')).toBe('Text &amp; more')
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;')
      expect(escapeHtml("'single'")).toBe('&#039;single&#039;')
    })

    it('should handle null and undefined', () => {
      expect(escapeHtml(null)).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })
  })
})







