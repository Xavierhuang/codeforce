'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { OfferList } from '@/components/OfferList'
import { Chat } from '@/components/Chat'
import { ReviewForm } from '@/components/ReviewForm'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ActionButtonGroup, ActionButton } from '@/components/shared/ActionButtonGroup'
import { PaymentModal } from '@/components/payments/PaymentModal'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Play, CheckCircle, X, MessageSquare, DollarSign, FileText, MapPin, Clock, User, AlertCircle, CheckCircle2, Star, Tag, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClockInOutButton } from '@/components/ClockInOutButton'
import { BuyerInfoCard } from '@/components/BuyerInfoCard'
import { TaskAssignmentFileUpload } from '@/components/TaskAssignmentFileUpload'

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
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState<{
    clientSecret: string
    fees: any
  } | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // Fetch offers to check for pending ones
  const { data: offers } = useSWR(
    task?.id ? `/api/v1/tasks/${task?.id}/offers` : null,
    fetcher
  )

  // Check if user has already reviewed
  const { data: reviewData } = useSWR(
    task?.status === 'COMPLETED' && session?.user?.id
      ? `/api/v1/reviews?taskId=${task.id}&reviewerId=${session.user.id}`
      : null,
    fetcher
  )
  const existingReview = reviewData?.reviews?.length > 0 ? reviewData.reviews[0] : null

  // Fetch user data to check role
  const { data: user } = useSWR(
    session?.user?.id ? '/api/v1/users/me' : null,
    fetcher
  )

  // Determine user role
  const isClient = session?.user?.id === task?.clientId
  const isWorker = session?.user?.id === task?.workerId

  // Fetch assignment files
  const { data: assignmentFilesData, mutate: mutateFiles } = useSWR(
    task?.id && (isWorker || isClient) ? `/api/v1/tasks/${task.id}/assignment-files` : null,
    fetcher
  )
  const assignmentFiles = assignmentFilesData?.files || []

  const userRole = user?.role || session?.user?.role
  const isWorkerRole = userRole === 'WORKER'
  const isClientRole = userRole === 'CLIENT'
  
  const canStartWork = isWorker && task?.status === 'ASSIGNED'
  const canComplete = isWorker && task?.status === 'IN_PROGRESS'
  const needsPayment = isClient && task?.status === 'ASSIGNED' && task?.paymentIntentId
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

  // Check for pending offers
  const pendingOffers = Array.isArray(offers) ? offers.filter((o: any) => o.status === 'PENDING') : []
  const hasPendingOffers = pendingOffers.length > 0 && isClient && (task?.status === 'OPEN' || task?.status === 'OFFERED')
  
  // Check if worker has already submitted an offer
  const workerOffer = Array.isArray(offers) ? offers.find((o: any) => o.workerId === session?.user?.id) : null
  const canSubmitOffer = isWorkerRole && !isClient && !isWorker && (task?.status === 'OPEN' || task?.status === 'OFFERED') && !workerOffer

  const handleStartWork = async () => {
    setLoadingAction('start-work')
    try {
      const response = await fetch(`/api/v1/tasks/${task.id}/start-work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start work')
      }

      toast.success('Work started! Task is now in progress.')
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to start work')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleComplete = async () => {
    setLoadingAction('complete')
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
      if (isClient) {
        setShowReviewForm(true)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete task')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this task? This action cannot be undone.')) {
      return
    }

    setLoadingAction('cancel')
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
    } finally {
      setLoadingAction(null)
    }
  }

  const handleAcceptOffer = async (offerId: string) => {
    setLoadingAction(`accept-${offerId}`)
    try {
      const response = await fetch(`/api/v1/tasks/${task.id}/accept-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to accept offer')
      }

      const data = await response.json()
      
      // If payment is required, show payment modal
      if (data.clientSecret) {
        setPaymentData({
          clientSecret: data.clientSecret,
          fees: data.fees,
        })
        setShowPaymentModal(true)
      } else {
        toast.success('Offer accepted! Task assigned to expert.')
        mutate()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept offer')
    } finally {
      setLoadingAction(null)
    }
  }

  // Build action buttons based on context
  const getActionButtons = (): { primary?: ActionButton; secondary?: ActionButton[] } => {
    const buttons: { primary?: ActionButton; secondary?: ActionButton[] } = {}

    // Worker actions (assigned worker)
    if (isWorker) {
      if (canStartWork) {
        buttons.primary = {
          label: 'Start Work',
          onClick: handleStartWork,
          loading: loadingAction === 'start-work',
          icon: <Play className="w-4 h-4" />,
          tooltip: 'Begin working on this task',
        }
      } else if (canComplete) {
        buttons.primary = {
          label: 'Mark as Complete',
          onClick: handleComplete,
          loading: loadingAction === 'complete',
          icon: <CheckCircle className="w-4 h-4" />,
          tooltip: 'Mark this task as completed',
        }
      }
    }

    // Worker role actions (any worker viewing open tasks)
    if (canSubmitOffer) {
      buttons.primary = {
        label: 'Submit Offer',
        onClick: () => setActiveTab('offers'),
        icon: <DollarSign className="w-4 h-4" />,
        tooltip: 'Submit an offer for this task',
      }
    }

    // Client actions
    if (isClient) {
      if (needsPayment) {
        buttons.primary = {
          label: 'Make Payment',
          onClick: () => setShowPaymentModal(true),
          icon: <DollarSign className="w-4 h-4" />,
        }
      } else if (hasPendingOffers) {
        buttons.primary = {
          label: `Review ${pendingOffers.length} ${pendingOffers.length === 1 ? 'Offer' : 'Offers'}`,
          onClick: () => setActiveTab('offers'),
          icon: <DollarSign className="w-4 h-4" />,
        }
      } else if (task?.status === 'OPEN' || task?.status === 'OFFERED') {
        buttons.primary = {
          label: 'View Offers',
          onClick: () => setActiveTab('offers'),
          icon: <DollarSign className="w-4 h-4" />,
        }
      }
    }

    // Show "View Offers" for any logged-in user viewing open tasks (if no other primary action)
    if (!buttons.primary && session && (task?.status === 'OPEN' || task?.status === 'OFFERED')) {
      buttons.primary = {
        label: 'View Offers',
        onClick: () => setActiveTab('offers'),
        icon: <DollarSign className="w-4 h-4" />,
      }
    }

    // Cancel button (secondary for both)
    if (canCancel) {
      buttons.secondary = [
        ...(buttons.secondary || []),
        {
          label: 'Cancel Task',
          onClick: handleCancel,
          variant: 'destructive',
          loading: loadingAction === 'cancel',
          icon: <X className="w-4 h-4" />,
        },
      ]
    }

    return buttons
  }

  const actionButtons = getActionButtons()

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-8">
      {/* Pending Offers Alert - Very Prominent */}
      {hasPendingOffers && (
        <Alert className="border-primary bg-primary/5">
          <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
          <AlertTitle className="text-base md:text-lg font-semibold">
            {pendingOffers.length} {pendingOffers.length === 1 ? 'Offer' : 'Offers'} Waiting for Your Review
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
              <span className="text-sm md:text-base">
                You have {pendingOffers.length} pending {pendingOffers.length === 1 ? 'offer' : 'offers'} for this task. 
                Review them to select the best expert for your project.
              </span>
              <Button 
                onClick={() => setActiveTab('offers')}
                size="sm"
                className="md:size-lg whitespace-nowrap w-full sm:w-auto"
              >
                <DollarSign className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                Review Offers Now
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header Card */}
      <Card className="shadow-lg border-2 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b pb-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <CardTitle className="text-2xl md:text-3xl lg:text-4xl break-words font-bold">{task?.title}</CardTitle>
                <StatusBadge status={task?.status} className="text-sm md:text-base" />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-muted-foreground">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="break-words font-medium">{task?.client?.name || 'Anonymous'}</span>
                </span>
                {task?.createdAt && (
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    Created {format(new Date(task.createdAt), 'MMM d, yyyy')}
                  </span>
                )}
                {task?.completedAt && (
                  <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Completed {format(new Date(task.completedAt), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Primary Action Buttons */}
          {(actionButtons.primary || (actionButtons.secondary && actionButtons.secondary.length > 0)) && (
            <div className="mb-6">
              <ActionButtonGroup
                primary={actionButtons.primary}
                secondary={actionButtons.secondary}
              />
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {task?.price && (
              <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <div className="text-xs md:text-sm text-muted-foreground font-medium">Budget</div>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(task.price)}</div>
                </CardContent>
              </Card>
            )}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div className="text-xs md:text-sm text-muted-foreground font-medium">Category</div>
                </div>
                <div className="font-semibold text-sm md:text-base">{task?.category}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {task?.type === 'IN_PERSON' ? (
                    <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <Wifi className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  )}
                  <div className="text-xs md:text-sm text-muted-foreground font-medium">Type</div>
                </div>
                <div className="font-semibold text-sm md:text-base">
                  {task?.type === 'VIRTUAL' ? 'Virtual' : 'In-Person'}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <div className="text-xs md:text-sm text-muted-foreground font-medium">Offers</div>
                </div>
                <div className="font-semibold text-lg md:text-xl">{task?._count?.offers || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Time Tracking - Clock In/Out Button (for workers) */}
          {isWorker && task && (
            <div className="mb-6">
              <ClockInOutButton task={task} onUpdate={mutate} />
            </div>
          )}

          {/* Assignment Files Upload (for workers when ASSIGNED or IN_PROGRESS) */}
          {isWorker && task && (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') && (
            <Card className="mb-6 border-2">
              <CardHeader>
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Assignment Files
                </CardTitle>
                <CardDescription>
                  Upload files, documents, or resources related to this task
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TaskAssignmentFileUpload
                  taskId={task.id}
                  existingFiles={assignmentFiles}
                  onFilesUploaded={() => {
                    mutateFiles()
                    mutate()
                  }}
                  disabled={task.status === 'COMPLETED' || task.status === 'CANCELLED'}
                />
              </CardContent>
            </Card>
          )}

          {/* Display Assignment Files (for clients and workers) */}
          {assignmentFiles.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Task Files ({assignmentFiles.length})
                </CardTitle>
                <CardDescription>
                  Files uploaded by the worker for this task
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assignmentFiles.map((file: any) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.mimeType} • {Math.round(file.size / 1024)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = file.url
                            link.download = file.filename
                            link.click()
                          }}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Buyer Info Card (for workers) */}
          {isWorker && task?.client && (
            <div className="mb-6">
              <BuyerInfoCard 
                buyer={task.client} 
                task={task} 
                onContact={() => setActiveTab('messages')}
              />
            </div>
          )}

          {/* Task Description */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Description
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{task?.description}</p>
            </div>

            {/* Additional Details */}
            <div className="space-y-2">
              {task?.scheduledAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Scheduled: {format(new Date(task.scheduledAt), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}

              {task?.estimatedDurationMins && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Estimated Duration: {Math.floor(task.estimatedDurationMins / 60)}h {task.estimatedDurationMins % 60}m</span>
                </div>
              )}

              {task?.totalTimeMinutes !== null && task?.totalTimeMinutes !== undefined && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Total Time Tracked: {Math.floor(task.totalTimeMinutes / 60)}h {task.totalTimeMinutes % 60}m</span>
                </div>
              )}

              {task?.address && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>{task.address}</span>
                </div>
              )}

              {task?.subcategory && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>Subcategory: {task.subcategory}</span>
                </div>
              )}

              {task?.minBillableMins && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Minimum Billable: {Math.floor(task.minBillableMins / 60)}h {task.minBillableMins % 60}m</span>
                </div>
              )}

              {task?.travelFee && task.travelFee > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>Travel Fee: {formatCurrency(task.travelFee)}</span>
                </div>
              )}
            </div>

            {/* Assigned Worker */}
            {task?.worker && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4 md:pt-6">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Assigned Expert</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {task.worker.avatarUrl ? (
                      <img
                        src={task.worker.avatarUrl}
                        alt={task.worker.name || 'Expert'}
                        className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-background flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center border-2 border-background flex-shrink-0">
                        <User className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base md:text-lg break-words">{task.worker.name}</p>
                      {task.worker.rating && (
                        <p className="text-xs md:text-sm text-muted-foreground">
                          ⭐ {task.worker.rating.toFixed(1)} ({task.worker.ratingCount} reviews)
                        </p>
                      )}
                      {task.worker.verificationStatus === 'VERIFIED' && (
                        <Badge className="mt-2 bg-green-100 text-green-800 border-green-200 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <Link href={`/profile/${task.worker.slug || task.worker.id}`} className="w-full sm:w-auto">
                      <Button variant="outline" className="w-full sm:w-auto text-sm">View Profile</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3 h-10 md:h-12">
          <TabsTrigger value="details" className="text-xs md:text-base">
            <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Details</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          {(isClient || isWorker) && (
            <>
              <TabsTrigger value="offers" className="text-xs md:text-base relative">
                <DollarSign className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Offers</span>
                {task?._count?.offers > 0 && (
                  <Badge className="ml-1 md:ml-2 bg-primary text-primary-foreground text-[10px] md:text-xs px-1 md:px-1.5">
                    {task._count.offers}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="messages" className="text-xs md:text-base relative">
                <MessageSquare className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Messages</span>
                <span className="sm:hidden">Chat</span>
                {task?._count?.messages > 0 && (
                  <Badge className="ml-1 md:ml-2 bg-primary text-primary-foreground text-[10px] md:text-xs px-1 md:px-1.5">
                    {task._count.messages}
                  </Badge>
                )}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="details" className="mt-4 md:mt-6">
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3 text-base md:text-lg">Full Description</h3>
                  <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap leading-relaxed break-words">{task?.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers" className="mt-4 md:mt-6">
          <OfferList 
            taskId={task?.id} 
            isClient={isClient}
            onAcceptOffer={handleAcceptOffer}
            acceptingOfferId={loadingAction?.startsWith('accept-') ? loadingAction.replace('accept-', '') : null}
          />
        </TabsContent>

        <TabsContent value="messages" className="mt-4 md:mt-6">
          <Chat 
            taskId={task?.id} 
            otherUser={
              isClient && task?.worker
                ? {
                    id: task.worker.id,
                    name: task.worker.name,
                    avatarUrl: task.worker.avatarUrl,
                  }
                : isWorker && task?.client
                ? {
                    id: task.client.id,
                    name: task.client.name,
                    avatarUrl: task.client.avatarUrl,
                  }
                : undefined
            }
          />
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      {showPaymentModal && paymentData && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          clientSecret={paymentData.clientSecret}
          fees={paymentData.fees}
          taskTitle={task?.title}
          onSuccess={() => {
            mutate()
            setShowPaymentModal(false)
            setPaymentData(null)
          }}
        />
      )}

      {/* Review Form */}
      {showReviewForm && targetUserId && (
        <div id="review-form">
          <ReviewForm
            taskId={task.id}
            targetUserId={targetUserId}
            targetUserName={targetUserName || 'User'}
            onSuccess={() => {
              setShowReviewForm(false)
              mutate()
              toast.success('Thank you for your review!')
            }}
            onCancel={() => setShowReviewForm(false)}
          />
        </div>
      )}

      {/* Review Prompt - Show prominently for completed tasks */}
      {task?.status === 'COMPLETED' && canReview && !showReviewForm && (
        <Card id="review" className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {isClient ? 'Rate Your Worker' : 'Rate Your Buyer'}
                </h3>
                <p className="text-muted-foreground">
                  Share your experience with {targetUserName || 'the other party'} to help others make informed decisions
                </p>
              </div>
              <Button 
                onClick={() => {
                  setShowReviewForm(true)
                  // Scroll to review form
                  setTimeout(() => {
                    document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }, 100)
                }} 
                size="lg"
                className="bg-[#94FE0C] hover:bg-[#7FE00A] text-gray-900"
              >
                <Star className="w-5 h-5 mr-2 fill-current" />
                Leave a Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
