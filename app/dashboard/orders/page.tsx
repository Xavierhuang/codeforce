'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { MessageSquare, X, User, Clock, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BuyerOrdersPage() {
  const { data: session } = useSession()
  const { data: tasks, isLoading, mutate } = useSWR(
    session ? '/api/v1/tasks?myTasks=true' : null,
    fetcher
  )
  const [cancelTaskId, setCancelTaskId] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancelOrder = async () => {
    if (!cancelTaskId) return

    setIsCancelling(true)
    try {
      const response = await fetch(`/api/v1/tasks/${cancelTaskId}/cancel`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        throw new Error('Failed to cancel order')
      }

      toast.success('Order cancelled successfully')
      setCancelTaskId(null)
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel order')
    } finally {
      setIsCancelling(false)
    }
  }

  const filteredTasks = tasks?.filter((task: any) => task.clientId === session?.user?.id) || []

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading orders...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-muted-foreground">
          View all your purchased offers and task progress
        </p>
      </div>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No orders yet.</p>
            <Link href="/tasks">
              <Button className="mt-4">Browse Tasks</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task: any) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold">
                        {task.offer?.message || task.title}
                      </h3>
                      <StatusBadge status={task.status} />
                    </div>

                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {task.description}
                    </p>

                    <div className="flex items-center gap-6 flex-wrap">
                      {/* Worker Info */}
                      {task.worker && (
                        <div className="flex items-center gap-2">
                          {task.worker.avatarUrl ? (
                            <img
                              src={task.worker.avatarUrl}
                              alt={task.worker.name || 'Worker'}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {task.worker.name || 'Anonymous'}
                            </p>
                            {task.worker.rating > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs text-muted-foreground">
                                  {task.worker.rating.toFixed(1)} ({task.worker.ratingCount})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Price */}
                      {task.price && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">
                            {formatCurrency(task.price)}
                          </span>
                        </div>
                      )}

                      {/* Created Date */}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(task.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Link href={`/tasks/${task.id}`}>
                      <Button variant="outline" className="w-full">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Open Chat
                      </Button>
                    </Link>
                    {task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
                      <Button
                        variant="destructive"
                        onClick={() => setCancelTaskId(task.id)}
                        className="w-full"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel Order
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancelTaskId} onOpenChange={() => setCancelTaskId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
              The worker will be notified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTaskId(null)}>
              No, Keep Order
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelOrder}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

