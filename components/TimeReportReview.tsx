'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Clock, Calendar, FileText, CheckCircle, X, AlertCircle, Loader2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface TimeReportReviewProps {
  taskId: string
  weeklyHourLimit?: number | null
}

interface TimeReport {
  id: string
  weekStartDate: string
  weekEndDate: string
  hoursWorked: number
  briefDescription: string
  detailedDescription?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISPUTED'
  submittedAt: string
  approvedAt?: string
  worker: {
    id: string
    name: string
    avatarUrl?: string
  }
  attachments?: Array<{
    id: string
    url: string
    filename: string
    mimeType: string
    size: number
  }>
}

export function TimeReportReview({ taskId, weeklyHourLimit }: TimeReportReviewProps) {
  const [selectedReport, setSelectedReport] = useState<TimeReport | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | 'dispute' | null>(null)
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)

  // Fetch time reports
  const { data: reportsData, mutate } = useSWR(
    `/api/v1/tasks/${taskId}/time-reports`,
    fetcher
  )
  const timeReports: TimeReport[] = reportsData?.timeReports || []
  const pendingReports = timeReports.filter(report => report.status === 'PENDING')

  // Calculate total hours worked
  const totalHoursWorked = timeReports
    .filter(r => r.status === 'APPROVED')
    .reduce((sum, r) => sum + r.hoursWorked, 0)

  const handleAction = async (reportId: string, actionType: 'approve' | 'reject' | 'dispute') => {
    setProcessing(true)
    try {
      let endpoint = ''
      let body: any = {}

      if (actionType === 'approve') {
        endpoint = `/api/v1/time-reports/${reportId}/approve`
      } else if (actionType === 'reject') {
        endpoint = `/api/v1/time-reports/${reportId}/reject`
        if (reason.trim()) {
          body = { reason: reason.trim() }
        }
      } else if (actionType === 'dispute') {
        endpoint = `/api/v1/time-reports/${reportId}/dispute`
        if (!reason.trim() || reason.trim().length < 10) {
          toast.error('Please provide a reason for disputing (minimum 10 characters)')
          setProcessing(false)
          return
        }
        body = { reason: reason.trim() }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${actionType} time report`)
      }

      toast.success(`Time report ${actionType}d successfully`)
      setSelectedReport(null)
      setAction(null)
      setReason('')
      mutate()
    } catch (error: any) {
      toast.error(error.message || `Failed to ${actionType} time report`)
    } finally {
      setProcessing(false)
    }
  }

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    if (minutes === 0) {
      return `${wholeHours}h`
    }
    return `${wholeHours}h ${minutes}m`
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: 'Pending Review', variant: 'secondary' as const, icon: Clock },
      APPROVED: { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
      REJECTED: { label: 'Rejected', variant: 'destructive' as const, icon: X },
      DISPUTED: { label: 'Disputed', variant: 'destructive' as const, icon: AlertCircle },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Time Report Summary</CardTitle>
          <CardDescription>Overview of time reports for this task</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Reports</p>
              <p className="text-2xl font-bold">{timeReports.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingReports.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Hours Approved</p>
              <p className="text-2xl font-bold text-green-600">{formatHours(totalHoursWorked)}</p>
            </div>
          </div>
          {weeklyHourLimit && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Weekly hour limit: {weeklyHourLimit} hours per week
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Pending Reports */}
      {pendingReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Pending Time Reports ({pendingReports.length})
            </CardTitle>
            <CardDescription>Review and approve or reject time reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingReports.map((report) => (
                <Card key={report.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Week of {format(new Date(report.weekStartDate), 'MMM d')} - {format(new Date(report.weekEndDate), 'MMM d, yyyy')}
                        </CardTitle>
                        <CardDescription>
                          Submitted by {report.worker.name} on {format(new Date(report.submittedAt), 'MMM d, yyyy')}
                        </CardDescription>
                      </div>
                      {getStatusBadge(report.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{formatHours(report.hoursWorked)}</span>
                      </div>
                      {weeklyHourLimit && (
                        <Badge variant={report.hoursWorked > weeklyHourLimit ? 'destructive' : 'outline'}>
                          {report.hoursWorked > weeklyHourLimit ? 'Exceeds limit' : `Within limit`}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">Brief Description</Label>
                      <p className="text-sm mt-1">{report.briefDescription}</p>
                    </div>

                    {report.detailedDescription && (
                      <div>
                        <Label className="text-sm font-semibold">Detailed Description</Label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{report.detailedDescription}</p>
                      </div>
                    )}

                    {report.attachments && report.attachments.length > 0 && (
                      <div>
                        <Label className="text-sm font-semibold">Attachments</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {report.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={`/api/v1/files/${attachment.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-accent transition-colors"
                            >
                              <FileText className="h-4 w-4" />
                              <span className="text-sm">{attachment.filename}</span>
                              <span className="text-xs text-muted-foreground">
                                ({formatFileSize(attachment.size)})
                              </span>
                              <Download className="h-3 w-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        onClick={() => {
                          setSelectedReport(report)
                          setAction('approve')
                        }}
                        variant="default"
                        className="flex-1"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedReport(report)
                          setAction('reject')
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedReport(report)
                          setAction('dispute')
                        }}
                        variant="destructive"
                        className="flex-1"
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Dispute
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Reports */}
      {timeReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Time Reports</CardTitle>
            <CardDescription>Complete history of time reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeReports.map((report) => (
                <div
                  key={report.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(new Date(report.weekStartDate), 'MMM d')} - {format(new Date(report.weekEndDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {getStatusBadge(report.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatHours(report.hoursWorked)}
                    </span>
                    <span>
                      Submitted: {format(new Date(report.submittedAt), 'MMM d, yyyy')}
                    </span>
                    {report.approvedAt && (
                      <span>
                        {report.status === 'APPROVED' ? 'Approved' : report.status === 'REJECTED' ? 'Rejected' : 'Disputed'}: {format(new Date(report.approvedAt), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{report.briefDescription}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={!!selectedReport && !!action} onOpenChange={(open) => {
        if (!open) {
          setSelectedReport(null)
          setAction(null)
          setReason('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' && 'Approve Time Report'}
              {action === 'reject' && 'Reject Time Report'}
              {action === 'dispute' && 'Dispute Time Report'}
            </DialogTitle>
            <DialogDescription>
              {action === 'approve' && 'Are you sure you want to approve this time report? Payment will be processed after approval.'}
              {action === 'reject' && 'Please provide a reason for rejecting this time report (optional).'}
              {action === 'dispute' && 'Please provide a detailed reason for disputing this time report (required, minimum 10 characters).'}
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-semibold">Week: {format(new Date(selectedReport.weekStartDate), 'MMM d')} - {format(new Date(selectedReport.weekEndDate), 'MMM d, yyyy')}</p>
                <p className="text-sm">Hours: {formatHours(selectedReport.hoursWorked)}</p>
                <p className="text-sm">{selectedReport.briefDescription}</p>
              </div>
              {(action === 'reject' || action === 'dispute') && (
                <div>
                  <Label htmlFor="reason">
                    Reason {(action === 'dispute' && '*')}
                  </Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={action === 'dispute' ? 'Please explain why you are disputing this time report...' : 'Optional reason for rejection...'}
                    rows={4}
                    maxLength={500}
                  />
                  {action === 'dispute' && reason.length > 0 && reason.length < 10 && (
                    <p className="text-sm text-destructive mt-1">
                      Reason must be at least 10 characters
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReport(null)
                setAction(null)
                setReason('')
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedReport && action && handleAction(selectedReport.id, action)}
              disabled={processing || (action === 'dispute' && (!reason.trim() || reason.trim().length < 10))}
              variant={action === 'reject' || action === 'dispute' ? 'destructive' : 'default'}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {action === 'approve' && <CheckCircle className="mr-2 h-4 w-4" />}
                  {action === 'reject' && <X className="mr-2 h-4 w-4" />}
                  {action === 'dispute' && <AlertCircle className="mr-2 h-4 w-4" />}
                  {action === 'approve' && 'Approve'}
                  {action === 'reject' && 'Reject'}
                  {action === 'dispute' && 'Dispute'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


