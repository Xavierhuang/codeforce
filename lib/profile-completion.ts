import { prisma } from './prisma'

/**
 * Check if a user's profile is complete enough to use the platform
 * Returns completion status and missing fields
 */
export async function checkProfileCompletion(userId: string): Promise<{
  isComplete: boolean
  missingFields: string[]
  completionPercentage: number
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: true,
    },
  })

  if (!user) {
    return {
      isComplete: false,
      missingFields: ['User not found'],
      completionPercentage: 0,
    }
  }

  const requiredFields: string[] = []

  // Common required fields for all users
  if (!user.name || user.name.trim().length === 0) {
    requiredFields.push('name')
  }

  // Role-specific requirements
  if (user.role === 'WORKER') {
    // Workers need bio, at least one skill, and hourly rate
    if (!user.bio || user.bio.trim().length < 20) {
      requiredFields.push('bio')
    }
    if (!user.skills || user.skills.length === 0) {
      requiredFields.push('skills')
    }
    if (!user.hourlyRate || user.hourlyRate <= 0) {
      requiredFields.push('hourlyRate')
    }
    if (!user.serviceType) {
      requiredFields.push('serviceType')
    }
    // If service type requires location
    if ((user.serviceType === 'IN_PERSON' || user.serviceType === 'BOTH') && (!user.locationLat || !user.locationLng)) {
      requiredFields.push('location')
    }
  } else if (user.role === 'CLIENT') {
    // Clients need at least name and email (already checked)
    // No additional required fields for basic onboarding
  }

  // Calculate completion percentage
  const totalFields = user.role === 'WORKER' ? 6 : 1 // name + role-specific fields
  const completedFields = totalFields - requiredFields.length
  const completionPercentage = Math.round((completedFields / totalFields) * 100)

  return {
    isComplete: requiredFields.length === 0,
    missingFields: requiredFields,
    completionPercentage,
  }
}

/**
 * Get profile completion status for API responses
 */
export async function getProfileCompletionStatus(userId: string) {
  return await checkProfileCompletion(userId)
}
