import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './prisma'
import { checkSuspension } from './suspension-check'

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return null
  }

  return await prisma.user.findUnique({
    where: { email: session.user.email },
  })
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  // Check if user account is suspended
  await checkSuspension(user.id)
  
  return user
}

export async function requireRole(role: 'CLIENT' | 'WORKER' | 'ADMIN') {
  const user = await requireAuth()
  if (user.role !== role && user.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }
  return user
}

