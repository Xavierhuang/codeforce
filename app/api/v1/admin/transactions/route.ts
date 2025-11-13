import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN')

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const buyerId = searchParams.get('buyerId')
    const workerId = searchParams.get('workerId')
    const taskId = searchParams.get('taskId')

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (buyerId) {
      where.buyerId = buyerId
    }

    if (workerId) {
      where.workerId = workerId
    }

    if (taskId) {
      where.taskId = taskId
    }

    const transactions = await prisma.transaction.findMany({
      where,
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
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(transactions)
  } catch (error: any) {
    console.error('Error fetching transactions:', error)
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


