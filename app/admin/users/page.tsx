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
  const [showUserDetails, setShowUserDetails] = useState(false)
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
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Users</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage all platform users ({filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'})
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search" className="text-xs md:text-sm">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs md:text-sm">Role</Label>
              <Select value={roleFilter || undefined} onValueChange={(value) => setRoleFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="mt-1 text-sm">
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
              <Label className="text-xs md:text-sm">Verification</Label>
              <Select value={verificationFilter || undefined} onValueChange={(value) => setVerificationFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="mt-1 text-sm">
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">All Users</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {usersError ? 'Error loading users' : `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`}
          </CardDescription>
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
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm md:text-base truncate">{userItem.name || 'No name'}</p>
                      <Badge variant={userItem.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
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
                          className="text-xs"
                        >
                          {userItem.verificationStatus}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{userItem.email}</p>
                    {userItem.phone && (
                      <p className="text-xs text-muted-foreground">{userItem.phone}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined {format(new Date(userItem.createdAt), 'MMM d, yyyy')}
                      </span>
                      {userItem._count && (
                        <>
                          {userItem._count.tasksPosted > 0 && (
                            <span>Tasks: {userItem._count.tasksPosted}</span>
                          )}
                          {userItem._count.reviewsReceived > 0 && (
                            <span>Reviews: {userItem._count.reviewsReceived}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(userItem)
                        setShowUserDetails(true)
                      }}
                      className="text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
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
                          <SelectTrigger className="w-[100px] h-8 text-xs">
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

      {/* User Details Dialog */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete user information and activity
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{selectedUser.name || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{selectedUser.email}</span>
                  </div>
                  {selectedUser.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{selectedUser.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <Badge variant={selectedUser.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {selectedUser.role}
                    </Badge>
                  </div>
                  {selectedUser.role === 'WORKER' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verification:</span>
                      <Badge
                        variant={
                          selectedUser.verificationStatus === 'VERIFIED'
                            ? 'default'
                            : selectedUser.verificationStatus === 'REJECTED'
                            ? 'destructive'
                            : 'outline'
                        }
                      >
                        {selectedUser.verificationStatus}
                      </Badge>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Joined:</span>
                    <span className="font-medium">{format(new Date(selectedUser.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {selectedUser.bio && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Bio</h3>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg break-words">
                    {selectedUser.bio}
                  </p>
                </div>
              )}

              {/* Activity Stats */}
              {selectedUser._count && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Activity</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tasks Posted:</span>
                      <p className="font-medium">{selectedUser._count.tasksPosted || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tasks Assigned:</span>
                      <p className="font-medium">{selectedUser._count.tasksAssigned || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reviews:</span>
                      <p className="font-medium">{selectedUser._count.reviewsReceived || 0}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Worker-specific info */}
              {selectedUser.role === 'WORKER' && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Worker Information</h3>
                  <div className="space-y-2 text-sm">
                    {selectedUser.hourlyRate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hourly Rate:</span>
                        <span className="font-medium">${selectedUser.hourlyRate}</span>
                      </div>
                    )}
                    {selectedUser.walletBalance !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wallet Balance:</span>
                        <span className="font-medium">${selectedUser.walletBalance.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedUser.serviceType && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Type:</span>
                        <span className="font-medium">{selectedUser.serviceType.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-sm mb-2">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      router.push(`/admin/support?userId=${selectedUser.id}`)
                      setShowUserDetails(false)
                    }}
                    className="text-xs"
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    View Support Tickets
                  </Button>
                  {selectedUser.role === 'WORKER' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        router.push(`/admin/payouts?userId=${selectedUser.id}`)
                        setShowUserDetails(false)
                      }}
                      className="text-xs"
                    >
                      <DollarSign className="w-3 h-3 mr-1" />
                      View Payouts
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
