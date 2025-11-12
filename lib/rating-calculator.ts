import { prisma } from './prisma'

/**
 * Optimized Rating Calculator
 * Provides efficient rating calculation functions with caching considerations
 */

interface RatingResult {
  rating: number
  ratingCount: number
}

/**
 * Calculate user rating efficiently
 * Uses database aggregation for optimal performance
 */
export async function calculateUserRating(
  userId: string,
  serviceName?: string
): Promise<RatingResult> {
  const where: any = {
    targetUserId: userId,
    // Note: Review model doesn't have status or serviceName fields
  }
  
  const ratingData = await prisma.review.aggregate({
    where,
    _avg: { rating: true },
    _count: { rating: true },
  })
  
  return {
    rating: ratingData._avg.rating ? Number(ratingData._avg.rating.toFixed(2)) : 0,
    ratingCount: ratingData._count.rating || 0,
  }
}

/**
 * Calculate and update user rating
 * Optimized for batch operations
 */
export async function updateUserRating(
  userId: string,
  serviceName?: string
): Promise<RatingResult> {
  const result = await calculateUserRating(userId, serviceName)
  
  // Update User rating (workerServices is a JSON field, so we can't update individual service ratings)
  await prisma.user.update({
    where: { id: userId },
    data: {
      rating: result.rating,
      ratingCount: result.ratingCount,
    },
  })
  
  return result
}

/**
 * Batch update ratings for multiple users
 * More efficient than individual updates
 */
export async function batchUpdateUserRatings(
  userIds: string[]
): Promise<void> {
  // Use Promise.all for parallel processing
  await Promise.all(
    userIds.map(userId => updateUserRating(userId))
  )
}

/**
 * Recalculate all ratings (for maintenance/repair)
 * Use sparingly - can be expensive
 */
export async function recalculateAllRatings(): Promise<void> {
  // Get all users with reviews
  const usersWithReviews = await prisma.user.findMany({
    where: {
      reviewsReceived: {
        some: {},
      },
    },
    select: {
      id: true,
    },
  })
  
  // Batch update ratings
  await batchUpdateUserRatings(usersWithReviews.map(u => u.id))
  
  // Service-specific ratings are stored in the workerServices JSON field
  // Individual service ratings would need to be updated by fetching users and updating the JSON field
  // This is skipped for now as it requires more complex logic
}


