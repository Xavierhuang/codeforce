/**
 * Contact information filter
 * Prevents sharing of personal contact information (emails, phone numbers) in messages
 */

/**
 * Email regex pattern
 * Matches common email formats
 */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

/**
 * Phone number regex patterns
 * Matches various phone number formats:
 * - US/Canada: (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890
 * - International: +1 123 456 7890, +44 20 1234 5678, etc.
 * - With spaces/dashes: 123 456 7890, 123-456-7890
 */
const PHONE_PATTERNS = [
  /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, // International format
  /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // US/Canada format (123) 456-7890
  /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g, // 123-456-7890
  /\d{10,}/g, // 10+ consecutive digits (likely phone number)
]

/**
 * Check if text contains email addresses
 */
export function containsEmail(text: string): boolean {
  return EMAIL_PATTERN.test(text)
}

/**
 * Check if text contains phone numbers
 */
export function containsPhoneNumber(text: string): boolean {
  // Remove common non-phone number patterns (dates, IDs, etc.)
  const cleanedText = text
    .replace(/\d{4}-\d{2}-\d{2}/g, '') // Dates: 2024-01-01
    .replace(/\d{2}\/\d{2}\/\d{4}/g, '') // Dates: 01/01/2024
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '') // IP addresses
    .replace(/\b[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}\b/gi, '') // UUIDs
  
  // Check against phone patterns
  for (const pattern of PHONE_PATTERNS) {
    const matches = cleanedText.match(pattern)
    if (matches) {
      // Filter out false positives (too short, part of URLs, etc.)
      const validMatches = matches.filter(match => {
        const cleanedMatch = match.replace(/[-.\s()]/g, '')
        // Must be 10-15 digits (valid phone number length)
        if (cleanedMatch.length < 10 || cleanedMatch.length > 15) {
          return false
        }
        // Not part of a URL
        if (match.includes('http') || match.includes('www.')) {
          return false
        }
        return true
      })
      if (validMatches.length > 0) {
        return true
      }
    }
  }
  
  return false
}

/**
 * Check if text contains any contact information (email or phone)
 */
export function containsContactInfo(text: string): boolean {
  return containsEmail(text) || containsPhoneNumber(text)
}

/**
 * Get a user-friendly error message for contact info violations
 */
export function getContactInfoErrorMessage(text: string): string {
  const hasEmail = containsEmail(text)
  const hasPhone = containsPhoneNumber(text)
  
  if (hasEmail && hasPhone) {
    return 'Messages cannot contain email addresses or phone numbers. Please use the platform messaging system instead.'
  } else if (hasEmail) {
    return 'Messages cannot contain email addresses. Please use the platform messaging system instead.'
  } else if (hasPhone) {
    return 'Messages cannot contain phone numbers. Please use the platform messaging system instead.'
  }
  
  return 'Message contains prohibited content.'
}

