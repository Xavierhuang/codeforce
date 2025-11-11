import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitization utilities for user-generated content
 * Prevents XSS attacks by cleaning HTML content
 */

/**
 * Sanitize HTML content with strict rules
 * Only allows safe formatting tags
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
}

/**
 * Sanitize plain text - removes all HTML tags and dangerous characters
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return ''
  
  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '')
  
  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>]/g, '')
  
  // Decode HTML entities
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
  
  return sanitized.trim()
}

/**
 * Sanitize text for display - allows basic formatting but removes scripts
 */
export function sanitizeForDisplay(text: string | null | undefined): string {
  if (!text) return ''
  
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
}

/**
 * Sanitize URL - validates and cleans URLs
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  
  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Sanitize email - basic email validation
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email) return null
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const trimmed = email.trim().toLowerCase()
  
  if (emailRegex.test(trimmed)) {
    return trimmed
  }
  
  return null
}

/**
 * Sanitize phone number - ensures E.164 format
 */
export function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  
  const phoneRegex = /^\+[1-9]\d{1,14}$/
  const trimmed = phone.trim()
  
  if (phoneRegex.test(trimmed)) {
    return trimmed
  }
  
  return null
}

/**
 * Sanitize filename - removes dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/[<>:"|?*]/g, '') // Remove dangerous characters
    .replace(/\.\./g, '') // Remove parent directory references
    .substring(0, 255) // Limit length
}

/**
 * Escape HTML for safe display (prevents XSS)
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  
  return text.replace(/[&<>"']/g, (m) => map[m])
}



