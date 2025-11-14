'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  PieChart,
  BarChart3,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Wallet,
  ArrowRight,
} from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

function SimpleLineChart({ data, label }: { data: Array<{ date: string; amount: number }>; label: string }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  const maxAmount = Math.max(...data.map((d) => d.amount), 1)
  const minAmount = Math.min(...data.map((d) => d.amount), 0)

  return (
    <div className="h-64 relative">
      <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill={`url(#gradient-${label})`}
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          points={data
            .map(
              (d, i) =>
                `${(i / (data.length - 1 || 1)) * 800},${200 - ((d.amount - minAmount) / (maxAmount - minAmount || 1)) * 180}`
            )
            .join(' ')}
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-2">
        <span>{format(new Date(data[0]?.date), 'MMM d')}</span>
        <span>{format(new Date(data[data.length - 1]?.date), 'MMM d')}</span>
      </div>
    </div>
  )
}

function SimplePieChart({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  let currentAngle = -90
  const radius = 80
  const centerX = 100
  const centerY = 100

  return (
    <div className="flex items-center justify-center">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100
          const angle = (item.value / total) * 360
          const startAngle = currentAngle
          const endAngle = currentAngle + angle

          const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180)
          const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180)
          const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
          const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180)

          const largeArcFlag = angle > 180 ? 1 : 0

          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z',
          ].join(' ')

          currentAngle += angle

          return (
            <path
              key={index}
              d={pathData}
              fill={item.color}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity"
            />
          )
        })}
      </svg>
      <div className="ml-8 space-y-2">
        {data.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1)
          return (
            <div key={index} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
              <span className="text-sm">
                {item.label}: {formatCurrency(item.value)} ({percentage}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminRevenuePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: revenueData, mutate } = useSWR(
    status === 'authenticated' ? `/api/v1/admin/revenue?period=${period}` : null,
    fetcher
  )

  useEffect(() => {
    if (mounted && status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [mounted, status, router])

  useEffect(() => {
    if (mounted && session && session.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [mounted, session, router])

  if (!mounted || status === 'loading') {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated' || session?.user?.role !== 'ADMIN') {
    return (
      <div className="p-8">
        <div className="text-center">Redirecting...</div>
      </div>
    )
  }

  const data = revenueData || {
    moneyIn: { total: 0, captured: 0, platformFees: 0, byDay: [], byStatus: {} },
    moneyOut: { total: 0, byDay: [] },
    netRevenue: 0,
    transactionBreakdown: { hourly: 0, fixed: 0, weekly: 0 },
    paymentLogStats: { total: 0, errors: 0, warnings: 0, byLevel: {}, byEventType: {} },
    summary: { totalTransactions: 0, totalWeeklyPayments: 0, totalPayouts: 0 },
  }

  // Prepare pie chart data
  const statusPieData = Object.entries(data.moneyIn.byStatus || {}).map(([status, amount]: [string, any]) => ({
    label: status,
    value: amount,
    color:
      status === 'CAPTURED'
        ? '#22c55e'
        : status === 'PENDING'
        ? '#eab308'
        : status === 'FAILED'
        ? '#ef4444'
        : status === 'REFUNDED'
        ? '#6b7280'
        : '#3b82f6',
  }))

  const transactionTypePieData = [
    { label: 'Fixed Price', value: data.transactionBreakdown.fixed, color: '#3b82f6' },
    { label: 'Hourly', value: data.transactionBreakdown.hourly, color: '#22c55e' },
    { label: 'Weekly Payments', value: data.transactionBreakdown.weekly, color: '#eab308' },
  ].filter((item) => item.value > 0)

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Revenue Dashboard
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Comprehensive financial analytics and transaction monitoring
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Finance Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <Link href="/admin/transactions">
          <Card className="transition-all hover:border-primary/40 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Transactions
              </CardTitle>
              <CardDescription>
                Review all client payments, captures, and refunds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Go to transaction history</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/payment-logs">
          <Card className="transition-all hover:border-primary/40 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                Payment Logs
              </CardTitle>
              <CardDescription>
                Inspect Stripe events, webhooks, and error logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Monitor real-time payment activity</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/payouts">
          <Card className="transition-all hover:border-primary/40 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="w-4 h-4 text-blue-600" />
                Payouts
              </CardTitle>
              <CardDescription>
                Approve payout requests and track worker disbursements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Manage payout queue</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money In</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.moneyIn.total)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(data.moneyIn.captured)} captured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money Out</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.moneyOut.total)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.totalPayouts} payout{data.summary.totalPayouts !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.netRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Platform fees: {formatCurrency(data.moneyIn.platformFees)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.moneyIn.platformFees)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Stripe fees: {formatCurrency(data.moneyIn.stripeFees)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Money In Over Time
            </CardTitle>
            <CardDescription>Revenue trends for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleLineChart data={data.moneyIn.byDay} label="money-in" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Money Out Over Time
            </CardTitle>
            <CardDescription>Payout trends for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleLineChart data={data.moneyOut.byDay} label="money-out" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Transaction Status Breakdown
            </CardTitle>
            <CardDescription>Distribution by transaction status</CardDescription>
          </CardHeader>
          <CardContent>
            <SimplePieChart data={statusPieData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Transaction Type Breakdown
            </CardTitle>
            <CardDescription>Distribution by transaction type</CardDescription>
          </CardHeader>
          <CardContent>
            <SimplePieChart data={transactionTypePieData} />
          </CardContent>
        </Card>
      </div>

      {/* Transaction Logs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">
            <FileText className="w-4 h-4 mr-2" />
            Transactions ({data.summary.totalTransactions})
          </TabsTrigger>
          <TabsTrigger value="weekly-payments">
            <Clock className="w-4 h-4 mr-2" />
            Weekly Payments ({data.summary.totalWeeklyPayments})
          </TabsTrigger>
          <TabsTrigger value="payouts">
            <ArrowDown className="w-4 h-4 mr-2" />
            Payouts ({data.summary.totalPayouts})
          </TabsTrigger>
          <TabsTrigger value="payment-logs">
            <AlertCircle className="w-4 h-4 mr-2" />
            Payment Logs ({data.paymentLogStats.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>All payment transactions for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueData?.transactions?.length > 0 ? (
                <div className="space-y-3">
                  {revenueData.transactions.map((tx: any) => (
                    <div
                      key={tx.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold">{formatCurrency(tx.amount)}</span>
                            <Badge
                              variant={
                                tx.status === 'CAPTURED'
                                  ? 'default'
                                  : tx.status === 'FAILED'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {tx.status}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Buyer:</span> {tx.buyer?.name || tx.buyer?.email}
                            </div>
                            {tx.worker && (
                              <div>
                                <span className="font-medium">Worker:</span> {tx.worker.name || tx.worker.email}
                              </div>
                            )}
                            {tx.task && (
                              <div>
                                <span className="font-medium">Task:</span> {tx.task.title}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-3 mt-2">
                              <span>Base: {formatCurrency(tx.baseAmount)}</span>
                              <span>Platform Fee: {formatCurrency(tx.platformFee)}</span>
                              <span>Stripe Fee: {formatCurrency(tx.stripeFee)}</span>
                            </div>
                            <div className="text-xs mt-2">
                              {format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No transactions found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly-payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Payments</CardTitle>
              <CardDescription>Hourly work weekly payment records</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueData?.weeklyPayments?.length > 0 ? (
                <div className="space-y-3">
                  {revenueData.weeklyPayments.map((wp: any) => (
                    <div
                      key={wp.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold">{formatCurrency(wp.totalAmount)}</span>
                            <Badge
                              variant={
                                wp.status === 'COMPLETED'
                                  ? 'default'
                                  : wp.status === 'FAILED'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {wp.status}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Hours:</span> {wp.hoursWorked} @{' '}
                              {formatCurrency(wp.hourlyRate)}/hr
                            </div>
                            <div>
                              <span className="font-medium">Week:</span>{' '}
                              {format(new Date(wp.weekStartDate), 'MMM d')} -{' '}
                              {format(new Date(wp.weekEndDate), 'MMM d, yyyy')}
                            </div>
                            {wp.task && (
                              <div>
                                <span className="font-medium">Task:</span> {wp.task.title}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-3 mt-2">
                              <span>Base: {formatCurrency(wp.baseAmount)}</span>
                              <span>Platform Fee: {formatCurrency(wp.platformFee)}</span>
                              <span>Worker Payout: {formatCurrency(wp.workerPayout)}</span>
                            </div>
                            <div className="text-xs mt-2">
                              {format(new Date(wp.createdAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No weekly payments found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payouts</CardTitle>
              <CardDescription>Worker payout records</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueData?.payouts?.length > 0 ? (
                <div className="space-y-3">
                  {revenueData.payouts.map((payout: any) => (
                    <div
                      key={payout.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowDown className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold">{formatCurrency(payout.amount)}</span>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Worker:</span> {payout.worker?.name || payout.worker?.email}
                            </div>
                            <div>
                              <span className="font-medium">Fee:</span> {formatCurrency(payout.fee)}
                            </div>
                            {payout.stripePayoutId && (
                              <div>
                                <span className="font-medium">Stripe Payout ID:</span> {payout.stripePayoutId}
                              </div>
                            )}
                            <div className="text-xs mt-2">
                              {format(new Date(payout.createdAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowDown className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No payouts found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Logs</CardTitle>
              <CardDescription>
                System payment event logs ({data.paymentLogStats.errors} errors, {data.paymentLogStats.warnings}{' '}
                warnings)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {revenueData?.paymentLogs?.length > 0 ? (
                <div className="space-y-3">
                  {revenueData.paymentLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle
                              className={`w-4 h-4 ${
                                log.level === 'ERROR' || log.level === 'CRITICAL'
                                  ? 'text-red-600'
                                  : log.level === 'WARNING'
                                  ? 'text-yellow-600'
                                  : 'text-blue-600'
                              }`}
                            />
                            <span className="font-semibold">{log.eventType}</span>
                            <Badge
                              variant={
                                log.level === 'ERROR' || log.level === 'CRITICAL'
                                  ? 'destructive'
                                  : log.level === 'WARNING'
                                  ? 'secondary'
                                  : 'default'
                              }
                            >
                              {log.level}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Message:</span> {log.message}
                            </div>
                            <div>
                              <span className="font-medium">Source:</span> {log.source}
                            </div>
                            {log.transaction && (
                              <>
                                {log.transaction.buyer && (
                                  <div>
                                    <span className="font-medium">Buyer:</span>{' '}
                                    {log.transaction.buyer.name || log.transaction.buyer.email}
                                  </div>
                                )}
                                {log.transaction.worker && (
                                  <div>
                                    <span className="font-medium">Worker:</span>{' '}
                                    {log.transaction.worker.name || log.transaction.worker.email}
                                  </div>
                                )}
                              </>
                            )}
                            <div className="text-xs mt-2">
                              {format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No payment logs found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

