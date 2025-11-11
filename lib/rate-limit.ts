import { NextRequest, NextResponse } from 'next/server'
import { Errors } from './errors'
import { getRedisClient, isRedisAvailable } from './redis'

/**
 * Rate Limiting Configuration
 * 
 * Uses Redis for distributed rate limiting across multiple instances.
 * Falls back to in-memory storage if Redis is unavailable.
 */

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  identifier?: (req: NextRequest) => string // Custom identifier function
}

interface RateLimitRecord {
  count: number
  resetTime: number
}

// Fallback in-memory storage (used if Redis unavailable)
const rateLimitStore = new Map<string, RateLimitRecord>()

// Cleanup old entries every 5 minutes (for in-memory fallback)
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Get identifier for rate limiting
 * Uses user ID if authenticated, otherwise IP address
 */
function getIdentifier(req: NextRequest, userId?: string): string {
  if (userId) {
    return userId
  }
  
  // Extract IP address
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded 
    ? forwarded.split(',')[0].trim() 
    : req.headers.get('x-real-ip') || 
      req.headers.get('cf-connecting-ip') || 
      'unknown'
  
  return ip
}

/**
 * Check rate limit using Redis
 */
async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; limit: number; remaining: number; resetTime: number }> {
  const redis = getRedisClient()
  const now = Date.now()
  const windowMs = config.windowMs
  const resetTime = now + windowMs

  try {
    // Use Redis sliding window with sorted set
    const redisKey = `ratelimit:${key}`
    const windowStart = now - windowMs

    // Remove old entries outside the window
    await redis.zremrangebyscore(redisKey, 0, windowStart)

    // Count current requests in window
    const count = await redis.zcard(redisKey)

    if (count >= config.maxRequests) {
      // Get oldest entry to calculate reset time
      const oldest = await redis.zrange(redisKey, 0, 0, 'WITHSCORES')
      const oldestTimestamp = oldest.length > 0 ? parseInt(oldest[1]) : now
      const actualResetTime = oldestTimestamp + windowMs

      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: actualResetTime,
      }
    }

    // Add current request
    await redis.zadd(redisKey, now, `${now}-${Math.random()}`)
    // Set expiration to window size + 1 minute buffer
    await redis.expire(redisKey, Math.ceil(windowMs / 1000) + 60)

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - count - 1,
      resetTime,
    }
  } catch (error) {
    console.error('Redis rate limit error, falling back to in-memory:', error)
    // Fall back to in-memory
    return checkRateLimitMemory(key, config)
  }
}

/**
 * Check rate limit using in-memory storage (fallback)
 */
function checkRateLimitMemory(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; limit: number; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    const resetTime = now + config.windowMs
    rateLimitStore.set(key, { count: 1, resetTime })
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime,
    }
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: record.resetTime,
    }
  }

  // Increment count
  record.count++
  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  }
}

/**
 * Rate limit middleware
 * Returns NextResponse with 429 status if limit exceeded, null otherwise
 */
export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<NextResponse | null> {
  const identifier = config.identifier 
    ? config.identifier(req)
    : getIdentifier(req, userId)
  
  const key = `${config.windowMs}:${config.maxRequests}:${identifier}`
  
  // Check if Redis is available
  const redisAvailable = await isRedisAvailable()
  const result = redisAvailable
    ? await checkRateLimitRedis(key, config)
    : checkRateLimitMemory(key, config)

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
    
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    )
  }

  return null
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
  // Authentication endpoints - strict limits to prevent brute force
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
  
  // General API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
  
  // Review creation - prevent spam
  review: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
  },
  
  // File uploads - prevent abuse
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  },
  
  // Support tickets - prevent spam
  support: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
  },
  
  // Task creation
  task: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  
  // Offer submission
  offer: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  },
  
  // Message sending
  message: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  },
  
  // Admin endpoints - more lenient
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
  },
}

/**
 * Helper function to add rate limit headers to successful responses
 */
export async function addRateLimitHeaders(
  response: NextResponse,
  config: RateLimitConfig,
  identifier: string
): Promise<NextResponse> {
  const key = `${config.windowMs}:${config.maxRequests}:${identifier}`
  
  try {
    const redisAvailable = await isRedisAvailable()
    if (redisAvailable) {
      const redis = getRedisClient()
      const redisKey = `ratelimit:${key}`
      const count = await redis.zcard(redisKey)
      const remaining = Math.max(0, config.maxRequests - count)
      const now = Date.now()
      const resetTime = now + config.windowMs
      
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', resetTime.toString())
    } else {
      // Fallback to in-memory
      const record = rateLimitStore.get(key)
      if (record) {
        const remaining = Math.max(0, config.maxRequests - record.count)
        response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
        response.headers.set('X-RateLimit-Remaining', remaining.toString())
        response.headers.set('X-RateLimit-Reset', record.resetTime.toString())
      }
    }
  } catch (error) {
    // Silently fail - headers are optional
    console.error('Error adding rate limit headers:', error)
  }
  
  return response
}
