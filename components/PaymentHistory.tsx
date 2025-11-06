'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface PaymentHistoryProps {
  limit?: number
}

export function PaymentHistory({ limit = 50 }: PaymentHistoryProps) {
  const [offset, setOffset] = useState(0)
  const { data, error, isLoading, mutate } = useSWR(
    `/api/v1/payments/history?limit=${limit}&offset=${offset}`,
    fetcher
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading payment history...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Error loading payment history
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.payments || data.payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No payment history found
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      COMPLETED: { variant: 'default', label: 'Completed' },
      ASSIGNED: { variant: 'secondary', label: 'Assigned' },
      IN_PROGRESS: { variant: 'secondary', label: 'In Progress' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
      DISPUTED: { variant: 'destructive', label: 'Disputed' },
    }

    const statusInfo = statusMap[status] || { variant: 'outline' as const, label: status }
    return (
      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
    )
  }

  const getRefundBadge = (refundStatus: string | null) => {
    if (!refundStatus || refundStatus === 'NONE') return null

    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      REQUESTED: { variant: 'secondary', label: 'Refund Requested' },
      APPROVED: { variant: 'default', label: 'Refund Approved' },
      PROCESSED: { variant: 'default', label: 'Refunded' },
      REJECTED: { variant: 'destructive', label: 'Refund Rejected' },
    }

    const statusInfo = statusMap[refundStatus] || { variant: 'outline' as const, label: refundStatus }
    return (
      <Badge variant={statusInfo.variant} className="ml-2">
        {statusInfo.label}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.payments.map((payment: any) => (
            <div
              key={payment.taskId}
              className="border rounded-lg p-4 space-y-2"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold">{payment.taskTitle}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(payment.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {formatCurrency(payment.amount)}
                  </p>
                  {payment.refundAmount && (
                    <p className="text-sm text-muted-foreground">
                      Refunded: {formatCurrency(payment.refundAmount)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(payment.status)}
                {getRefundBadge(payment.refundStatus)}
              </div>

              {payment.paymentIntent && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    Payment ID: {payment.paymentIntent.id}
                  </p>
                  <p>
                    Status: {payment.paymentIntent.status}
                  </p>
                </div>
              )}

              {payment.charge && (
                <div className="text-xs text-muted-foreground">
                  <p>
                    Charge ID: {payment.charge.id} | Status: {payment.charge.status}
                  </p>
                  {payment.charge.refunded && (
                    <p className="text-destructive">
                      Refunded: {formatCurrency(payment.charge.amountRefunded)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {data.pagination && data.pagination.hasMore && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setOffset(offset + limit)}
              className="text-sm text-primary hover:underline"
            >
              Load more
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

