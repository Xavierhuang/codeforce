'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  ClipboardList, 
  DollarSign, 
  ShieldCheck, 
  MessageSquare, 
  Settings, 
  Megaphone,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  FileText,
  ArrowRight,
  UserCheck,
  Wallet
} from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch stats
  const { data: stats } = useSWR(
    status === 'authenticated' ? '/api/v1/admin/stats' : null,
    fetcher
  )

  // Fetch pending verifications
  const { data: pendingUsers } = useSWR(
    status === 'authenticated' ? '/api/v1/admin/users' : null,
    fetcher
  )

  // Fetch pending payouts
  const { data: payoutRequests } = useSWR(
    status === 'authenticated' ? '/api/v1/payouts/request' : null,
    fetcher
  )

  // Fetch support tickets
  const { data: supportTickets } = useSWR(
    status === 'authenticated' ? '/api/v1/admin/support' : null,
    fetcher
  )

  useEffect(() => {
    if (mounted && status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [mounted, status, router])

  useEffect(() => {
    if (mounted && session && session.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [mounted, session, router])

  if (!mounted || status === 'loading') {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated' || session?.user?.role !== 'ADMIN') {
    return (
      <div className="p-8">
        <div className="text-center">Redirecting...</div>
      </div>
    )
  }

  const pendingVerifications = pendingUsers?.filter((u: any) => u.verificationStatus === 'PENDING').length || 0
  const pendingPayouts = payoutRequests?.filter((r: any) => r.status === 'PENDING').length || 0
  const openTickets = supportTickets?.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length || 0
  const reports = supportTickets?.filter((t: any) => 
    (t.category === 'REPORT_USER' || t.category === 'REPORT_TASK') && t.status === 'OPEN'
  ).length || 0

  const quickLinks = [
    {
      title: 'Pending Verifications',
      description: `${pendingVerifications} worker${pendingVerifications !== 1 ? 's' : ''} awaiting review`,
      href: '/admin/verifications',
      icon: ShieldCheck,
      badge: pendingVerifications,
      badgeColor: 'bg-red-500',
      color: 'text-red-600',
    },
    {
      title: 'Pending Payouts',
      description: `${pendingPayouts} payout${pendingPayouts !== 1 ? 's' : ''} require approval`,
      href: '/admin/payouts',
      icon: Wallet,
      badge: pendingPayouts,
      badgeColor: 'bg-yellow-500',
      color: 'text-yellow-600',
    },
    {
      title: 'Open Support Tickets',
      description: `${openTickets} ticket${openTickets !== 1 ? 's' : ''} need attention`,
      href: '/admin/support',
      icon: MessageSquare,
      badge: openTickets,
      badgeColor: 'bg-blue-500',
      color: 'text-blue-600',
    },
    {
      title: 'User Reports',
      description: `${reports} report${reports !== 1 ? 's' : ''} pending review`,
      href: '/admin/reports',
      icon: AlertTriangle,
      badge: reports,
      badgeColor: 'bg-orange-500',
      color: 'text-orange-600',
    },
  ]

  const commonTasks = [
    {
      title: 'Send Broadcast',
      description: 'Send a message to all users',
      href: '/admin/settings#broadcast',
      icon: Megaphone,
    },
    {
      title: 'Platform Settings',
      description: 'Configure fees, security, and more',
      href: '/admin/settings',
      icon: Settings,
    },
    {
      title: 'View All Users',
      description: 'Manage user accounts',
      href: '/admin/users',
      icon: Users,
    },
    {
      title: 'Manage Tasks',
      description: 'View and manage all tasks',
      href: '/admin/tasks',
      icon: ClipboardList,
    },
    {
      title: 'View Statistics',
      description: 'Detailed platform analytics',
      href: '/admin/stats',
      icon: TrendingUp,
    },
    {
      title: 'Blog Posts',
      description: 'Manage blog content',
      href: '/admin/blog',
      icon: FileText,
    },
  ]

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Overview of platform activity and quick access to common tasks
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.newUsersToday || 0} new today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.activeTasks || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((stats?.platformRevenue || stats?.totalRevenue || 0)).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Workers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.verifiedWorkers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              of {stats?.workerCount || 0} total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        {/* Urgent Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Urgent Actions Required
            </CardTitle>
            <CardDescription>
              Items that need immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickLinks.map((link) => {
                const Icon = link.icon
                if (link.badge === 0) return null
                return (
                  <Link key={link.href} href={link.href}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${link.color} bg-opacity-10`}>
                          <Icon className={`h-5 w-5 ${link.color}`} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{link.title}</div>
                          <div className="text-xs text-muted-foreground">{link.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${link.badgeColor} text-white`}>
                          {link.badge}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                )
              })}
              {quickLinks.every(link => link.badge === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">All clear! No urgent actions required.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Common Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Common Tasks
            </CardTitle>
            <CardDescription>
              Quick access to frequently used admin functions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {commonTasks.map((task) => {
                const Icon = task.icon
                return (
                  <Link key={task.href} href={task.href}>
                    <div className="flex flex-col p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer h-full">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <div className="font-medium text-sm">{task.title}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{task.description}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">User Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Clients</span>
                <Badge variant="secondary">{stats?.clientCount || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Workers</span>
                <Badge variant="secondary">{stats?.workerCount || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Verified Workers</span>
                <Badge variant="default">{stats?.verifiedWorkers || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Task Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Open</span>
                <Badge variant="outline">{stats?.openTasks || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">In Progress</span>
                <Badge variant="secondary">{stats?.inProgressTasks || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Completed</span>
                <Badge className="bg-green-100 text-green-800">{stats?.completedTasks || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">New Users Today</span>
                <Badge variant="outline">{stats?.newUsersToday || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Tasks</span>
                <Badge variant="secondary">{stats?.activeTasks || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending Verifications</span>
                <Badge className="bg-red-100 text-red-800">{pendingVerifications}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
