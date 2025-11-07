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
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Wallet, DollarSign, ArrowUpRight, Clock, CheckCircle, XCircle } from 'lucide-react'
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

  const [showRequestModal, setShowRequestModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

      toast.success('Payout request submitted!')
      setShowRequestModal(false)
      setAmount('')
      setNotes('')
      mutateRequests()
      mutateUser()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create payout request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-blue-600" />
      case 'PROCESSED':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Wallet Balance
              </CardTitle>
              <CardDescription>Your available earnings</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">
                {formatCurrency(user?.walletBalance || 0)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Available for payout</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowRequestModal(true)}
            disabled={(user?.walletBalance || 0) <= 0}
            className="w-full"
            size="lg"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Request Payout
          </Button>
        </CardContent>
      </Card>

      {/* Payout Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
          <CardDescription>Your payout request history</CardDescription>
        </CardHeader>
        <CardContent>
          {requests && requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((request: any) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(request.status)}
                      <StatusBadge status={request.status} />
                      <span className="text-lg font-semibold">
                        {formatCurrency(request.amount)}
                      </span>
                    </div>
                    {request.notes && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {request.notes}
                      </p>
                    )}
                    {request.adminNotes && (
                      <p className="text-sm text-muted-foreground italic">
                        Admin: {request.adminNotes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Requested {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
                      {request.processedAt &&
                        ` • Processed ${format(new Date(request.processedAt), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No payout requests yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Payout Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Request a payout from your wallet balance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={user?.walletBalance || 0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: {formatCurrency(user?.walletBalance || 0)}
              </p>
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the admin..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
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
                disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

