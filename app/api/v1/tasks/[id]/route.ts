import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sanitizeText } from '@/lib/sanitize'
import { handleApiError, Errors } from '@/lib/errors'
import { rateLimit, rateLimitConfigs, addRateLimitHeaders } from '@/lib/rate-limit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    
    if (!resolvedParams?.id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    // Authentication check - require user to be logged in
    const user = await getCurrentUser()
    if (!user) {
      throw Errors.unauthorized()
    }
    
    // Rate limiting check
    const rateLimitResponse = await rateLimit(req, rateLimitConfigs.api, user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Fetch task
    const task = await prisma.task.findUnique({
      where: { id: resolvedParams.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            phone: true,
            rating: true,
            ratingCount: true,
            company: true,
            industry: true,
            companySize: true,
            budgetRange: true,
            createdAt: true,
          },
        },
        worker: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            rating: true,
            ratingCount: true,
            skills: true,
          },
        },
        offers: {
          include: {
            worker: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                rating: true,
                ratingCount: true,
                skills: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        attachments: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
    })

    if (!task) {
      throw Errors.notFound('Task')
    }

    // Access control: Only allow access if user is:
    // 1. The task client
    // 2. The task worker
    // 3. An admin
    // 4. Has submitted an offer (for open tasks)
    const isClient = task.clientId === user.id
    const isWorker = task.workerId === user.id
    const isAdmin = user.role === 'ADMIN'
    
    // Check if user has submitted an offer (for open/offered tasks)
    let hasOffer = false
    if (!isClient && !isWorker && !isAdmin && (task.status === 'OPEN' || task.status === 'OFFERED')) {
      const userOffer = await prisma.offer.findFirst({
        where: {
          taskId: task.id,
          workerId: user.id,
        },
      })
      hasOffer = !!userOffer
    }

    if (!isClient && !isWorker && !isAdmin && !hasOffer) {
      throw Errors.forbidden('You do not have permission to view this task')
    }

    const response = NextResponse.json(task)
    return addRateLimitHeaders(response, rateLimitConfigs.api, user.id)
  } catch (error: unknown) {
    console.error('Error fetching task:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorName = error instanceof Error ? error.name : undefined
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: errorName,
    })
    
    // Check if this is a Prisma schema mismatch error
    if (error instanceof Error && (error.message?.includes('Unknown field') || error.message?.includes('does not exist') || error.message?.includes('Invalid value'))) {
      return NextResponse.json(
        { 
          error: 'Database schema mismatch. Please restart the dev server to regenerate Prisma client.',
          details: 'The database schema is out of sync with the Prisma client. Stop the dev server and restart it.',
          code: 'SCHEMA_MISMATCH',
          originalError: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      )
    }
    
    // Return detailed error in development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        {
          error: 'Failed to fetch task',
          details: errorMessage,
          code: 'INTERNAL_ERROR',
          stack: errorStack
        },
        { status: 500 }
      )
    }
    
    return handleApiError(error, 'Failed to fetch task')
  }
}

// Zod schema for task update - only allows safe fields to be updated
const TaskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  addressLat: z.number().min(-90).max(90).optional().nullable(),
  addressLng: z.number().min(-180).max(180).optional().nullable(),
  estimatedDurationMins: z.number().int().positive().optional().nullable(),
}).strict() // .strict() prevents additional properties

// Admin-only schema for status changes
const AdminTaskUpdateSchema = TaskUpdateSchema.extend({
  status: z.enum(['OPEN', 'OFFERED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED']).optional(),
  price: z.number().positive().optional().nullable(),
}).strict()

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    
    if (!resolvedParams?.id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    const user = await requireAuth()
    const rawBody = await req.json()

    const task = await prisma.task.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!task) {
      throw Errors.notFound('Task')
    }

    // Authorization check
    const isClient = task.clientId === user.id
    const isAdmin = user.role === 'ADMIN'
    
    if (!isClient && !isAdmin) {
      throw Errors.forbidden('You do not have permission to update this task')
    }

    // Validate input based on user role
    let validatedData: z.infer<typeof TaskUpdateSchema> | z.infer<typeof AdminTaskUpdateSchema>
    
    try {
      if (isAdmin) {
        // Admins can update status and price
        validatedData = AdminTaskUpdateSchema.parse(rawBody)
      } else {
        // Clients can only update safe fields
        validatedData = TaskUpdateSchema.parse(rawBody)
      }
    } catch (validationError: any) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationError.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        )
      }
      throw validationError
    }

    // Prepare update data
    const updateData: any = {}
    
    // Only include fields that were provided and are allowed
    if (validatedData.title !== undefined) {
      updateData.title = sanitizeText(validatedData.title)
    }
    if (validatedData.description !== undefined) {
      updateData.description = sanitizeText(validatedData.description)
    }
    if (validatedData.scheduledAt !== undefined) {
      updateData.scheduledAt = validatedData.scheduledAt 
        ? new Date(validatedData.scheduledAt) 
        : null
    }
    if (validatedData.address !== undefined) {
      updateData.address = validatedData.address ? sanitizeText(validatedData.address) : null
    }
    if (validatedData.addressLat !== undefined) {
      updateData.addressLat = validatedData.addressLat
    }
    if (validatedData.addressLng !== undefined) {
      updateData.addressLng = validatedData.addressLng
    }
    if (validatedData.estimatedDurationMins !== undefined) {
      updateData.estimatedDurationMins = validatedData.estimatedDurationMins
    }
    
    // Admin-only fields
    if (isAdmin && 'status' in validatedData && validatedData.status !== undefined) {
      updateData.status = validatedData.status
    }
    if (isAdmin && 'price' in validatedData && validatedData.price !== undefined) {
      updateData.price = validatedData.price
    }

    // Prevent updating sensitive fields that should never be changed via this endpoint
    // These fields are managed by the system:
    // - clientId: set at creation, never changes
    // - workerId: set when offer is accepted
    // - paymentIntentId: set during payment flow
    // - stripeChargeId: set by webhook
    // - createdAt: immutable
    // - offerId: set during offer acceptance

    const updatedTask = await prisma.task.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        worker: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json(updatedTask)
  } catch (error: unknown) {
    return handleApiError(error, 'Failed to update task')
  }
}

