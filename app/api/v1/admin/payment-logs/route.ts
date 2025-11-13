import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN')

    const { searchParams } = new URL(req.url)
    const paymentIntentId = searchParams.get('paymentIntentId')
    const eventType = searchParams.get('eventType')
    const level = searchParams.get('level')
    const source = searchParams.get('source')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}

    if (paymentIntentId) {
      where.paymentIntentId = paymentIntentId
    }

    if (eventType) {
      where.eventType = eventType
    }

    if (level) {
      where.level = level
    }

    if (source) {
      where.source = source
    }

    const [logs, total] = await Promise.all([
      prisma.paymentLog.findMany({
        where,
        include: {
          transaction: {
            include: {
              buyer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              worker: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              task: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.paymentLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Error fetching payment logs:', error)
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


