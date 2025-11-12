'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Search,
  ShoppingBag,
  Briefcase,
  MessageSquare,
  Users,
  ClipboardList,
  DollarSign,
  Settings,
  AlertTriangle,
  Bell,
  User,
  Menu,
  X,
  Wallet,
  Megaphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useEffect, useRef, useState } from 'react'
import { getPusherClient } from '@/lib/pusher-client'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ('CLIENT' | 'WORKER' | 'ADMIN')[]
  badge?: number
  badgeColor?: string
}

interface UnifiedHeaderClientProps {
  user: any
  initialNotifications: {
    allNotifications: any[]
    unreadNotifications: any[]
    unreadCount: number
  } | null
  adminBadges: {
    pendingVerifications: number
    pendingPayouts: number
    openTickets: number
    reports: number
  } | null
}

export function UnifiedHeaderClient({ user: initialUser, initialNotifications, adminBadges: initialAdminBadges }: UnifiedHeaderClientProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Use SWR for client-side updates, but start with server data
  const { data: user } = useSWR(
    status === 'authenticated' ? '/api/v1/users/me' : null,
    fetcher,
    { fallbackData: initialUser }
  )

  // Fetch notifications with server data as fallback
  const { data: allNotifications, mutate: mutateNotifications, error: notificationsError } = useSWR(
    status === 'authenticated' ? '/api/v1/notifications?limit=10' : null,
    fetcher,
    { fallbackData: initialNotifications?.allNotifications }
  )
  const { data: unreadNotifications, error: unreadError } = useSWR(
    status === 'authenticated' ? '/api/v1/notifications?unreadOnly=true&limit=50' : null,
    fetcher,
    { fallbackData: initialNotifications?.unreadNotifications }
  )

  // Safely handle notifications data
  const safeAllNotifications = (!notificationsError && Array.isArray(allNotifications)) ? allNotifications : (initialNotifications?.allNotifications || [])
  const safeUnreadNotifications = (!unreadError && Array.isArray(unreadNotifications)) ? unreadNotifications : (initialNotifications?.unreadNotifications || [])
  
  const unreadCount = safeUnreadNotifications.length
  const recentNotifications = safeAllNotifications.slice(0, 5)

  // Admin badges - use SWR for updates, but start with server data
  const isAdmin = user?.role === 'ADMIN'
  const { data: pendingUsers } = useSWR(
    isAdmin ? '/api/v1/admin/users' : null,
    fetcher
  )
  const { data: payoutRequests } = useSWR(
    isAdmin ? '/api/v1/payouts/request' : null,
    fetcher
  )
  const { data: supportTickets } = useSWR(
    isAdmin ? '/api/v1/admin/support' : null,
    fetcher
  )

  const pendingVerifications = initialAdminBadges?.pendingVerifications || pendingUsers?.filter((u: any) => u.verificationStatus === 'PENDING').length || 0
  const pendingPayouts = initialAdminBadges?.pendingPayouts || payoutRequests?.filter((r: any) => r.status === 'PENDING').length || 0
  const openTickets = initialAdminBadges?.openTickets || supportTickets?.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length || 0
  const reports = supportTickets?.filter((t: any) => 
    t.category === 'REPORT_USER' || t.category === 'REPORT_TASK'
  ) || []

  // Pusher for real-time notifications
  const pusherRef = useRef<any>(null)
  const mutateRef = useRef(mutateNotifications)
  mutateRef.current = mutateNotifications
  
  useEffect(() => {
    if (!session?.user?.id) return
    const pusher = getPusherClient()
    if (!pusher) return
    pusherRef.current = pusher
    // Subscribe to private user channel for notifications
    const channel = pusher.subscribe(`private-user-${session.user.id}`)
    channel.bind('notification', () => {
      requestAnimationFrame(() => {
        mutateRef.current()
      })
    })
    return () => {
      channel.unbind_all()
      channel.unsubscribe()
    }
  }, [session?.user?.id])

  const handleMarkAsRead = async (notificationId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    try {
      await fetch(`/api/v1/notifications/${notificationId}/read`, { method: 'PATCH' })
      mutateNotifications()
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark as read')
    }
  }

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      const unread = safeAllNotifications.filter((n: any) => !n.readStatus)
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

  const isClient = user?.role === 'CLIENT'
  const isWorker = user?.role === 'WORKER'
  const isAuthenticated = status === 'authenticated' && session

  // Build navigation items
  const navItems: NavItem[] = []
  // Dashboard for clients and workers only (admins have their own admin dashboard)
  navItems.push({
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['CLIENT', 'WORKER'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
  })

  if (isClient) {
    navItems.push({
      href: '/dashboard/orders',
      label: 'My Orders',
      icon: ShoppingBag,
      roles: ['CLIENT'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
    })
  }

  if (isWorker) {
    navItems.push(
      {
        href: '/dashboard/tasks',
        label: 'My Tasks',
        icon: Briefcase,
        roles: ['WORKER'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      },
    )
  }

  navItems.push({
    href: '/dashboard/calendar',
    label: 'Calendar',
    icon: Calendar,
    roles: ['CLIENT', 'WORKER'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
  })

  if (isWorker) {
    navItems.push(
      {
        href: '/dashboard/availability',
        label: 'Availability',
        icon: Clock,
        roles: ['WORKER'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      },
      {
        href: '/dashboard/verify',
        label: 'Verification',
        icon: ShieldCheck,
        roles: ['WORKER'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      }
    )
  }

  // Admin navigation items
  if (isAdmin) {
    navItems.push(
      {
        href: '/admin',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: ['ADMIN'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      },
      {
        href: '/admin/users',
        label: 'Users',
        icon: Users,
        roles: ['ADMIN'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      },
      {
        href: '/admin/verifications',
        label: 'Verifications',
        icon: ShieldCheck,
        badge: pendingVerifications,
        badgeColor: 'bg-red-500',
        roles: ['ADMIN'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      },
      {
        href: '/admin/tasks',
        label: 'Tasks',
        icon: ClipboardList,
        roles: ['ADMIN'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      },
      {
        href: '/admin/payouts',
        label: 'Payouts',
        icon: DollarSign,
        badge: pendingPayouts,
        badgeColor: 'bg-yellow-500',
        roles: ['ADMIN'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      },
      {
        href: '/admin/reports',
        label: 'Reports',
        icon: AlertTriangle,
        badge: reports?.filter((r: any) => r.status === 'OPEN').length || 0,
        badgeColor: 'bg-red-500',
        roles: ['ADMIN'] as ('CLIENT' | 'WORKER' | 'ADMIN')[],
      }
    )
  }

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role as any)
  )

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || (pathname?.startsWith('/dashboard') && !pathname?.startsWith('/admin'))
    } else if (href === '/admin') {
      return pathname === '/admin' || pathname === '/admin/'
    } else if (href === '/admin/stats') {
      return pathname === '/admin/stats'
    }
    return pathname === href || (href !== '/' && pathname?.startsWith(href))
  }

  // Public navigation items
  const publicNavItems = [
    { href: '/auth/signup?role=WORKER', label: 'Become a Tasker' },
    { href: '/developers', label: 'Find Developers' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 safe-area-inset-top shadow-sm" suppressHydrationWarning>
      <div className="container mx-auto px-3 md:px-4">
        <div className="flex h-14 md:h-16 items-center justify-between">
          {/* Logo */}
          <Link href={status === 'authenticated' ? '/dashboard' : '/'} className="flex items-center gap-2 flex-shrink-0">
            <img src="/logo.svg" alt="Skillyy" className="h-7 w-auto md:h-8 md:w-auto" />
          </Link>

          {isAuthenticated ? (
            <>
              {/* Desktop Navigation - Authenticated */}
              <nav className="hidden md:flex items-center gap-1 overflow-x-auto flex-1 justify-center mx-4">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative whitespace-nowrap ${
                        active
                          ? 'bg-[#94FE0C]/20 text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden lg:inline">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge className={`${item.badgeColor || 'bg-[#94FE0C]'} text-gray-900 text-xs min-w-[20px] h-5 flex items-center justify-center px-1.5`}>
                          {item.badge > 99 ? '99+' : item.badge}
                        </Badge>
                      )}
                      {active && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#94FE0C] rounded-full" />
                      )}
                    </Link>
                  )
                })}
              </nav>

              {/* Right Section - Authenticated */}
              <div className="flex items-center gap-1 md:gap-2">
                {/* Wallet (Workers only) - Hidden on mobile to save space */}
                {isWorker && (
                  <Link href="/dashboard/wallet" className="hidden md:block">
                    <Button variant="ghost" size="icon" className="relative h-9 w-9">
                      <Wallet className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                
                {/* Broadcast (Admins only) - Hidden on mobile to save space */}
                {isAdmin && (
                  <Link href="/admin/settings#broadcast" className="hidden md:block">
                    <Button variant="ghost" size="icon" className="relative h-9 w-9">
                      <Megaphone className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                
                {/* Notifications - Always visible on mobile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 md:h-9 md:w-9">
                      <Bell className="h-4 w-4 md:h-4 md:w-4" />
                      {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-red-500 text-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
                    <DropdownMenuLabel className="flex items-center justify-between">
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {unreadCount} unread
                        </Badge>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {safeAllNotifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-gray-500">No notifications</p>
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
                                    <div className="w-2 h-2 rounded-full bg-[#94FE0C] flex-shrink-0 mt-1.5" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${!notification.readStatus ? 'font-medium' : 'text-gray-500'}`}>
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
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
                                    <X className="w-3 h-3" />
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

                {/* User Profile - Always visible on mobile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 md:h-9 md:w-9">
                      {user?.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name || 'User'}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-[#94FE0C]/20 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-900" />
                        </div>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/support')} className="cursor-pointer">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Support
                    </DropdownMenuItem>
                    {isAdmin ? (
                      <DropdownMenuItem onClick={() => router.push('/admin/settings')} className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Platform Settings
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={async () => {
                        await signOut({ callbackUrl: 'https://skillyy.com/' })
                      }} 
                      className="cursor-pointer"
                    >
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <>
              {/* Desktop Navigation - Public */}
              <nav className="hidden md:flex items-center gap-6">
                {publicNavItems.map((item) => {
                  const active = pathname === item.href || pathname?.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`text-sm font-medium transition-colors pb-2 border-b-2 ${
                        active
                          ? 'text-gray-900 border-[#94FE0C]'
                          : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              {/* Right Section - Public */}
              <div className="flex items-center gap-3">
                <Link href="/auth/signin" className="hidden md:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Sign In
                </Link>
                <Link href="/auth/signup">
                  <Button 
                    size="sm" 
                    className="bg-[#94FE0C] hover:bg-[#7FE00A] text-gray-900 font-medium rounded-md px-4 py-2 transition-colors"
                  >
                    Get Started
                  </Button>
                </Link>
                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-9 w-9"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Mobile Navigation - Only show when NOT authenticated (authenticated users use bottom nav) */}
        {mobileMenuOpen && !isAuthenticated && (
          <div className="md:hidden border-t bg-white py-4">
            <nav className="flex flex-col gap-1">
              {/* Public mobile menu */}
              {publicNavItems.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#94FE0C]/20 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
              <div className="border-t my-2 pt-2">
                <Link
                  href="/auth/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium bg-[#94FE0C] text-gray-900 hover:bg-[#7FE00A] mt-2"
                >
                  Get Started
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

