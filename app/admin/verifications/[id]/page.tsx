'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, ArrowLeft, MapPin, DollarSign, Clock, FileText, Globe, Linkedin, Github, Award, GraduationCap, Languages, Briefcase } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

export default function VerificationDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string
  const [mounted, setMounted] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: allUsers, mutate } = useSWR(
    status === 'authenticated' && userId ? '/api/v1/admin/users' : null,
    fetcher
  )
  
  const selectedUser = allUsers?.find((u: any) => u.id === userId)

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
      mutate()
      router.push('/admin/verifications')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
    }
  }

  const handleRejectClick = () => {
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

  if (!selectedUser) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">User not found</p>
          <Button onClick={() => router.push('/admin/verifications')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Verifications
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Image */}
      {selectedUser.bannerUrl && (
        <div className="relative w-full h-[200px] md:h-[300px] bg-gradient-to-r from-[#94FE0C] via-[#7FE00A] to-[#94FE0C]">
          <img
            src={selectedUser.bannerUrl}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/verifications')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Verifications
          </Button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Verification Details</h1>
              <p className="text-muted-foreground">
                Review all information before approving or rejecting
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleRejectClick}
                className="text-sm"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleVerifyUser(selectedUser.id, 'VERIFIED')}
                className="bg-green-600 hover:bg-green-700 text-sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{selectedUser.name || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{selectedUser.email}</span>
                  </div>
                  {selectedUser.phone && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{selectedUser.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline">{selectedUser.verificationStatus}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bio */}
            {selectedUser.bio && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">Bio</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap break-words">
                    {selectedUser.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {selectedUser.skills && selectedUser.skills.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.skills.map((skill: any) => (
                      <Badge key={skill.id} variant="secondary" className="text-sm py-1 px-3">
                        {skill.skill} ({skill.level})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Professional Information */}
            {(selectedUser.yearsOfExperience || selectedUser.education || selectedUser.languages || selectedUser.certifications) && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">Professional Information</h2>
                  <div className="space-y-4">
                    {selectedUser.yearsOfExperience && (
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground">Years of Experience:</span>
                          <span className="font-medium ml-2">{selectedUser.yearsOfExperience}</span>
                        </div>
                      </div>
                    )}
                    {selectedUser.education && (
                      <div className="flex items-start gap-3">
                        <GraduationCap className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <span className="text-muted-foreground">Education:</span>
                          <p className="font-medium mt-1 break-words">{selectedUser.education}</p>
                        </div>
                      </div>
                    )}
                    {selectedUser.languages && (
                      <div className="flex items-start gap-3">
                        <Languages className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <span className="text-muted-foreground">Languages:</span>
                          <p className="font-medium mt-1 break-words">{selectedUser.languages}</p>
                        </div>
                      </div>
                    )}
                    {selectedUser.certifications && (
                      <div className="flex items-start gap-3">
                        <Award className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <span className="text-muted-foreground">Certifications:</span>
                          <p className="font-medium mt-1 break-words">{selectedUser.certifications}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Worker Services */}
            {selectedUser.workerServices && Array.isArray(selectedUser.workerServices) && selectedUser.workerServices.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">Services Offered</h2>
                  <div className="space-y-3">
                    {selectedUser.workerServices.map((service: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-lg">{service.skillName || 'Service'}</span>
                          {service.hourlyRate && (
                            <span className="text-lg font-medium text-muted-foreground">${service.hourlyRate}/hr</span>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                        )}
                        <Badge variant={service.isActive !== false ? 'default' : 'secondary'}>
                          {service.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Availability */}
            {selectedUser.availability && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">Availability</h2>
                  <div className="space-y-2">
                    {Object.entries(selectedUser.availability as Record<string, any>).map(([day, slots]: [string, any]) => {
                      if (!slots || (Array.isArray(slots) && slots.length === 0)) return null
                      const daySlots = Array.isArray(slots) ? slots : [slots]
                      return (
                        <div key={day} className="flex items-center gap-3 py-2 border-b last:border-0">
                          <span className="text-muted-foreground w-24 font-medium capitalize">{day}:</span>
                          <div className="flex flex-wrap gap-2">
                            {daySlots.map((slot: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-sm">
                                {slot.start} - {slot.end}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                    {Object.keys(selectedUser.availability as Record<string, any>).length === 0 && (
                      <p className="text-sm text-muted-foreground">No availability set</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ID Document */}
            {selectedUser.idDocumentUrl && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">ID Document</h2>
                  <div className="space-y-4">
                    {selectedUser.idDocumentType && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-muted-foreground">Document Type:</span>
                        <span className="font-medium capitalize">{selectedUser.idDocumentType.replace('_', ' ')}</span>
                      </div>
                    )}
                    {selectedUser.idDocumentUploadedAt && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-muted-foreground">Uploaded:</span>
                        <span className="font-medium">
                          {new Date(selectedUser.idDocumentUploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <a
                      href={selectedUser.idDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                    >
                      <FileText className="w-5 h-5" />
                      View ID Document (Opens in new tab)
                    </a>
                    <div className="mt-4">
                      <img
                        src={selectedUser.idDocumentUrl}
                        alt="ID Document"
                        className="max-w-full h-auto border rounded-lg shadow-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Image */}
            {selectedUser.avatarUrl && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center">
                    <img
                      src={selectedUser.avatarUrl}
                      alt={selectedUser.name || 'Profile'}
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 mb-4"
                    />
                    <h3 className="text-xl font-semibold">{selectedUser.name || 'No name'}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing & Service */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Pricing & Service</h3>
                <div className="space-y-3">
                  {selectedUser.hourlyRate && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Hourly Rate:</span>
                        <span className="font-medium ml-2">${selectedUser.hourlyRate}</span>
                      </div>
                    </div>
                  )}
                  {selectedUser.serviceType && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Service Type:</span>
                        <span className="font-medium ml-2">{selectedUser.serviceType.replace('_', ' ')}</span>
                      </div>
                    </div>
                  )}
                  {selectedUser.serviceRadiusMiles && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Service Radius:</span>
                        <span className="font-medium ml-2">{selectedUser.serviceRadiusMiles} miles</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            {selectedUser.location && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Location</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">{selectedUser.location}</span>
                    </div>
                    {selectedUser.locationLat && selectedUser.locationLng && (
                      <div className="text-sm text-muted-foreground pl-7">
                        Coordinates: {selectedUser.locationLat.toFixed(4)}, {selectedUser.locationLng.toFixed(4)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Professional Links */}
            {(selectedUser.website || selectedUser.linkedinUrl || selectedUser.githubUrl) && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Professional Links</h3>
                  <div className="space-y-3">
                    {selectedUser.website && (
                      <a
                        href={selectedUser.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Globe className="w-5 h-5" />
                        <span>Website</span>
                      </a>
                    )}
                    {selectedUser.linkedinUrl && (
                      <a
                        href={selectedUser.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Linkedin className="w-5 h-5" />
                        <span>LinkedIn Profile</span>
                      </a>
                    )}
                    {selectedUser.githubUrl && (
                      <a
                        href={selectedUser.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Github className="w-5 h-5" />
                        <span>GitHub Profile</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Stats */}
            {selectedUser._count && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Activity</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tasks Posted:</span>
                      <span className="font-medium">{selectedUser._count.tasksPosted || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tasks Assigned:</span>
                      <span className="font-medium">{selectedUser._count.tasksAssigned || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reviews:</span>
                      <span className="font-medium">{selectedUser._count.reviewsReceived || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this verification request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm}>
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

