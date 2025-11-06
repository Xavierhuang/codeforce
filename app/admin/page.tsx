'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, Users, Task, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState<'users' | 'tasks' | 'stats'>('stats')

  const { data: user } = useSWR(
    status === 'authenticated' ? '/api/v1/users/me' : null,
    fetcher
  )

  const { data: pendingUsers } = useSWR(
    selectedTab === 'users' ? '/api/v1/admin/users?status=PENDING' : null,
    fetcher
  )

  const { data: allUsers } = useSWR(
    selectedTab === 'users' ? '/api/v1/admin/users' : null,
    fetcher
  )

  const { data: allTasks } = useSWR(
    selectedTab === 'tasks' ? '/api/v1/admin/tasks' : null,
    fetcher
  )

  const { data: stats } = useSWR(
    selectedTab === 'stats' ? '/api/v1/admin/stats' : null,
    fetcher
  )

  useEffect(() => {
    if (status === 'authenticated' && user?.role !== 'ADMIN') {
      router.push('/dashboard')
      toast.error('Access denied. Admin only.')
    }
  }, [status, user, router])

  if (status === 'loading' || !session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (user?.role !== 'ADMIN') {
    return null
  }

  const handleVerifyUser = async (userId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const response = await fetch('/api/v1/admin/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status }),
      })

      if (!response.ok) {
        throw new Error('Failed to update user verification')
      }

      toast.success(`User ${status === 'VERIFIED' ? 'verified' : 'rejected'}`)
      // Refresh data
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, tasks, and platform statistics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b mb-6">
        <button
          onClick={() => setSelectedTab('stats')}
          className={`px-4 py-2 font-medium ${
            selectedTab === 'stats'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
        >
          Statistics
        </button>
        <button
          onClick={() => setSelectedTab('users')}
          className={`px-4 py-2 font-medium ${
            selectedTab === 'users'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
        >
          Users
          {pendingUsers && pendingUsers.length > 0 && (
            <Badge className="ml-2 bg-red-500">{pendingUsers.length}</Badge>
          )}
        </button>
        <button
          onClick={() => setSelectedTab('tasks')}
          className={`px-4 py-2 font-medium ${
            selectedTab === 'tasks'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
        >
          Tasks
        </button>
      </div>

      {/* Stats Tab */}
      {selectedTab === 'stats' && (
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.verifiedUsers || 0} verified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <Task className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.completedTasks || 0} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingVerifications || 0}</div>
              <p className="text-xs text-muted-foreground">Require review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(stats?.platformRevenue || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Total fees</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {selectedTab === 'users' && (
        <div className="space-y-6">
          {/* Pending Verifications */}
          {pendingUsers && pendingUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Verifications</CardTitle>
                <CardDescription>
                  Review and verify developer accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingUsers.map((pendingUser: any) => (
                    <div
                      key={pendingUser.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold">{pendingUser.name || 'No name'}</p>
                            <p className="text-sm text-muted-foreground">{pendingUser.email}</p>
                          </div>
                          <Badge variant="outline">
                            {pendingUser.verificationStatus}
                          </Badge>
                        </div>
                        {pendingUser.bio && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {pendingUser.bio}
                          </p>
                        )}
                        {pendingUser.idDocumentUrl && (
                          <a
                            href={pendingUser.idDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline mt-2 block"
                          >
                            View ID Document
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleVerifyUser(pendingUser.id, 'VERIFIED')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleVerifyUser(pendingUser.id, 'REJECTED')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Users */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>View and manage all platform users</CardDescription>
            </CardHeader>
            <CardContent>
              {allUsers && allUsers.length > 0 ? (
                <div className="space-y-2">
                  {allUsers.map((userItem: any) => (
                    <div
                      key={userItem.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{userItem.name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{userItem.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={userItem.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {userItem.role}
                        </Badge>
                        {userItem.role === 'WORKER' && (
                          <Badge
                            variant={
                              userItem.verificationStatus === 'VERIFIED'
                                ? 'default'
                                : userItem.verificationStatus === 'REJECTED'
                                ? 'destructive'
                                : 'outline'
                            }
                          >
                            {userItem.verificationStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tasks Tab */}
      {selectedTab === 'tasks' && (
        <Card>
          <CardHeader>
            <CardTitle>All Tasks</CardTitle>
            <CardDescription>View and manage all platform tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {allTasks && allTasks.length > 0 ? (
              <div className="space-y-4">
                {allTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{task.title}</h3>
                          <Badge variant="outline">{task.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Client: {task.client?.name || 'Unknown'}</span>
                          {task.worker && (
                            <span>Developer: {task.worker.name || 'Unknown'}</span>
                          )}
                          {task.price && <span>${task.price}</span>}
                        </div>
                      </div>
                      <a
                        href={`/tasks/${task.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        View →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No tasks found</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

