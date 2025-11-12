import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

/**
 * CSRF Protection utilities
 */

// In-memory CSRF token store (in production, use Redis)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>()
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000 // 1 hour

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Store CSRF token for a session
 */
export function storeCSRFToken(sessionId: string, token: string): void {
  csrfTokens.set(sessionId, {
    token,
    expiresAt: Date.now() + CSRF_TOKEN_EXPIRY,
  })
  
  // Clean up expired tokens periodically
  if (csrfTokens.size > 1000) {
    const now = Date.now()
    for (const [id, data] of Array.from(csrfTokens.entries())) {
      if (data.expiresAt < now) {
        csrfTokens.delete(id)
      }
    }
  }
}

/**
 * Verify CSRF token for a session
 */
export function verifyCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId)
  if (!stored) {
    return false
  }
  
  if (stored.expiresAt < Date.now()) {
    csrfTokens.delete(sessionId)
    return false
  }
  
  return stored.token === token
}

/**
 * Validate Origin header to prevent CSRF attacks
 */
export function validateOrigin(req: NextRequest): { valid: boolean; origin?: string } {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  
  // Get allowed origins from environment
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
  ].filter(Boolean) as string[]
  
  // For same-origin requests, origin might be null
  if (!origin && !referer) {
    // Allow requests without origin/referer if they're from the same origin
    // (e.g., form submissions, same-origin fetch)
    return { valid: true }
  }
  
  if (origin) {
    // Check if origin is in allowed list
    const isValid = allowedOrigins.some(allowed => {
      try {
        const originUrl = new URL(origin)
        const allowedUrl = new URL(allowed)
        return originUrl.origin === allowedUrl.origin
      } catch {
        return false
      }
    })
    
    if (isValid) {
      return { valid: true, origin }
    }
  }
  
  // Fallback to referer check
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      const isValid = allowedOrigins.some(allowed => {
        try {
          const allowedUrl = new URL(allowed)
          return refererUrl.origin === allowedUrl.origin
        } catch {
          return false
        }
      })
      
      if (isValid) {
        return { valid: true, origin: refererUrl.origin }
      }
    } catch {
      // Invalid referer URL
    }
  }
  
  return { valid: false }
}

/**
 * CSRF protection middleware for state-changing operations
 * Use this for POST, PUT, DELETE, PATCH requests
 */
export async function requireCSRF(
  req: NextRequest
): Promise<{ valid: boolean; response?: NextResponse }> {
  // Skip CSRF check for GET, HEAD, OPTIONS
  const method = req.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true }
  }
  
  // Validate Origin header
  const originValidation = validateOrigin(req)
  if (!originValidation.valid) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Invalid origin. CSRF protection triggered.' },
        { status: 403 }
      ),
    }
  }
  
  // For API routes, we rely on SameSite cookies and Origin validation
  // Additional CSRF token validation can be added for critical operations
  return { valid: true }
}

/**
 * Get CSRF token for current session
 * Note: This function requires getServerSession which cannot be used in Edge runtime (middleware)
 * If you need this function, import it from a separate file that's not used in middleware
 */
// export async function getCSRFToken(req: NextRequest): Promise<string | null> {
//   const session = await getServerSession(authOptions)
//   if (!session?.user?.id) {
//     return null
//   }
//   
//   const stored = csrfTokens.get(session.user.id)
//   if (stored && stored.expiresAt > Date.now()) {
//     return stored.token
//   }
//   
//   // Generate new token
//   const token = generateCSRFToken()
//   storeCSRFToken(session.user.id, token)
//   return token
// }


