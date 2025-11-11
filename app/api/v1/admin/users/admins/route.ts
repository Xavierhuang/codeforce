import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { handleApiError, Errors } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    // Only admins can fetch admin user list
    await requireRole('ADMIN')
    
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
    
    return NextResponse.json(admins)
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to fetch admin users')
  }
}



