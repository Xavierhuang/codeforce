import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN')

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '30' // days
    const days = parseInt(period)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Get all transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
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
        weeklyPayments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get all weekly payments
    const weeklyPayments = await prisma.weeklyPayment.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get all payouts
    const payouts = await prisma.payout.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get all payment logs
    const paymentLogs = await prisma.paymentLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
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
      take: 1000, // Limit to recent logs
    })

    // Calculate money in (revenue from transactions)
    const moneyIn = {
      total: 0,
      captured: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
      platformFees: 0,
      stripeFees: 0,
      byStatus: {} as Record<string, number>,
      byDay: [] as Array<{ date: string; amount: number; platformFee: number }>,
    }

    // Calculate money out (payouts to workers)
    const moneyOut = {
      total: 0,
      byDay: [] as Array<{ date: string; amount: number }>,
    }

    // Process transactions
    transactions.forEach((tx) => {
      moneyIn.total += tx.amount
      moneyIn.platformFees += tx.platformFee
      moneyIn.stripeFees += tx.stripeFee

      if (!moneyIn.byStatus[tx.status]) {
        moneyIn.byStatus[tx.status] = 0
      }
      moneyIn.byStatus[tx.status] += tx.amount

      if (tx.status === 'CAPTURED') {
        moneyIn.captured += tx.amount
      } else if (tx.status === 'PENDING' || tx.status === 'AUTHORIZED') {
        moneyIn.pending += tx.amount
      } else if (tx.status === 'FAILED') {
        moneyIn.failed += tx.amount
      } else if (tx.status === 'REFUNDED') {
        moneyIn.refunded += tx.amount
      }

      // Group by day
      const dateKey = new Date(tx.createdAt).toISOString().split('T')[0]
      const dayEntry = moneyIn.byDay.find((d) => d.date === dateKey)
      if (dayEntry) {
        dayEntry.amount += tx.amount
        dayEntry.platformFee += tx.platformFee
      } else {
        moneyIn.byDay.push({
          date: dateKey,
          amount: tx.amount,
          platformFee: tx.platformFee,
        })
      }
    })

    // Process payouts
    payouts.forEach((payout) => {
      moneyOut.total += payout.amount

      // Group by day
      const dateKey = new Date(payout.createdAt).toISOString().split('T')[0]
      const dayEntry = moneyOut.byDay.find((d) => d.date === dateKey)
      if (dayEntry) {
        dayEntry.amount += payout.amount
      } else {
        moneyOut.byDay.push({
          date: dateKey,
          amount: payout.amount,
        })
      }
    })

    // Sort by date
    moneyIn.byDay.sort((a, b) => a.date.localeCompare(b.date))
    moneyOut.byDay.sort((a, b) => a.date.localeCompare(b.date))

    // Calculate net revenue (money in - money out)
    const netRevenue = moneyIn.captured - moneyOut.total

    // Calculate transaction breakdown by type
    const transactionBreakdown = {
      hourly: 0,
      fixed: 0,
      weekly: 0,
    }

    transactions.forEach((tx) => {
      // Check if task has weekly payments (indicating hourly work)
      const hasWeeklyPayments = tx.weeklyPayments && tx.weeklyPayments.length > 0
      if (hasWeeklyPayments) {
        transactionBreakdown.hourly += tx.amount
      } else {
        transactionBreakdown.fixed += tx.amount
      }
    })

    weeklyPayments.forEach((wp) => {
      transactionBreakdown.weekly += wp.totalAmount
    })

    // Calculate payment log statistics
    const paymentLogStats = {
      total: paymentLogs.length,
      byLevel: {} as Record<string, number>,
      byEventType: {} as Record<string, number>,
      errors: paymentLogs.filter((log) => log.level === 'ERROR' || log.level === 'CRITICAL').length,
      warnings: paymentLogs.filter((log) => log.level === 'WARNING').length,
    }

    paymentLogs.forEach((log) => {
      if (!paymentLogStats.byLevel[log.level]) {
        paymentLogStats.byLevel[log.level] = 0
      }
      paymentLogStats.byLevel[log.level]++

      if (!paymentLogStats.byEventType[log.eventType]) {
        paymentLogStats.byEventType[log.eventType] = 0
      }
      paymentLogStats.byEventType[log.eventType]++
    })

    return NextResponse.json({
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      moneyIn,
      moneyOut,
      netRevenue,
      transactionBreakdown,
      paymentLogStats,
      summary: {
        totalTransactions: transactions.length,
        totalWeeklyPayments: weeklyPayments.length,
        totalPayouts: payouts.length,
        totalPaymentLogs: paymentLogs.length,
        averageTransactionAmount: transactions.length > 0 ? moneyIn.total / transactions.length : 0,
        averagePayoutAmount: payouts.length > 0 ? moneyOut.total / payouts.length : 0,
      },
      transactions: transactions.slice(0, 100), // Limit to recent 100
      weeklyPayments: weeklyPayments.slice(0, 100), // Limit to recent 100
      payouts: payouts.slice(0, 100), // Limit to recent 100
      paymentLogs: paymentLogs.slice(0, 500), // Limit to recent 500
    })
  } catch (error: any) {
    console.error('Error fetching revenue data:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

