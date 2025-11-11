'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { getPusherClient } from '@/lib/pusher-client'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function NotificationsPage() {
  const { data: session } = useSession()
  const { data: notifications, isLoading, mutate } = useSWR(
    session ? '/api/v1/notifications' : null,
    fetcher
  )
  const pusherRef = useRef<any>(null)

  // Set up Pusher for real-time notifications
  useEffect(() => {
    if (!session?.user?.id) return

    const pusher = getPusherClient()
    if (!pusher) return

    pusherRef.current = pusher
    // Subscribe to private user channel for notifications
    const channel = pusher.subscribe(`private-user-${session.user.id}`)

    channel.bind('notification', () => {
      mutate() // Refresh notifications when new one arrives
    })

    return () => {
      channel.unbind_all()
      channel.unsubscribe()
    }
  }, [session?.user?.id, mutate])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}/read`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        throw new Error('Failed to mark as read')
      }

      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications?.filter((n: any) => !n.readStatus) || []
      
      await Promise.all(
        unreadNotifications.map((n: any) =>
          fetch(`/api/v1/notifications/${n.id}/read`, { method: 'PATCH' })
        )
      )

      mutate()
      toast.success('All notifications marked as read')
    } catch (error: any) {
      toast.error('Failed to mark all as read')
    }
  }

  const unreadCount = notifications?.filter((n: any) => !n.readStatus).length || 0

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-12">Loading notifications...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Stay updated on your tasks and messages
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead} size="sm" className="w-full sm:w-auto">
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {!notifications || notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification: any) => (
            <Card
              key={notification.id}
              className={`transition-colors cursor-pointer hover:shadow-md ${
                !notification.readStatus ? 'border-primary/50 bg-primary/5' : ''
              }`}
              onClick={() => {
                if (!notification.readStatus) {
                  handleMarkAsRead(notification.id)
                }
                if (notification.task) {
                  window.location.href = `/tasks/${notification.task.id}`
                }
              }}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      {!notification.readStatus && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                      <p className={`text-sm break-words ${!notification.readStatus ? 'font-medium' : ''}`}>
                        {notification.message}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                    {notification.task && (
                      <Link
                        href={`/tasks/${notification.task.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                      >
                        View Task →
                      </Link>
                    )}
                  </div>
                  {!notification.readStatus && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkAsRead(notification.id)
                      }}
                    >
                      <Check className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

