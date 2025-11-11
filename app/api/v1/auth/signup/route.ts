import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateUniqueSlug, generateSlug } from '@/lib/slug'
import { validateBody } from '@/lib/validation'
import { SignupSchema } from '@/lib/validation-schemas'
import { validatePasswordStrength } from '@/lib/password-policy'
import { rateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { getPlatformSettings } from '@/lib/settings'

export async function POST(req: NextRequest) {
  // Rate limiting - strict for signup to prevent abuse
  const rateLimitResponse = await rateLimit(req, rateLimitConfigs.auth)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    // Check if new registrations are allowed
    const settings = await getPlatformSettings()
    if (!settings.allowNewRegistrations) {
      return NextResponse.json(
        { error: 'New registrations are currently disabled. Please contact support for assistance.' },
        { status: 403 }
      )
    }
    // Validate request body
    const validation = await validateBody(req, SignupSchema)
    if (!validation.success) {
      return validation.response
    }
    
    const { email, password, name, phone, role } = validation.data

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          error: 'Password does not meet security requirements',
          details: passwordValidation.errors,
          strength: passwordValidation.strength,
        },
        { status: 400 }
      )
    }

    // Validate phone number for workers (must be in E.164 format)
    if (role === 'WORKER' && !phone) {
      return NextResponse.json(
        { error: 'Phone number is required for developers' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate slug for workers
    let slug: string | undefined = undefined
    if (role === 'WORKER') {
      const baseSlug = name || email.split('@')[0]
      const existingSlugs = await prisma.user.findMany({
        where: { slug: { not: null } },
        select: { slug: true },
      })
      slug = generateUniqueSlug(
        baseSlug,
        existingSlugs.map((u: { slug: string | null }) => u.slug!).filter(Boolean)
      )
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        phone: phone || null,
        slug,
        hashedPassword,
        role: role === 'WORKER' ? 'WORKER' : 'CLIENT',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

