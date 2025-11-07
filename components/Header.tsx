'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { User, Bell, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useEffect, useRef } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import { MobileNav } from '@/components/MobileNav'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function Header() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { data: user } = useSWR(
    status === 'authenticated' ? '/api/v1/users/me' : null,
    fetcher
  )

  if (status !== 'authenticated' || !session) {
    return null
  }

  // Fetch recent notifications (last 10) for dropdown
  const { data: allNotifications, mutate: mutateNotifications } = useSWR(
    status === 'authenticated' ? '/api/v1/notifications?limit=10' : null,
    fetcher
  )

  // Fetch unread count for badge
  const { data: unreadNotifications } = useSWR(
    status === 'authenticated' ? '/api/v1/notifications?unreadOnly=true&limit=50' : null,
    fetcher
  )

  const unreadCount = unreadNotifications?.length || 0
  const recentNotifications = allNotifications?.slice(0, 5) || [] // Show top 5 in dropdown
  const isWorker = user?.role === 'WORKER'
  const pusherRef = useRef<any>(null)

  // Set up Pusher for real-time notifications
  useEffect(() => {
    if (!session?.user?.id) return

    const pusher = getPusherClient()
    if (!pusher) return

    pusherRef.current = pusher
    const channel = pusher.subscribe(`user-${session.user.id}`)

    channel.bind('notification', () => {
      mutateNotifications() // Refresh notifications when new one arrives
    })

    return () => {
      channel.unbind_all()
      channel.unsubscribe()
    }
  }, [session?.user?.id, mutateNotifications])

  const handleMarkAsRead = async (notificationId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }

    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}/read`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        throw new Error('Failed to mark as read')
      }

      mutateNotifications()
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark as read')
    }
  }

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    try {
      const unread = allNotifications?.filter((n: any) => !n.readStatus) || []
      
      await Promise.all(
        unread.map((n: any) =>
          fetch(`/api/v1/notifications/${n.id}/read`, { method: 'PATCH' })
        )
      )

      mutateNotifications()
      toast.success('All notifications marked as read')
    } catch (error: any) {
      toast.error('Failed to mark all as read')
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-inset-top">
      <div className="container mx-auto px-4">
        <div className="flex h-14 md:h-16 items-center justify-between">
          {/* Mobile Menu Button and Logo */}
          <div className="md:hidden flex items-center gap-3">
            <MobileNav />
            <Link href="/" className="flex items-center touch-manipulation">
              <img src="/favicon.svg" alt="Skillyy" className="h-9 w-9 rounded" />
            </Link>
          </div>
          
          {/* Right side icons */}
          <div className="flex items-center gap-2">
            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} unread
                    </Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {recentNotifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">No notifications</p>
                  </div>
                ) : (
                  <>
                    {recentNotifications.map((notification: any) => (
                      <div key={notification.id}>
                        <DropdownMenuItem
                          className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                          onClick={() => {
                            if (!notification.readStatus) {
                              handleMarkAsRead(notification.id)
                            }
                            if (notification.task) {
                              router.push(`/tasks/${notification.task.id}`)
                            }
                          }}
                        >
                          <div className="flex items-start justify-between w-full gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              {!notification.readStatus && (
                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${!notification.readStatus ? 'font-medium' : 'text-muted-foreground'}`}>
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                                </p>
                              </div>
                            </div>
                            {!notification.readStatus && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </div>
                    ))}
                    
                    {unreadCount > 0 && (
                      <>
                        <DropdownMenuItem
                          onClick={handleMarkAllAsRead}
                          className="text-center justify-center cursor-pointer"
                        >
                          <CheckCheck className="w-4 h-4 mr-2" />
                          Mark all as read
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                  </>
                )}
                
                <DropdownMenuItem
                  onClick={() => router.push('/dashboard/notifications')}
                  className="text-center justify-center cursor-pointer font-medium"
                >
                  View All Notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name || 'User'}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/api/auth/signout')}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}

