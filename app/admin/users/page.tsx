'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import toast from 'react-hot-toast'
import { Search, ShieldCheck, Ban, UserCheck, UserX, Eye, Mail, Phone, Calendar, DollarSign, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [verificationFilter, setVerificationFilter] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendDuration, setSuspendDuration] = useState<string>('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: allUsers, error: usersError, mutate } = useSWR(
    status === 'authenticated' ? '/api/v1/admin/users' : null,
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

  // Filter users
  const filteredUsers = allUsers?.filter((user: any) => {
    const matchesSearch = !searchQuery || 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = !roleFilter || user.role === roleFilter
    const matchesVerification = !verificationFilter || 
      (verificationFilter === 'VERIFIED' && user.verificationStatus === 'VERIFIED') ||
      (verificationFilter === 'PENDING' && user.verificationStatus === 'PENDING') ||
      (verificationFilter === 'REJECTED' && user.verificationStatus === 'REJECTED') ||
      (verificationFilter === 'ALL' && user.role === 'WORKER')
    
    return matchesSearch && matchesRole && matchesVerification
  }) || []

  const handleVerifyUser = async (userId: string, status: 'VERIFIED' | 'REJECTED' | 'PENDING') => {
    try {
      const response = await fetch('/api/v1/admin/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status }),
      })

      if (!response.ok) {
        throw new Error('Failed to update user verification')
      }

      const statusMessages: Record<string, string> = {
        VERIFIED: 'verified',
        REJECTED: 'rejected',
        PENDING: 'unverified (set to pending)',
      }
      toast.success(`User ${statusMessages[status] || status}`)
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
    }
  }

  const handleChangeRole = async (userId: string, newRole: 'CLIENT' | 'WORKER') => {
    try {
      const response = await fetch('/api/v1/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change user role')
      }

      toast.success(`User role changed to ${newRole}`)
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to change user role')
    }
  }

  const handleSuspendUser = async () => {
    if (!selectedUser || !suspendReason.trim()) {
      toast.error('Please provide a reason for suspension')
      return
    }

    try {
      const response = await fetch('/api/v1/admin/users/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          reason: suspendReason,
          duration: suspendDuration || null, // null = permanent
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to suspend user')
      }

      toast.success('User suspended successfully')
      setShowSuspendDialog(false)
      setSuspendReason('')
      setSuspendDuration('')
      setSelectedUser(null)
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to suspend user')
    }
  }

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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          User Management
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          View and manage all platform users. Click on any user card to view their complete profile and activity.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search" className="text-sm font-medium mb-2 block">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Role</Label>
              <Select value={roleFilter || undefined} onValueChange={(value) => setRoleFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="WORKER">Worker</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Verification</Label>
              <Select value={verificationFilter || undefined} onValueChange={(value) => setVerificationFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold">All Users</CardTitle>
              <CardDescription className="text-sm mt-1">
                {usersError ? 'Error loading users' : `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersError ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-2">Error loading users: {usersError.message}</p>
              <Button onClick={() => mutate()}>Retry</Button>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map((userItem: any) => (
                <div
                  key={userItem.id}
                  className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 md:p-5 border rounded-xl hover:border-primary/50 hover:shadow-md transition-all cursor-pointer bg-card"
                  onClick={() => router.push(`/admin/users/${userItem.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-semibold text-primary">
                          {userItem.name?.charAt(0)?.toUpperCase() || userItem.email?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-base md:text-lg truncate group-hover:text-primary transition-colors">
                            {userItem.name || 'No name'}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {userItem.email}
                          </p>
                        </div>
                      </div>
                      <Badge variant={userItem.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs shrink-0">
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
                          className="text-xs shrink-0"
                        >
                          {userItem.verificationStatus}
                        </Badge>
                      )}
                    </div>
                    {userItem.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <Phone className="w-3 h-3" />
                        {userItem.phone}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Joined {format(new Date(userItem.createdAt), 'MMM d, yyyy')}
                      </span>
                      {userItem._count && (
                        <>
                          {userItem._count.tasksPosted > 0 && (
                            <span className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground">{userItem._count.tasksPosted}</span>
                              <span>Tasks</span>
                            </span>
                          )}
                          {userItem._count.reviewsReceived > 0 && (
                            <span className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground">{userItem._count.reviewsReceived}</span>
                              <span>Reviews</span>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 flex-shrink-0 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/admin/users/${userItem.id}`)
                      }}
                      className="text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1.5" />
                      View Profile
                    </Button>
                    {userItem.role === 'WORKER' && userItem.verificationStatus === 'VERIFIED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerifyUser(userItem.id, 'PENDING')}
                        className="text-xs"
                      >
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Unverify
                      </Button>
                    )}
                    {userItem.role !== 'ADMIN' && (
                      <>
                        <Select
                          value={userItem.role}
                          onValueChange={(value: 'CLIENT' | 'WORKER') => handleChangeRole(userItem.id, value)}
                        >
                          <SelectTrigger className="w-full sm:w-[100px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CLIENT">Client</SelectItem>
                            <SelectItem value="WORKER">Worker</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedUser(userItem)
                            setShowSuspendDialog(true)
                          }}
                          className="text-xs"
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          Suspend
                        </Button>
                      </>
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

      {/* Suspend User Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Suspend user account temporarily or permanently
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="suspend-reason">Reason for Suspension *</Label>
              <Textarea
                id="suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g., Violation of terms of service, inappropriate behavior, etc."
                className="mt-1 min-h-[100px]"
              />
            </div>
            <div>
              <Label htmlFor="suspend-duration">Duration</Label>
              <Select value={suspendDuration || undefined} onValueChange={(value) => setSuspendDuration(value === 'permanent' ? '' : value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Permanent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowSuspendDialog(false)
              setSuspendReason('')
              setSuspendDuration('')
              setSelectedUser(null)
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspendUser}
              disabled={!suspendReason.trim()}
            >
              Suspend User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
