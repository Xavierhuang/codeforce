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
    status: 'APPROVED',
  }
  
  if (serviceName) {
    where.serviceName = serviceName
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
  
  if (serviceName) {
    // Update WorkerService rating
    await prisma.workerService.updateMany({
      where: {
        workerId: userId,
        skillName: serviceName,
      },
      data: {
        rating: result.rating,
        ratingCount: result.ratingCount,
      },
    })
  } else {
    // Update User rating
    await prisma.user.update({
      where: { id: userId },
      data: {
        rating: result.rating,
        ratingCount: result.ratingCount,
      },
    })
  }
  
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
        some: {
          status: 'APPROVED',
        },
      },
    },
    select: {
      id: true,
    },
  })
  
  // Batch update ratings
  await batchUpdateUserRatings(usersWithReviews.map(u => u.id))
  
  // Update service-specific ratings
  const workerServices = await prisma.workerService.findMany({
    select: {
      workerId: true,
      skillName: true,
    },
  })
  
  await Promise.all(
    workerServices.map(ws => updateUserRating(ws.workerId, ws.skillName))
  )
}


