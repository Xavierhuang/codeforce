'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import useSWR from 'swr'
import { CheckCircle, Clock, XCircle } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function VerifyPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { data: user, mutate } = useSWR('/api/v1/users/me', fetcher)

  const [formData, setFormData] = useState({
    bio: '',
    skills: [] as { skill: string; level: string }[],
    idDocumentUrl: '',
    idDocumentType: '',
  })
  const [newSkill, setNewSkill] = useState({ skill: '', level: 'mid' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [idFile, setIdFile] = useState<File | null>(null)

  const handleAddSkill = () => {
    if (newSkill.skill.trim()) {
      setFormData({
        ...formData,
        skills: [...formData.skills, { skill: newSkill.skill.trim(), level: newSkill.level }],
      })
      setNewSkill({ skill: '', level: 'mid' })
    }
  }

  const handleRemoveSkill = (index: number) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((_, i) => i !== index),
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIdFile(file)
    }
  }

  const handleUploadId = async () => {
    if (!idFile) {
      toast.error('Please select a file first')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', idFile)
      formData.append('type', 'id_document')

      const response = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload file')
      }

      const data = await response.json()
      setFormData((prev) => ({
        ...prev,
        idDocumentUrl: data.url,
      }))
      toast.success('ID document uploaded successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload ID document')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate ID document is uploaded
      if (!formData.idDocumentUrl) {
        throw new Error('Please upload your ID document before submitting')
      }

      if (!formData.idDocumentType) {
        throw new Error('Please select the type of ID document')
      }

      const response = await fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          bio: formData.bio || undefined,
          skills: formData.skills,
          idDocumentUrl: formData.idDocumentUrl,
          idDocumentType: formData.idDocumentType,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      // Submit for verification
      const verifyResponse = await fetch('/api/v1/users/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!verifyResponse.ok) {
        throw new Error('Failed to submit for verification')
      }

      toast.success('Verification submitted! An admin will review your profile.')
      mutate()
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit verification')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusIcon = () => {
    if (user?.verificationStatus === 'VERIFIED') {
      return <CheckCircle className="w-6 h-6 text-green-600" />
    }
    if (user?.verificationStatus === 'REJECTED') {
      return <XCircle className="w-6 h-6 text-red-600" />
    }
    return <Clock className="w-6 h-6 text-yellow-600" />
  }

  const getStatusText = () => {
    if (user?.verificationStatus === 'VERIFIED') {
      return 'Verified - You can now receive task invitations!'
    }
    if (user?.verificationStatus === 'REJECTED') {
      return 'Rejected - Please update your profile and resubmit.'
    }
    if (user?.verificationStatus === 'PENDING') {
      return 'Pending Review - An admin will review your profile soon.'
    }
    return 'Not Submitted - Complete the form below to submit for verification.'
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Developer Verification</h1>
        <p className="text-muted-foreground">
          Complete your profile to get verified and start receiving task invitations
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle>Verification Status</CardTitle>
              <CardDescription>{getStatusText()}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Verification Form */}
      {user?.verificationStatus !== 'VERIFIED' && (
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Add your professional information to help clients find you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell clients about your experience, expertise, and include links to your GitHub, LinkedIn, or portfolio..."
                  className="mt-1 min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Include links to your professional profiles (GitHub, LinkedIn, portfolio)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle>Identity Verification *</CardTitle>
              <CardDescription>
                Upload a government-issued ID to verify your identity. This helps us ensure accountability and trust.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="idType">ID Document Type *</Label>
                <select
                  id="idType"
                  value={formData.idDocumentType}
                  onChange={(e) => setFormData({ ...formData, idDocumentType: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select ID type...</option>
                  <option value="passport">Passport</option>
                  <option value="drivers_license">Driver's License</option>
                  <option value="national_id">National ID</option>
                  <option value="other">Other Government ID</option>
                </select>
              </div>

              <div>
                <Label htmlFor="idFile">Upload ID Document *</Label>
                <div className="mt-1 space-y-2">
                  <Input
                    id="idFile"
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Accepted formats: JPEG, PNG, PDF (max 5MB). Make sure the document is clear and all information is visible.
                  </p>
                  {idFile && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{idFile.name}</span>
                      {!formData.idDocumentUrl && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleUploadId}
                          disabled={isUploading}
                        >
                          {isUploading ? 'Uploading...' : 'Upload'}
                        </Button>
                      )}
                    </div>
                  )}
                  {formData.idDocumentUrl && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>ID document uploaded successfully</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Privacy:</strong> Your ID document is stored securely and only used for verification purposes. 
                  Only admins can view it, and it's never shared with clients or other users.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>
                Add your technical skills and experience level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., React, Node.js, Python"
                  value={newSkill.skill}
                  onChange={(e) => setNewSkill({ ...newSkill, skill: e.target.value })}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddSkill()
                    }
                  }}
                />
                <select
                  value={newSkill.level}
                  onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                </select>
                <Button type="button" onClick={handleAddSkill}>
                  Add
                </Button>
              </div>

              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {skill.skill} ({skill.level})
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle>Verification Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Complete your profile with bio and skills</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Link your GitHub or LinkedIn profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>An admin will review your profile within 24-48 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Once verified, you'll receive a badge and can start receiving task invitations</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isSubmitting || formData.skills.length === 0 || !formData.idDocumentUrl || !formData.idDocumentType}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {user?.verificationStatus === 'VERIFIED' && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">You're Verified!</h2>
            <p className="text-muted-foreground mb-6">
              Your profile is verified and you can now receive task invitations.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

