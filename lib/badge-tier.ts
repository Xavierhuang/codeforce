/**
 * Badge tier types for taskers
 */
export type TaskerBadgeTier = 'STARTER' | 'VERIFIED' | 'PROFESSIONAL' | 'EXPERT' | 'ELITE'

/**
 * Calculate badge tier based on performance metrics
 * 
 * @param tasksCompleted - Number of completed tasks
 * @param rating - Average rating (0-5)
 * @param reviewCount - Number of reviews received
 * @returns Badge tier string
 */
export function calculateBadgeTier(
  tasksCompleted: number,
  rating: number,
  reviewCount: number
): TaskerBadgeTier {
  // ELITE: 500+ tasks, 4.8+ rating, 100+ reviews
  if (tasksCompleted >= 500 && rating >= 4.8 && reviewCount >= 100) {
    return 'ELITE'
  }

  // EXPERT: 200+ tasks, 4.5+ rating, 50+ reviews
  if (tasksCompleted >= 200 && rating >= 4.5 && reviewCount >= 50) {
    return 'EXPERT'
  }

  // PROFESSIONAL: 50+ tasks, 4.0+ rating, 10+ reviews
  if (tasksCompleted >= 50 && rating >= 4.0 && reviewCount >= 10) {
    return 'PROFESSIONAL'
  }

  // VERIFIED: 10+ tasks, 3.5+ rating, 3+ reviews
  if (tasksCompleted >= 10 && rating >= 3.5 && reviewCount >= 3) {
    return 'VERIFIED'
  }

  // STARTER: Default for new workers
  return 'STARTER'
}






