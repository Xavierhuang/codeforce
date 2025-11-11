/**
 * Password Policy and Validation
 * Enforces strong password requirements
 */

// Common passwords that should be rejected
const COMMON_PASSWORDS = [
  'password',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwertyuiop',
  'password123',
  'password1',
  'Password1',
  'Password123',
  'admin123',
  'letmein',
  'welcome123',
  'monkey123',
  '12345678910',
  'iloveyou',
  'princess',
  'rockyou',
  '1234567',
  'sunshine',
  'master',
  'hello123',
  'freedom',
  'whatever',
  'qazwsx',
  'trustno1',
  'dragon',
  'baseball',
  'superman',
  'michael',
  'football',
  'shadow',
  'mustang',
  'jennifer',
  'jordan',
  'hunter',
  'buster',
  'soccer',
  'harley',
  'batman',
  'andrew',
  'tigger',
  'charlie',
  'robert',
  'michelle',
  'jessica',
  'pepper',
  'daniel',
  'access',
  'joshua',
  'maggie',
  'william',
  'thomas',
  'hockey',
  'ranger',
  'daniel',
  'hannah',
  'michael',
  'charlie',
  'samantha',
]

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong' | 'very-strong'
  score: number // 0-100
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = []
  let score = 0

  // Check length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  } else if (password.length >= 8) {
    score += 10
  }
  if (password.length >= 12) {
    score += 10
  }
  if (password.length >= 16) {
    score += 5
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  } else {
    score += 15
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  } else {
    score += 15
  }

  // Check for numbers
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  } else {
    score += 15
  }

  // Check for special characters
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)')
  } else {
    score += 20
  }

  // Check for spaces
  if (/\s/.test(password)) {
    errors.push('Password cannot contain spaces')
  }

  // Check maximum length
  if (password.length > 100) {
    errors.push('Password must be less than 100 characters')
  }

  // Check against common passwords
  const lowerPassword = password.toLowerCase()
  if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common.toLowerCase()))) {
    errors.push('Password is too common. Please choose a more unique password.')
    score = Math.max(0, score - 30)
  }

  // Check for repeated characters (e.g., "aaaa")
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password contains too many repeated characters')
    score = Math.max(0, score - 10)
  }

  // Check for sequential characters (e.g., "1234", "abcd")
  if (/1234|abcd|qwer|asdf|zxcv/i.test(password)) {
    errors.push('Password contains common sequences')
    score = Math.max(0, score - 10)
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong'
  if (score < 40) {
    strength = 'weak'
  } else if (score < 60) {
    strength = 'medium'
  } else if (score < 80) {
    strength = 'strong'
  } else {
    strength = 'very-strong'
  }

  // Password is invalid if there are any critical errors
  const hasCriticalErrors = errors.some(err => 
    err.includes('must contain') || 
    err.includes('cannot contain') || 
    err.includes('less than')
  )

  return {
    valid: !hasCriticalErrors && score >= 40, // Require at least medium strength and no critical errors
    errors,
    strength,
    score: Math.min(100, Math.max(0, score)),
  }
}

/**
 * Check if password meets minimum requirements
 */
export function meetsPasswordRequirements(password: string): boolean {
  const validation = validatePasswordStrength(password)
  return validation.valid
}

/**
 * Get password strength feedback
 */
export function getPasswordFeedback(password: string): {
  strength: 'weak' | 'medium' | 'strong' | 'very-strong'
  feedback: string[]
  score: number
} {
  const validation = validatePasswordStrength(password)
  const feedback: string[] = []

  if (password.length < 8) {
    feedback.push('Use at least 8 characters')
  } else if (password.length < 12) {
    feedback.push('Consider using 12+ characters for better security')
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('Add uppercase letters')
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('Add lowercase letters')
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('Add numbers')
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push('Add special characters')
  }

  if (feedback.length === 0 && validation.score >= 80) {
    feedback.push('Excellent password strength!')
  }

  return {
    strength: validation.strength,
    feedback,
    score: validation.score,
  }
}


