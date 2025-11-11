import { prisma } from './prisma'
import { AppError, ErrorCode } from './errors'

/**
 * Check if a user account is suspended
 */
export async function checkSuspension(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      suspendedUntil: true,
      suspensionReason: true,
    },
  })

  if (!user) {
    return // User doesn't exist, let auth handle it
  }

  // Check if user is suspended
  if (user.suspendedUntil) {
    const now = new Date()
    
    // If suspension has expired, clear it
    if (user.suspendedUntil < now) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          suspendedUntil: null,
          suspensionReason: null,
        },
      })
      return // Suspension expired, allow access
    }
    
    // User is still suspended
    throw new AppError(
      `Account suspended${user.suspensionReason ? `: ${user.suspensionReason}` : ''}. Suspension expires ${user.suspendedUntil.toISOString()}`,
      403,
      ErrorCode.FORBIDDEN
    )
  }
}



