'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { 
  Wallet, 
  DollarSign, 
  ArrowUpRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  Filter,
  Search,
  Calendar,
  Download,
  Info,
  AlertCircle
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function WalletComponent() {
  const { data: session } = useSession()
  const { data: user, mutate: mutateUser } = useSWR(
    session ? '/api/v1/users/me' : null,
    fetcher
  )
  const { data: requests, mutate: mutateRequests } = useSWR(
    session ? '/api/v1/payouts/request' : null,
    fetcher
  )
  
  // Fetch transactions/earnings history
  const { data: transactions } = useSWR(
    session ? '/api/v1/dashboard/stats' : null,
    fetcher
  )

  const [showRequestModal, setShowRequestModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'payouts'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const handleRequestPayout = async () => {
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (amountNum > (user?.walletBalance || 0)) {
      toast.error('Amount exceeds wallet balance')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/v1/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum, notes }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create payout request')
      }

      toast.success('Payout request submitted successfully!')
      setShowRequestModal(false)
      setAmount('')
      setNotes('')
      mutateRequests()
      mutateUser()
      setActiveTab('payouts')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create payout request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      case 'PROCESSED':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
      default:
        return null
    }
  }

  const stats = transactions?.stats || {}
  const walletBalance = user?.walletBalance || 0
  const totalEarnings = stats.totalEarnings || 0
  const thisMonthEarnings = stats.thisMonthEarnings || 0
  const pendingPayoutAmount = stats.pendingPayoutAmount || 0

  // Filter payout requests
  const filteredRequests = requests?.filter((request: any) => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    const matchesSearch = !searchQuery || 
      formatCurrency(request.amount).toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  }) || []

  return (
    <div className="space-y-6">
      {/* Header Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Wallet Balance - Primary Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 shadow-lg col-span-1 md:col-span-2 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm md:text-base font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Wallet Balance
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                Available
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-2">
                  {formatCurrency(walletBalance)}
                </div>
                {pendingPayoutAmount > 0 && (
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {formatCurrency(pendingPayoutAmount)} pending payout
                  </p>
                )}
              </div>
              <Button
                onClick={() => setShowRequestModal(true)}
                disabled={walletBalance <= 0}
                size="lg"
                className="shadow-md hover:shadow-lg transition-all"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Request Payout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Total Earnings */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalEarnings)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        {/* This Month Earnings */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(thisMonthEarnings)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), 'MMMM yyyy')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-12 md:h-14">
          <TabsTrigger value="overview" className="text-sm md:text-base">
            <DollarSign className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" className="text-sm md:text-base">
            <TrendingUp className="w-4 h-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="payouts" className="text-sm md:text-base relative">
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Payouts
            {requests && requests.filter((r: any) => r.status === 'PENDING').length > 0 && (
              <Badge className="ml-2 bg-primary text-primary-foreground text-xs px-1.5">
                {requests.filter((r: any) => r.status === 'PENDING').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your wallet and earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={() => setShowRequestModal(true)}
                  disabled={walletBalance <= 0}
                  className="h-16 text-base"
                  variant="outline"
                >
                  <ArrowUpRight className="w-5 h-5 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">Request Payout</div>
                    <div className="text-xs text-muted-foreground">Withdraw funds</div>
                  </div>
                </Button>
                <Button
                  onClick={() => setActiveTab('transactions')}
                  className="h-16 text-base"
                  variant="outline"
                >
                  <TrendingUp className="w-5 h-5 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">View Transactions</div>
                    <div className="text-xs text-muted-foreground">Earnings history</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Earnings Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings Summary</CardTitle>
              <CardDescription>Your earnings breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(walletBalance)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(totalEarnings)}
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-muted-foreground mb-1">Pending</p>
                    <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                      {formatCurrency(pendingPayoutAmount)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {requests && requests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Payout Requests</CardTitle>
                <CardDescription>Your latest payout activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requests.slice(0, 3).map((request: any) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(request.status)}
                        <div>
                          <p className="font-semibold">{formatCurrency(request.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(request.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                  ))}
                  {requests.length > 3 && (
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab('payouts')}
                      className="w-full"
                    >
                      View All ({requests.length})
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>View all your earnings and transactions</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Transaction history coming soon</p>
                <p className="text-xs mt-1">We're working on adding detailed transaction tracking</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Payout Requests</CardTitle>
                  <CardDescription>Manage your payout requests and history</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search payouts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="PROCESSED">Processed</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRequests && filteredRequests.length > 0 ? (
                <div className="space-y-4">
                  {filteredRequests.map((request: any) => (
                    <Card
                      key={request.id}
                      className="border-2 hover:shadow-md transition-all"
                    >
                      <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              {getStatusIcon(request.status)}
                              <StatusBadge status={request.status} />
                              <span className="text-2xl font-bold">
                                {formatCurrency(request.amount)}
                              </span>
                            </div>
                            {request.notes && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {request.notes}
                              </p>
                            )}
                            {request.adminNotes && (
                              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                  <span className="font-semibold">Admin Note:</span> {request.adminNotes}
                                </p>
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Requested {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
                              </span>
                              {request.processedAt && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Processed {format(new Date(request.processedAt), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowUpRight className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium mb-1">No payout requests</p>
                  <p className="text-xs">Start by requesting a payout from your wallet balance</p>
                  {walletBalance > 0 && (
                    <Button
                      onClick={() => setShowRequestModal(true)}
                      className="mt-4"
                      size="sm"
                    >
                      Request Payout
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Payout Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5" />
              Request Payout
            </DialogTitle>
            <DialogDescription>
              Request a payout from your wallet balance. Funds will be processed within 3-5 business days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Available Balance</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(walletBalance)}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="amount" className="text-sm font-semibold">
                Amount *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={walletBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-2 h-11"
              />
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount((walletBalance * 0.25).toFixed(2))}
                  className="text-xs"
                >
                  25%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount((walletBalance * 0.5).toFixed(2))}
                  className="text-xs"
                >
                  50%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount((walletBalance * 0.75).toFixed(2))}
                  className="text-xs"
                >
                  75%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(walletBalance.toFixed(2))}
                  className="text-xs"
                >
                  Max
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="notes" className="text-sm font-semibold">
                Notes <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the admin..."
                rows={3}
                className="mt-2"
              />
            </div>
            {requests && requests.some((r: any) => r.status === 'PENDING') && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  You already have a pending payout request. Please wait for it to be processed before requesting another.
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowRequestModal(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestPayout}
                className="flex-1"
                disabled={
                  isSubmitting || 
                  !amount || 
                  parseFloat(amount) <= 0 ||
                  parseFloat(amount) > walletBalance ||
                  (requests && requests.some((r: any) => r.status === 'PENDING'))
                }
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
