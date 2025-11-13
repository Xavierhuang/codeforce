'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ReviewForm } from './ReviewForm'
import { Clock, Calendar, CheckCircle, AlertCircle, Star } from 'lucide-react'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface MidProjectReviewProps {
  taskId: string
  userId: string
  targetUserId: string
  targetUserName?: string
}

interface EligibilityData {
  eligible: boolean
  weeksWorked: number
  totalHoursWorked: number
  requiredWeeks: number
  requiredHours: number
  approvedReports: number
  existingMidProjectReview?: {
    id: string
    rating: number
    comment?: string
    createdAt: string
  }
}

export function MidProjectReview({ taskId, userId, targetUserId, targetUserName = 'the worker' }: MidProjectReviewProps) {
  const [showReviewForm, setShowReviewForm] = useState(false)

  // Fetch eligibility data
  const { data: eligibilityData, mutate } = useSWR<{ eligibility: EligibilityData }>(
    `/api/v1/tasks/${taskId}/mid-project-review-eligibility?userId=${userId}&targetUserId=${targetUserId}`,
    fetcher
  )

  const eligibility = eligibilityData?.eligibility

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    if (minutes === 0) {
      return `${wholeHours}h`
    }
    return `${wholeHours}h ${minutes}m`
  }

  if (!eligibility) {
    return null
  }

  // If review already exists, show it
  if (eligibility.existingMidProjectReview) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Mid-Project Review Submitted
          </CardTitle>
          <CardDescription>
            You've already submitted a mid-project review for this task
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    eligibility.existingMidProjectReview && i < eligibility.existingMidProjectReview.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              Submitted {format(new Date(eligibility.existingMidProjectReview.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
          {eligibility.existingMidProjectReview.comment && (
            <p className="text-sm">{eligibility.existingMidProjectReview.comment}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  // If not eligible, show progress
  if (!eligibility.eligible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Mid-Project Review Eligibility
          </CardTitle>
          <CardDescription>
            Submit a review after meeting the minimum requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Mid-project reviews require at least {eligibility.requiredWeeks} weeks and {eligibility.requiredHours} hours of approved work.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Weeks Worked</span>
                <Badge variant={eligibility.weeksWorked >= eligibility.requiredWeeks ? 'default' : 'secondary'}>
                  {eligibility.weeksWorked} / {eligibility.requiredWeeks}
                </Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    eligibility.weeksWorked >= eligibility.requiredWeeks
                      ? 'bg-green-600'
                      : 'bg-yellow-600'
                  }`}
                  style={{
                    width: `${Math.min((eligibility.weeksWorked / eligibility.requiredWeeks) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hours Worked</span>
                <Badge variant={eligibility.totalHoursWorked >= eligibility.requiredHours ? 'default' : 'secondary'}>
                  {formatHours(eligibility.totalHoursWorked)} / {eligibility.requiredHours}h
                </Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    eligibility.totalHoursWorked >= eligibility.requiredHours
                      ? 'bg-green-600'
                      : 'bg-yellow-600'
                  }`}
                  style={{
                    width: `${Math.min((eligibility.totalHoursWorked / eligibility.requiredHours) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              <Calendar className="h-3 w-3 inline mr-1" />
              {eligibility.approvedReports} approved time report{eligibility.approvedReports !== 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If eligible, show review form
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-blue-600" />
          Mid-Project Review Available
        </CardTitle>
        <CardDescription>
          You're eligible to submit a mid-project review
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            You've worked {eligibility.weeksWorked} weeks and {formatHours(eligibility.totalHoursWorked)} hours on this project.
            You can now submit a mid-project review.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Weeks:</span>
            <span className="font-semibold">{eligibility.weeksWorked}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Hours:</span>
            <span className="font-semibold">{formatHours(eligibility.totalHoursWorked)}</span>
          </div>
        </div>

        {showReviewForm ? (
          <ReviewForm
            targetUserId={targetUserId}
            targetUserName={targetUserName}
            taskId={taskId}
            onSuccess={() => {
              setShowReviewForm(false)
              mutate()
            }}
            onCancel={() => setShowReviewForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowReviewForm(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Submit Mid-Project Review
          </button>
        )}
      </CardContent>
    </Card>
  )
}

