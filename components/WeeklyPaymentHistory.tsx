'use client'

import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, Calendar, DollarSign, CheckCircle, X, AlertCircle, Loader2, Download, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface WeeklyPaymentHistoryProps {
  taskId: string
}

interface WeeklyPayment {
  id: string
  weekStartDate: string
  weekEndDate: string
  hoursWorked: number
  hourlyRate: number
  baseAmount: number
  platformFee: number
  stripeFee: number
  totalAmount: number
  workerPayout: number
  paymentIntentId?: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  processedAt?: string
  timeReport: {
    id: string
    briefDescription: string
    status: string
  }
  transaction?: {
    id: string
    status: string
  }
}

export function WeeklyPaymentHistory({ taskId }: WeeklyPaymentHistoryProps) {
  const { data: paymentsData, isLoading, error } = useSWR(
    `/api/v1/tasks/${taskId}/weekly-payments`,
    fetcher
  )

  const payments: WeeklyPayment[] = paymentsData?.payments || []

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    if (minutes === 0) {
      return `${wholeHours}h`
    }
    return `${wholeHours}h ${minutes}m`
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
      PROCESSING: { label: 'Processing', variant: 'default' as const, icon: Loader2 },
      COMPLETED: { label: 'Completed', variant: 'default' as const, icon: CheckCircle },
      FAILED: { label: 'Failed', variant: 'destructive' as const, icon: X },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    )
  }

  // Calculate totals
  const totalHours = payments.reduce((sum, p) => sum + p.hoursWorked, 0)
  const totalPaid = payments
    .filter(p => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + p.workerPayout, 0)
  const totalPending = payments
    .filter(p => p.status === 'PENDING' || p.status === 'PROCESSING')
    .reduce((sum, p) => sum + p.workerPayout, 0)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load payment history. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
          <CardDescription>Overview of weekly payments for this task</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Hours</p>
              <p className="text-2xl font-bold">{formatHours(totalHours)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No weekly payments yet</p>
            <p className="text-sm">Payments will appear here after time reports are approved</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>All weekly payments for this task</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        Week of {format(new Date(payment.weekStartDate), 'MMM d')} - {format(new Date(payment.weekEndDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Hours</p>
                      <p className="font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatHours(payment.hoursWorked)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rate</p>
                      <p className="font-semibold">{formatCurrency(payment.hourlyRate)}/h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Base Amount</p>
                      <p className="font-semibold">{formatCurrency(payment.baseAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payout</p>
                      <p className="font-semibold text-green-600 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(payment.workerPayout)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          Time Report: {payment.timeReport.briefDescription.substring(0, 50)}
                          {payment.timeReport.briefDescription.length > 50 ? '...' : ''}
                        </p>
                        {payment.processedAt && (
                          <p className="text-muted-foreground">
                            Processed: {format(new Date(payment.processedAt), 'MMM d, yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                      {payment.status === 'COMPLETED' && payment.transaction && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Transaction: {payment.transaction.id.substring(0, 8)}...
                        </Badge>
                      )}
                    </div>
                  </div>

                  {payment.status === 'COMPLETED' && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Badge variant="outline" className="text-xs">
                        Platform Fee: {formatCurrency(payment.platformFee)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Stripe Fee: {formatCurrency(payment.stripeFee)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Total Charged: {formatCurrency(payment.totalAmount)}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


