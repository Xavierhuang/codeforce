'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, Calendar, FileText, Upload, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, startOfWeek, endOfWeek, isBefore, differenceInHours, differenceInMinutes } from 'date-fns'
import { TaskAssignmentFileUpload } from './TaskAssignmentFileUpload'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface WeeklyTimeReportProps {
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
  attachments?: Array<{
    id: string
    url: string
    filename: string
    mimeType: string
    size: number
  }>
}

export function WeeklyTimeReport({ taskId, weeklyHourLimit }: WeeklyTimeReportProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => {
    // Get Monday of current week
    const now = new Date()
    const monday = startOfWeek(now, { weekStartsOn: 1 })
    return monday
  })
  const [hoursWorked, setHoursWorked] = useState<string>('')
  const [briefDescription, setBriefDescription] = useState('')
  const [detailedDescription, setDetailedDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([])

  // Calculate week end (Sunday 23:59:59 UTC)
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  weekEnd.setHours(23, 59, 59, 999)

  // Check if deadline has passed
  const now = new Date()
  const deadlinePassed = now > weekEnd
  const canSubmit = !deadlinePassed && hoursWorked && parseFloat(hoursWorked) > 0 && briefDescription.length >= 10

  // Calculate time until deadline
  const [timeUntilDeadline, setTimeUntilDeadline] = useState<string>('')
  
  useEffect(() => {
    const updateCountdown = () => {
      const diffMs = weekEnd.getTime() - now.getTime()
      if (diffMs <= 0) {
        setTimeUntilDeadline('Deadline passed')
        return
      }
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      
      if (hours > 24) {
        const days = Math.floor(hours / 24)
        setTimeUntilDeadline(`${days} day${days !== 1 ? 's' : ''} remaining`)
      } else {
        setTimeUntilDeadline(`${hours}h ${minutes}m remaining`)
      }
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [weekEnd, now])

  // Fetch existing time reports
  const { data: reportsData, mutate } = useSWR(
    `/api/v1/tasks/${taskId}/time-reports`,
    fetcher
  )
  const timeReports: TimeReport[] = reportsData?.timeReports || []

  // Check if report already exists for this week
  const existingReport = timeReports.find(
    report => new Date(report.weekStartDate).getTime() === weekStart.getTime()
  )

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error('Please fill in all required fields')
      return
    }

    const hours = parseFloat(hoursWorked)
    if (hours <= 0) {
      toast.error('Hours worked must be greater than 0')
      return
    }

    if (weeklyHourLimit && hours > weeklyHourLimit) {
      toast.error(`Hours worked (${hours}) exceeds weekly limit (${weeklyHourLimit} hours)`)
      return
    }

    if (briefDescription.length < 10) {
      toast.error('Brief description must be at least 10 characters')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}/time-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekStartDate: weekStart.toISOString(),
          hoursWorked: hours,
          briefDescription,
          detailedDescription: detailedDescription || undefined,
          attachmentIds: selectedAttachmentIds.length > 0 ? selectedAttachmentIds : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit time report')
      }

      const data = await response.json()
      toast.success('Time report submitted successfully')
      
      // Reset form
      setHoursWorked('')
      setBriefDescription('')
      setDetailedDescription('')
      setSelectedAttachmentIds([])
      
      // Refresh reports
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit time report')
    } finally {
      setSubmitting(false)
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
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
      {/* Current Week Submission Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Time Report
              </CardTitle>
              <CardDescription>
                Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </CardDescription>
            </div>
            {!deadlinePassed && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeUntilDeadline}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {deadlinePassed && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The deadline for this week has passed. Time reports must be submitted by Sunday 23:59 UTC.
              </AlertDescription>
            </Alert>
          )}

          {existingReport ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    Time report already submitted for this week: {formatHours(existingReport.hoursWorked)} - {getStatusBadge(existingReport.status)}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {weeklyHourLimit && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Weekly hour limit: {weeklyHourLimit} hours
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="hours">Hours Worked *</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.25"
                    min="0"
                    max={weeklyHourLimit || 168}
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value)}
                    placeholder="e.g., 8.5 (for 8 hours 30 minutes)"
                    disabled={deadlinePassed || submitting}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter hours worked this week (can include decimals, e.g., 2.5 = 2h 30m)
                  </p>
                  {weeklyHourLimit && hoursWorked && parseFloat(hoursWorked) > weeklyHourLimit && (
                    <p className="text-sm text-destructive mt-1">
                      Exceeds weekly limit of {weeklyHourLimit} hours
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="briefDescription">Brief Description *</Label>
                  <Textarea
                    id="briefDescription"
                    value={briefDescription}
                    onChange={(e) => setBriefDescription(e.target.value)}
                    placeholder="Brief summary of work completed this week..."
                    rows={3}
                    maxLength={500}
                    disabled={deadlinePassed || submitting}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {briefDescription.length}/500 characters (minimum 10)
                  </p>
                </div>

                <div>
                  <Label htmlFor="detailedDescription">Detailed Description (Optional)</Label>
                  <Textarea
                    id="detailedDescription"
                    value={detailedDescription}
                    onChange={(e) => setDetailedDescription(e.target.value)}
                    placeholder="Detailed description of work completed..."
                    rows={5}
                    maxLength={2000}
                    disabled={deadlinePassed || submitting}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {detailedDescription.length}/2000 characters
                  </p>
                </div>

                <div>
                  <Label>Attachments (Optional)</Label>
                  <TaskAssignmentFileUpload
                    taskId={taskId}
                    maxFiles={5}
                    disabled={deadlinePassed || submitting}
                    onFilesUploaded={(files) => {
                      setSelectedAttachmentIds(files.map(f => f.id))
                    }}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting || deadlinePassed}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Submit Time Report
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Previous Reports */}
      {timeReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Time Reports</CardTitle>
            <CardDescription>View your submitted time reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                        Approved: {format(new Date(report.approvedAt), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{report.briefDescription}</p>
                  {report.detailedDescription && (
                    <details className="text-sm text-muted-foreground">
                      <summary className="cursor-pointer">View detailed description</summary>
                      <p className="mt-2">{report.detailedDescription}</p>
                    </details>
                  )}
                  {report.attachments && report.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {report.attachments.map((attachment) => (
                        <Badge key={attachment.id} variant="outline" className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {attachment.filename}
                        </Badge>
                      ))}
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


