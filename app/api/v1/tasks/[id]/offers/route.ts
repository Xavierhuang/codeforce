import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { validateBody, validateParams } from '@/lib/validation'
import { OfferCreateSchema, TaskIdParamSchema } from '@/lib/validation-schemas'
import { z } from 'zod'
import { sanitizeText } from '@/lib/sanitize'
import { createNotification } from '@/lib/notifications'
import { rateLimit, rateLimitConfigs } from '@/lib/rate-limit'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const worker = await requireRole('WORKER')
    
    // Rate limiting for offer submission
    const rateLimitResponse = await rateLimit(req, rateLimitConfigs.offer, worker.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    // Validate route parameters
    const paramValidation = validateParams(params, TaskIdParamSchema)
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid task ID',
          details: paramValidation.errors.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      )
    }
    
    // Validate request body
    const validation = await validateBody(req, OfferCreateSchema.extend({
      hourly: z.boolean().optional(),
      estimatedDurationMins: z.number().int().positive().max(10080).optional().nullable(),
    }))
    if (!validation.success) {
      return validation.response
    }
    
    const { price, message, estimatedCompletionDate } = validation.data
    const hourly = (validation.data as any).hourly || false
    const estimatedDurationMins = (validation.data as any).estimatedDurationMins || null
    
    const taskId = paramValidation.data.id

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.status !== 'OPEN' && task.status !== 'OFFERED') {
      return NextResponse.json(
        { error: 'Task is not accepting offers' },
        { status: 400 }
      )
    }

    // Check if worker already made an offer
    const existingOffer = await prisma.offer.findFirst({
      where: {
        taskId: taskId,
        workerId: worker.id,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    })

    if (existingOffer) {
      return NextResponse.json(
        { error: 'You already have a pending offer for this task' },
        { status: 400 }
      )
    }

    const offer = await prisma.offer.create({
      data: {
        taskId: taskId,
        workerId: worker.id,
        price,
        hourly: hourly || false,
        message: message ? sanitizeText(message) : null,
        estimatedCompletionDate: estimatedCompletionDate ? new Date(estimatedCompletionDate) : null,
        estimatedDurationMins: estimatedDurationMins || null,
      },
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
    })

    // Update task status to OFFERED if it was OPEN
    if (task.status === 'OPEN') {
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'OFFERED' },
      })
    }

    // Send notification to client
    await createNotification(
      task.clientId,
      'offer_submitted',
      `New offer received for task "${task.title}" from ${worker.name || 'a worker'}`,
      taskId
    )

    return NextResponse.json(offer, { status: 201 })
  } catch (error: any) {
    console.error('Error creating offer:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    
    const task = await prisma.task.findUnique({
      where: { id: params.id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only client or admin can see offers
    if (task.clientId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const offers = await prisma.offer.findMany({
      where: { taskId: params.id },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            rating: true,
            ratingCount: true,
            skills: true,
            verificationStatus: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(offers)
  } catch (error: any) {
    console.error('Error fetching offers:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

