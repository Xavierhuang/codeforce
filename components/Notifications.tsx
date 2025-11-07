'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Bell, Check, X } from 'lucide-react'
import { getPusherClient } from '@/lib/pusher-client'
import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function Notifications() {
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
    const channel = pusher.subscribe(`user-${session.user.id}`)

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

  const unreadCount = notifications?.filter((n: any) => !n.readStatus).length || 0

  if (isLoading) {
    return (
      <div className="text-center py-4 text-muted-foreground">Loading notifications...</div>
    )
  }

  if (!notifications || notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No notifications yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium">
            {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
          </p>
        </div>
      )}

      {notifications.map((notification: any) => (
        <Card
          key={notification.id}
          className={`transition-colors ${
            !notification.readStatus ? 'border-primary/50 bg-primary/5' : ''
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {!notification.readStatus && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                  <p className="text-sm font-medium">{notification.message}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                </p>
                {notification.task && (
                  <Link href={`/tasks/${notification.task.id}`}>
                    <Button variant="link" className="h-auto p-0 mt-2 text-xs">
                      View Task →
                    </Button>
                  </Link>
                )}
              </div>
              {!notification.readStatus && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <Check className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

