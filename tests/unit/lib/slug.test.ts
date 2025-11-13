import { describe, it, expect } from 'vitest'
import { generateSlug, generateUniqueSlug } from '@/lib/slug'

describe('Slug Generation', () => {
  describe('generateSlug', () => {
    it('should convert text to lowercase', () => {
      expect(generateSlug('John Doe')).toBe('john-doe')
      expect(generateSlug('UPPERCASE')).toBe('uppercase')
    })

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('John Doe')).toBe('john-doe')
      expect(generateSlug('Multiple   Spaces')).toBe('multiple-spaces')
    })

    it('should remove special characters', () => {
      expect(generateSlug('John@Doe#123')).toBe('johndoe123')
      expect(generateSlug('Name!@#$%^&*()')).toBe('name')
    })

    it('should handle empty strings', () => {
      expect(generateSlug('')).toBe('')
    })

    it('should handle strings with only special characters', () => {
      expect(generateSlug('!@#$%')).toBe('')
    })

    it('should preserve alphanumeric characters and hyphens', () => {
      expect(generateSlug('john-doe-123')).toBe('john-doe-123')
    })

    it('should trim leading and trailing hyphens', () => {
      expect(generateSlug('-john-doe-')).toBe('john-doe')
    })
  })

  describe('generateUniqueSlug', () => {
    it('should return base slug if not in existing list', () => {
      const existing = ['john-smith', 'jane-doe']
      expect(generateUniqueSlug('john-doe', existing)).toBe('john-doe')
    })

    it('should append number if slug exists', () => {
      const existing = ['john-doe']
      expect(generateUniqueSlug('john-doe', existing)).toBe('john-doe-1')
    })

    it('should increment number until unique', () => {
      const existing = ['john-doe', 'john-doe-1', 'john-doe-2']
      expect(generateUniqueSlug('john-doe', existing)).toBe('john-doe-3')
    })

    it('should handle empty existing list', () => {
      expect(generateUniqueSlug('john-doe', [])).toBe('john-doe')
    })

    it('should handle case-insensitive matching', () => {
      const existing = ['John-Doe']
      expect(generateUniqueSlug('john-doe', existing)).toBe('john-doe-1')
    })
  })
})




