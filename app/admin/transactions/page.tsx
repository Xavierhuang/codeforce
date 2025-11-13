'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { Search, Filter, DollarSign, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  AUTHORIZED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  CAPTURED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

const STATUS_ICONS: Record<string, any> = {
  PENDING: Clock,
  AUTHORIZED: Clock,
  CAPTURED: CheckCircle,
  FAILED: XCircle,
  REFUNDED: AlertCircle,
}

function getStatusBadge(status: string) {
  const Icon = STATUS_ICONS[status] || AlertCircle
  return (
    <Badge className={STATUS_COLORS[status] || 'bg-gray-100'}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  )
}

export default function AdminTransactionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: transactions, mutate } = useSWR(
    status === 'authenticated' ? '/api/v1/admin/transactions' : null,
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

  // Filter transactions
  const filteredTransactions = transactions?.filter((tx: any) => {
    const matchesSearch = !searchQuery ||
      tx.paymentIntentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.buyer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.buyer?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.worker?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.worker?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.task?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || tx.status === statusFilter

    return matchesSearch && matchesStatus
  }) || []

  // Calculate totals
  const totals = filteredTransactions.reduce(
    (acc: any, tx: any) => {
      acc.totalAmount += tx.amount || 0
      acc.totalBaseAmount += tx.baseAmount || 0
      acc.totalPlatformFee += tx.platformFee || 0
      acc.totalStripeFee += tx.stripeFee || 0
      if (tx.status === 'CAPTURED') {
        acc.capturedAmount += tx.amount || 0
      }
      return acc
    },
    {
      totalAmount: 0,
      totalBaseAmount: 0,
      totalPlatformFee: 0,
      totalStripeFee: 0,
      capturedAmount: 0,
    }
  )

  if (!mounted) {
    return null
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Transactions</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            View and manage all payment transactions
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTransactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Captured</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.capturedAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalPlatformFee)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Stripe Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalStripeFee)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="AUTHORIZED">Authorized</SelectItem>
                  <SelectItem value="CAPTURED">Captured</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">All Transactions</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredTransactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="p-3 md:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm md:text-base">
                          {formatCurrency(tx.amount)}
                        </span>
                        {getStatusBadge(tx.status)}
                      </div>
                      <div className="space-y-1 text-xs md:text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Payment Intent:</span> {tx.paymentIntentId}
                        </div>
                        <div>
                          <span className="font-medium">Buyer:</span> {tx.buyer?.name || tx.buyer?.email || 'Unknown'}
                        </div>
                        {tx.worker && (
                          <div>
                            <span className="font-medium">Worker:</span> {tx.worker.name || tx.worker.email || 'Unknown'}
                          </div>
                        )}
                        {tx.task && (
                          <div>
                            <span className="font-medium">Task:</span> {tx.task.title || tx.task.id}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2">
                          <span>Base: {formatCurrency(tx.baseAmount)}</span>
                          <span>Platform Fee: {formatCurrency(tx.platformFee)}</span>
                          <span>Stripe Fee: {formatCurrency(tx.stripeFee)}</span>
                          {tx.workerPayout && (
                            <span className="text-green-600 dark:text-green-400">
                              Worker Payout: {formatCurrency(tx.workerPayout)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a')}
                          {tx.receiptSent && (
                            <span className="ml-2 text-green-600 dark:text-green-400">• Receipt sent</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


