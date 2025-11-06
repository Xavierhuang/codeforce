'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OfferList } from './OfferList'
import { Chat } from './Chat'
import { ReviewForm } from './ReviewForm'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface TaskDetailProps {
  task: any
}

export function TaskDetail({ task: initialTask }: TaskDetailProps) {
  const { data: session } = useSession()
  const { data: task, mutate } = useSWR(
    `/api/v1/tasks/${initialTask.id}`,
    fetcher,
    { fallbackData: initialTask }
  )

  const [activeTab, setActiveTab] = useState<'details' | 'offers' | 'messages'>('details')
  const [showReviewForm, setShowReviewForm] = useState(false)

  // Check if user has already reviewed
  const { data: existingReview } = useSWR(
    task?.status === 'COMPLETED' && session?.user?.id
      ? `/api/v1/reviews?taskId=${task.id}&reviewerId=${session.user.id}`
      : null,
    fetcher
  )

  const handleComplete = async () => {
    try {
      const response = await fetch(`/api/v1/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Failed to complete task')
      }

      toast.success('Task marked as complete!')
      mutate()
      // Show review form after completion
      if (isClient) {
        setShowReviewForm(true)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete task')
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this task? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/v1/tasks/${task.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by user' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel task')
      }

      const data = await response.json()
      toast.success(
        data.refundProcessed
          ? 'Task cancelled and refund processed!'
          : 'Task cancelled successfully!'
      )
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel task')
    }
  }

  const isClient = session?.user?.id === task?.clientId
  const isWorker = session?.user?.id === task?.workerId
  const canComplete = isWorker && (task?.status === 'ASSIGNED' || task?.status === 'IN_PROGRESS')
  const canCancel = 
    (isClient || isWorker) && 
    task?.status !== 'COMPLETED' && 
    task?.status !== 'CANCELLED' &&
    (task?.status === 'ASSIGNED' || task?.status === 'IN_PROGRESS' || task?.status === 'OFFERED')
  
  const canReview = 
    task?.status === 'COMPLETED' && 
    (isClient || isWorker) && 
    !existingReview &&
    !showReviewForm
  
  const targetUserId = isClient ? task?.workerId : task?.clientId
  const targetUserName = isClient ? task?.worker?.name : task?.client?.name

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl">{task?.title}</CardTitle>
              <CardDescription className="mt-2">
                Posted by {task?.client?.name || 'Anonymous'}
                {task?.createdAt && ` • ${format(new Date(task.createdAt), 'MMM d, yyyy')}`}
              </CardDescription>
            </div>
            <div className="px-3 py-1 rounded-full bg-muted text-sm font-medium">
              {task?.status}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{task?.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                <p>{task?.category}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Type</h4>
                <p>{task?.type}</p>
              </div>
              {task?.price && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Budget</h4>
                  <p>{formatCurrency(task.price)}</p>
                </div>
              )}
              {task?.scheduledAt && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Scheduled</h4>
                  <p>{format(new Date(task.scheduledAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
              )}
            </div>

            {task?.address && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
                <p>{task.address}</p>
              </div>
            )}

            {task?.worker && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Assigned Developer</h4>
                <div className="flex items-center gap-3">
                  {task.worker.avatarUrl && (
                    <img
                      src={task.worker.avatarUrl}
                      alt={task.worker.name || 'Developer'}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">{task.worker.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Rating: {task.worker.rating?.toFixed(1)} ({task.worker.ratingCount} reviews)
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {canComplete && (
                <Button onClick={handleComplete} className="flex-1">
                  Mark as Complete
                </Button>
              )}
              {canCancel && (
                <Button
                  onClick={handleCancel}
                  variant="destructive"
                  className={canComplete ? 'flex-1' : 'w-full'}
                >
                  Cancel Task
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'details'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
        >
          Details
        </button>
        {(isClient || isWorker) && (
          <>
            <button
              onClick={() => setActiveTab('offers')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'offers'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              Offers ({task?._count?.offers || 0})
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'messages'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              Messages ({task?._count?.messages || 0})
            </button>
          </>
        )}
      </div>

      {activeTab === 'offers' && (isClient || isWorker) && (
        <OfferList taskId={task?.id} isClient={isClient} />
      )}

      {activeTab === 'messages' && (isClient || isWorker) && (
        <Chat taskId={task?.id} />
      )}

      {/* Review Form */}
      {showReviewForm && targetUserId && (
        <ReviewForm
          taskId={task.id}
          targetUserId={targetUserId}
          targetUserName={targetUserName || 'User'}
          onSuccess={() => {
            setShowReviewForm(false)
            mutate()
          }}
          onCancel={() => setShowReviewForm(false)}
        />
      )}

      {task?.status === 'COMPLETED' && canReview && !showReviewForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Share your experience with {targetUserName || 'the other party'}
              </p>
              <Button onClick={() => setShowReviewForm(true)}>
                Leave a Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

