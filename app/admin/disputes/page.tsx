'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import toast from 'react-hot-toast'
import { Search, Filter, AlertTriangle, CheckCircle, XCircle, Clock, Eye, MessageSquare, User, Calendar, FileText } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

export default function AdminDisputesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedDispute, setSelectedDispute] = useState<any>(null)
  const [showDisputeDetails, setShowDisputeDetails] = useState(false)
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [resolutionStatus, setResolutionStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED')
  const [resolutionComment, setResolutionComment] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: disputesData, error, mutate } = useSWR(
    status === 'authenticated' ? '/api/v1/disputes/time-reports' : null,
    fetcher
  )

  const disputes = disputesData?.disputes || []

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

  // Filter disputes
  const filteredDisputes = disputes.filter((dispute: any) => {
    const matchesSearch = !searchQuery || 
      dispute.task?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.worker?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.task?.client?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || dispute.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleResolveDispute = async () => {
    if (!selectedDispute || !resolutionComment.trim()) {
      toast.error('Please provide a resolution comment')
      return
    }

    try {
      const response = await fetch(`/api/v1/disputes/time-reports/${selectedDispute.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: resolutionStatus,
          resolutionComment,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to resolve dispute')
      }

      toast.success(`Dispute ${resolutionStatus === 'APPROVED' ? 'approved' : 'rejected'}`)
      setShowResolveDialog(false)
      setSelectedDispute(null)
      setResolutionComment('')
      setResolutionStatus('APPROVED')
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to resolve dispute')
    }
  }

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

  const pendingDisputes = disputes.filter((d: any) => d.status === 'DISPUTED').length
  const resolvedDisputes = disputes.filter((d: any) => d.status === 'APPROVED' || d.status === 'REJECTED').length

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Time Report Disputes</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage and resolve disputes over time reports
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Disputes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disputes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingDisputes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedDisputes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search" className="text-xs md:text-sm">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by task, worker, or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs md:text-sm">Status</Label>
              <Select value={statusFilter || undefined} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="DISPUTED">Disputed</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disputes List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Disputes</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {error ? 'Error loading disputes' : `${filteredDisputes.length} dispute${filteredDisputes.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-2">Error loading disputes: {error.message}</p>
              <Button onClick={() => mutate()}>Retry</Button>
            </div>
          ) : filteredDisputes.length > 0 ? (
            <div className="space-y-3">
              {filteredDisputes.map((dispute: any) => (
                <div
                  key={dispute.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <p className="font-medium text-sm md:text-base">{dispute.task?.title || 'Unknown Task'}</p>
                      <Badge
                        variant={
                          dispute.status === 'APPROVED'
                            ? 'default'
                            : dispute.status === 'REJECTED'
                            ? 'destructive'
                            : 'destructive'
                        }
                        className="text-xs"
                      >
                        {dispute.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs md:text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium">Worker:</span> {dispute.worker?.name || 'Unknown'}
                      </p>
                      <p>
                        <span className="font-medium">Client:</span> {dispute.task?.client?.name || 'Unknown'}
                      </p>
                      <p>
                        <span className="font-medium">Hours Reported:</span> {dispute.hoursWorked} hours
                      </p>
                      <p>
                        <span className="font-medium">Week:</span> {format(new Date(dispute.weekStartDate), 'MMM d')} - {format(new Date(dispute.weekEndDate), 'MMM d, yyyy')}
                      </p>
                      {dispute.briefDescription && (
                        <p className="mt-2">
                          <span className="font-medium">Description:</span> {dispute.briefDescription}
                        </p>
                      )}
                      <p className="flex items-center gap-1 mt-2">
                        <Calendar className="w-3 h-3" />
                        Disputed {format(new Date(dispute.updatedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedDispute(dispute)
                        setShowDisputeDetails(true)
                      }}
                      className="text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                    {dispute.status === 'DISPUTED' && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setSelectedDispute(dispute)
                          setShowResolveDialog(true)
                        }}
                        className="text-xs"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Resolve
                      </Button>
                    )}
                    {dispute.task?.id && (
                      <Link href={`/admin/tasks?taskId=${dispute.task.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs">
                          View Task
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No disputes found</p>
          )}
        </CardContent>
      </Card>

      {/* Dispute Details Dialog */}
      <Dialog open={showDisputeDetails} onOpenChange={setShowDisputeDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
            <DialogDescription>
              Complete information about the disputed time report
            </DialogDescription>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Task</Label>
                  <p className="text-sm text-muted-foreground">{selectedDispute.task?.title || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div>
                    <Badge
                      variant={
                        selectedDispute.status === 'APPROVED'
                          ? 'default'
                          : selectedDispute.status === 'REJECTED'
                          ? 'destructive'
                          : 'destructive'
                      }
                    >
                      {selectedDispute.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Worker</Label>
                  <p className="text-sm text-muted-foreground">{selectedDispute.worker?.name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Client</Label>
                  <p className="text-sm text-muted-foreground">{selectedDispute.task?.client?.name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Hours Worked</Label>
                  <p className="text-sm text-muted-foreground">{selectedDispute.hoursWorked} hours</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Week Period</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedDispute.weekStartDate), 'MMM d')} - {format(new Date(selectedDispute.weekEndDate), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {selectedDispute.briefDescription && (
                <div>
                  <Label className="text-sm font-medium">Brief Description</Label>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg mt-1">
                    {selectedDispute.briefDescription}
                  </p>
                </div>
              )}

              {selectedDispute.detailedDescription && (
                <div>
                  <Label className="text-sm font-medium">Detailed Description</Label>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg mt-1 whitespace-pre-wrap">
                    {selectedDispute.detailedDescription}
                  </p>
                </div>
              )}

              {selectedDispute.attachments && selectedDispute.attachments.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Attachments</Label>
                  <div className="mt-2 space-y-2">
                    {selectedDispute.attachments.map((attachment: any, idx: number) => (
                      <a
                        key={idx}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {attachment.filename || `Attachment ${idx + 1}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex gap-2">
                  {selectedDispute.status === 'DISPUTED' && (
                    <Button
                      onClick={() => {
                        setShowDisputeDetails(false)
                        setShowResolveDialog(true)
                      }}
                    >
                      Resolve Dispute
                    </Button>
                  )}
                  {selectedDispute.task?.id && (
                    <Link href={`/admin/tasks?taskId=${selectedDispute.task.id}`}>
                      <Button variant="outline">View Task</Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dispute Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Approve or reject the disputed time report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="resolution-status">Resolution</Label>
              <Select value={resolutionStatus} onValueChange={(value: 'APPROVED' | 'REJECTED') => setResolutionStatus(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">Approve Time Report</SelectItem>
                  <SelectItem value="REJECTED">Reject Time Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="resolution-comment">Resolution Comment *</Label>
              <Textarea
                id="resolution-comment"
                value={resolutionComment}
                onChange={(e) => setResolutionComment(e.target.value)}
                placeholder="Explain your decision..."
                className="mt-1 min-h-[100px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowResolveDialog(false)
              setResolutionComment('')
              setResolutionStatus('APPROVED')
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleResolveDispute}
              disabled={!resolutionComment.trim()}
              variant={resolutionStatus === 'APPROVED' ? 'default' : 'destructive'}
            >
              {resolutionStatus === 'APPROVED' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

