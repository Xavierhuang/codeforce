import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateUniqueSlug, generateSlug } from '@/lib/slug'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, phone, role } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
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

    if (phone && !/^\+[1-9]\d{1,14}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Phone number must be in E.164 format (e.g., +1234567890)' },
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
        existingSlugs.map((u) => u.slug!).filter(Boolean)
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

