import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('Utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'conditional')).toBe('base conditional')
      expect(cn('base', false && 'conditional')).toBe('base')
    })

    it('should handle undefined and null', () => {
      expect(cn('base', undefined, null)).toBe('base')
    })

    it('should handle arrays', () => {
      expect(cn(['class1', 'class2'])).toBe('class1 class2')
    })

    it('should handle objects', () => {
      expect(cn({ class1: true, class2: false })).toBe('class1')
    })

    it('should handle duplicate classes', () => {
      // clsx/twMerge may or may not remove duplicates depending on Tailwind class conflicts
      // For non-Tailwind classes, duplicates may remain
      const result = cn('class1', 'class1', 'class2')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
    })
  })
})

