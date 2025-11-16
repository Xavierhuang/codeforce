'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, ShieldCheck, Eye, MapPin, DollarSign, Clock, FileText, Globe, Linkedin, Github, Award, GraduationCap, Languages, Calendar, Briefcase } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

export default function AdminVerificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showTaskDetails, setShowTaskDetails] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: allUsers, mutate } = useSWR(
    status === 'authenticated' ? '/api/v1/admin/users' : null,
    fetcher
  )
  
  const pendingUsers = allUsers?.filter((u: any) => u.verificationStatus === 'PENDING') || []

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

  const handleVerifyUser = async (userId: string, status: 'VERIFIED' | 'REJECTED' | 'PENDING', reason?: string) => {
    try {
      const response = await fetch('/api/v1/admin/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status, reason }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user verification')
      }

      const statusMessages: Record<string, string> = {
        VERIFIED: 'verified',
        REJECTED: 'rejected',
        PENDING: 'unverified (set to pending)',
      }
      toast.success(`User ${statusMessages[status] || status}`)
      setShowRejectDialog(false)
      setRejectionReason('')
      setSelectedUser(null)
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
    }
  }

  const handleRejectClick = (user: any) => {
    setSelectedUser(user)
    setShowRejectDialog(true)
  }

  const handleRejectConfirm = () => {
    if (!selectedUser) return
    handleVerifyUser(selectedUser.id, 'REJECTED', rejectionReason)
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
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Verifications</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Review and verify user accounts - Workers and Buyers ({pendingUsers.length} pending)
        </p>
      </div>

      {pendingUsers.length > 0 ? (
        <>
          <div className="space-y-4">
            {pendingUsers.map((pendingUser: any) => (
              <Card 
                key={pendingUser.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  router.push(`/admin/verifications/${pendingUser.id}`)
                }}
              >
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-base md:text-lg truncate">{pendingUser.name || 'No name'}</CardTitle>
                            <Badge variant={pendingUser.role === 'WORKER' ? 'default' : 'secondary'} className="text-xs">
                              {pendingUser.role === 'WORKER' ? 'Worker' : pendingUser.role === 'CLIENT' ? 'Buyer' : pendingUser.role}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs md:text-sm truncate">{pendingUser.email}</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {pendingUser.verificationStatus}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          router.push(`/admin/verifications/${pendingUser.id}`)
                        }}
                        className="text-xs md:text-sm"
                      >
                        <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectClick(pendingUser)}
                        className="text-xs md:text-sm"
                      >
                        <XCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleVerifyUser(pendingUser.id, 'VERIFIED')}
                        className="bg-green-600 hover:bg-green-700 text-xs md:text-sm"
                      >
                        <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingUser.bio && (
                      <div>
                        <p className="text-xs md:text-sm font-medium mb-1">Bio</p>
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 break-words">
                          {pendingUser.bio}
                        </p>
                      </div>
                    )}
                    {pendingUser.skills && pendingUser.skills.length > 0 && (
                      <div>
                        <p className="text-xs md:text-sm font-medium mb-1">Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {pendingUser.skills.slice(0, 5).map((skill: any) => (
                            <Badge key={skill.id} variant="secondary" className="text-[10px]">
                              {skill.skill}
                            </Badge>
                          ))}
                          {pendingUser.skills.length > 5 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{pendingUser.skills.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    {pendingUser.role === 'CLIENT' && pendingUser.company && (
                      <div>
                        <p className="text-xs md:text-sm font-medium mb-1">Company</p>
                        <p className="text-xs md:text-sm text-muted-foreground">{pendingUser.company}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs md:text-sm text-muted-foreground">
                      {pendingUser.hourlyRate && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${pendingUser.hourlyRate}/hr
                        </span>
                      )}
                      {pendingUser.serviceType && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {pendingUser.serviceType.replace('_', ' ')}
                        </span>
                      )}
                      {pendingUser.idDocumentUrl && (
                        <a
                          href={pendingUser.idDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileText className="w-3 h-3" />
                          View ID
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No pending verifications</p>
          </CardContent>
        </Card>
      )}

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this verification request. This will help the user understand what needs to be fixed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., ID document is unclear, missing required information, etc."
                className="mt-1 min-h-[100px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false)
              setRejectionReason('')
              setSelectedUser(null)
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim()}
            >
              Reject Verification
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
