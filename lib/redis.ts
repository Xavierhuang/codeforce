import Redis from 'ioredis'

/**
 * Redis Client Configuration
 * Supports both Redis URL and individual connection parameters
 */

let redisClient: Redis | null = null

/**
 * Get or create Redis client instance
 * Uses singleton pattern to reuse connection
 */
export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient
  }

  // Try to use Redis URL first (for managed Redis services)
  const redisUrl = process.env.REDIS_URL

  if (redisUrl) {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      reconnectOnError(err) {
        const targetError = 'READONLY'
        if (err.message.includes(targetError)) {
          return true // Reconnect on READONLY error
        }
        return false
      },
    })
  } else {
    // Fallback to individual connection parameters
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      reconnectOnError(err) {
        const targetError = 'READONLY'
        if (err.message.includes(targetError)) {
          return true
        }
        return false
      },
    })
  }

  // Handle connection events
  redisClient.on('connect', () => {
    console.log('Redis client connected')
  })

  redisClient.on('error', (err) => {
    console.error('Redis client error:', err)
    // Don't throw - allow fallback to in-memory rate limiting
  })

  redisClient.on('close', () => {
    console.log('Redis client connection closed')
  })

  return redisClient
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = getRedisClient()
    await client.ping()
    return true
  } catch (error) {
    console.warn('Redis not available, falling back to in-memory rate limiting')
    return false
  }
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}





