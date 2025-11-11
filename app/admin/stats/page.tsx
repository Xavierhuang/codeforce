'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, Users, ClipboardList, DollarSign, AlertCircle } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

export default function AdminStatsPage() {
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

  const { data: pendingUsers } = useSWR(
    status === 'authenticated' ? '/api/v1/admin/users?verificationStatus=PENDING' : null,
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

  const pendingCount = pendingUsers?.filter((u: any) => u.verificationStatus === 'PENDING').length || 0

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Statistics</h1>
        <p className="text-sm md:text-base text-muted-foreground">Platform overview and metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
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
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats?.platformRevenue || stats?.totalRevenue || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional stats cards */}
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
            <CardTitle className="text-base md:text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{pendingCount} verification{pendingCount !== 1 ? 's' : ''} pending</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

