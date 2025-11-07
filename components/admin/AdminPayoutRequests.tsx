'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CheckCircle, XCircle, DollarSign, Clock, User } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function AdminPayoutRequests() {
  const { data: requests, mutate } = useSWR('/api/v1/payouts/request', fetcher)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/v1/payouts/request/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve payout request')
      }

      toast.success('Payout request approved!')
      setShowApproveModal(false)
      setSelectedRequest(null)
      setAdminNotes('')
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve payout request')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/v1/payouts/request/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject payout request')
      }

      toast.success('Payout request rejected')
      setShowRejectModal(false)
      setSelectedRequest(null)
      setAdminNotes('')
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject payout request')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleProcess = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/v1/payouts/request/${selectedRequest.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process payout')
      }

      toast.success('Payout processed successfully!')
      setShowProcessModal(false)
      setSelectedRequest(null)
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to process payout')
    } finally {
      setIsProcessing(false)
    }
  }

  const pendingRequests = requests?.filter((r: any) => r.status === 'PENDING') || []
  const approvedRequests = requests?.filter((r: any) => r.status === 'APPROVED') || []
  const allRequests = requests || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
          <CardDescription>Review and process worker payout requests</CardDescription>
        </CardHeader>
        <CardContent>
          {allRequests.length > 0 ? (
            <div className="space-y-4">
              {allRequests.map((request: any) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusBadge status={request.status} />
                        <span className="text-xl font-bold">
                          {formatCurrency(request.amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <User className="w-4 h-4" />
                        <span>{request.worker.name || request.worker.email}</span>
                        <span>•</span>
                        <span>Balance: {formatCurrency(request.worker.walletBalance)}</span>
                      </div>
                      {request.notes && (
                        <p className="text-sm text-muted-foreground mb-1">
                          <strong>Worker notes:</strong> {request.notes}
                        </p>
                      )}
                      {request.adminNotes && (
                        <p className="text-sm text-muted-foreground italic">
                          <strong>Admin notes:</strong> {request.adminNotes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Requested {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
                        {request.processedAt &&
                          ` • Processed ${format(new Date(request.processedAt), 'MMM d, yyyy')}`}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {request.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request)
                              setShowApproveModal(true)
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedRequest(request)
                              setShowRejectModal(true)
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                      {request.status === 'APPROVED' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request)
                            setShowProcessModal(true)
                          }}
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Process Payment
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No payout requests</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payout Request</DialogTitle>
            <DialogDescription>
              Approve payout of {selectedRequest && formatCurrency(selectedRequest.amount)} to{' '}
              {selectedRequest?.worker?.name || selectedRequest?.worker?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Admin Notes (Optional)</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this approval..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowApproveModal(false)
                  setAdminNotes('')
                }}
                className="flex-1"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                className="flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? 'Approving...' : 'Approve'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payout Request</DialogTitle>
            <DialogDescription>
              Reject payout request of {selectedRequest && formatCurrency(selectedRequest.amount)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for Rejection</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                rows={3}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false)
                  setAdminNotes('')
                }}
                className="flex-1"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                className="flex-1"
                disabled={isProcessing || !adminNotes.trim()}
              >
                {isProcessing ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Process Modal */}
      <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout</DialogTitle>
            <DialogDescription>
              Process payment of {selectedRequest && formatCurrency(selectedRequest.amount)} to{' '}
              {selectedRequest?.worker?.name || selectedRequest?.worker?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm">
                <strong>Amount:</strong> {selectedRequest && formatCurrency(selectedRequest.amount)}
              </p>
              <p className="text-sm mt-1">
                <strong>Worker Balance:</strong>{' '}
                {selectedRequest && formatCurrency(selectedRequest.worker.walletBalance)}
              </p>
              {selectedRequest?.worker.stripeAccountId ? (
                <p className="text-sm mt-1 text-green-600">
                  ✓ Stripe account connected - Payment will be transferred
                </p>
              ) : (
                <p className="text-sm mt-1 text-yellow-600">
                  ⚠ No Stripe account - Manual payment required
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowProcessModal(false)}
                className="flex-1"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcess}
                className="flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Process Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


