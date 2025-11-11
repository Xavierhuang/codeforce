'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Save, Upload, MapPin, Edit, Linkedin, Github, Globe, Plus, Trash2, Award, GraduationCap, Languages, Image, Star, CheckCircle } from 'lucide-react'
import { AvatarCropper } from '@/components/AvatarCropper'
import { AvatarDisplay } from '@/components/AvatarDisplay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import toast from 'react-hot-toast'
import { GoogleMapsLoader } from '@/components/maps/GoogleMapsLoader'
import { AddressAutocomplete } from '@/components/maps/AddressAutocomplete'
import { LocationPicker } from '@/components/maps/LocationPicker'
import type { AddressData } from '@/components/maps/AddressAutocomplete'
import { TaskerBadge } from '@/components/TaskerBadge'
import { TaskerBadgeTier } from '@/lib/badge-tier'
import { formatCurrency } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ProfileSetupPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { data: user, error: userError, mutate } = useSWR(
    session ? '/api/v1/users/me' : null,
    fetcher
  )

  const isWorker = user?.role === 'WORKER'
  const isClient = user?.role === 'CLIENT'

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    avatarUrl: '',
    bannerUrl: '',
    email: '',
    phone: '',
    website: '',
    linkedinUrl: '',
    githubUrl: '',
    location: '',
    locationLat: '',
    locationLng: '',
    serviceRadiusMiles: '',
    hourlyRate: '',
    serviceType: 'VIRTUAL',
    yearsOfExperience: '',
    education: '',
    languages: '',
    certifications: '',
    slug: '',
    // Buyer-specific fields
    company: '',
    companySize: '',
    industry: '',
    projectTypes: '',
    budgetRange: '',
    preferredCommunication: '',
    typicalProjectDuration: '',
  })
  const [skills, setSkills] = useState<{ skill: string; level: string }[]>([])
  const [newSkill, setNewSkill] = useState({ skill: '', level: 'mid' })
  const [workerServices, setWorkerServices] = useState<Array<{
    id?: string
    skillName: string
    hourlyRate: string
    description: string
    isActive: boolean
  }>>([])
  const [newService, setNewService] = useState({ skillName: '', hourlyRate: '', description: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [bannerPreview, setBannerPreview] = useState('')
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [avatarCropData, setAvatarCropData] = useState<{ x: number; y: number; scale: number } | null>(null)
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string>('')

  useEffect(() => {
    if (user) {
      const userBannerUrl = (user as any).bannerUrl || ''
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || '',
        avatarCropX: (user.avatarCropX?.toString() || ''),
        avatarCropY: (user.avatarCropY?.toString() || ''),
        avatarCropScale: (user.avatarCropScale?.toString() || ''),
        email: user.email || '',
        phone: user.phone || '',
        website: user.website || '',
        linkedinUrl: user.linkedinUrl || '',
        githubUrl: user.githubUrl || '',
        location: user.location || '',
        locationLat: user.locationLat?.toString() || '',
        locationLng: user.locationLng?.toString() || '',
        serviceRadiusMiles: user.serviceRadiusMiles?.toString() || '',
        hourlyRate: user.hourlyRate?.toString() || '',
        serviceType: user.serviceType || 'VIRTUAL',
        yearsOfExperience: user.yearsOfExperience?.toString() || '',
        education: user.education || '',
        languages: user.languages || '',
        certifications: user.certifications || '',
        bannerUrl: userBannerUrl,
        slug: user.slug || '',
        // Buyer-specific fields
        company: (user as any).company || '',
        companySize: (user as any).companySize || '',
        industry: (user as any).industry || '',
        projectTypes: (user as any).projectTypes || '',
        budgetRange: (user as any).budgetRange || '',
        preferredCommunication: (user as any).preferredCommunication || '',
        typicalProjectDuration: (user as any).typicalProjectDuration || '',
      })
      setSkills(user.skills?.map((s: any) => ({ skill: s.skill, level: s.level })) || [])
      setWorkerServices((user as any).workerServices?.map((s: any) => ({
        id: s.id,
        skillName: s.skillName || '',
        hourlyRate: s.hourlyRate?.toString() || '',
        description: s.description || '',
        isActive: s.isActive !== false,
      })) || [])
      setAvatarPreview(user.avatarUrl || '')
      if (user.avatarCropX !== null || user.avatarCropY !== null || user.avatarCropScale !== null) {
        setAvatarCropData({
          x: user.avatarCropX || 0,
          y: user.avatarCropY || 0,
          scale: user.avatarCropScale || 1,
        })
      }
      // Always update bannerPreview from user data when it changes
      if (userBannerUrl) {
        setBannerPreview(userBannerUrl)
      } else {
        // Only clear if we don't have a local preview
        if (!bannerPreview || !bannerPreview.startsWith('blob:')) {
          setBannerPreview('')
        }
      }
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddSkill = () => {
    if (newSkill.skill.trim()) {
      setSkills([...skills, { skill: newSkill.skill.trim(), level: newSkill.level }])
      setNewSkill({ skill: '', level: 'mid' })
    }
  }

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index))
  }

  const handleAddService = () => {
    if (newService.skillName.trim() && newService.hourlyRate.trim()) {
      setWorkerServices([...workerServices, {
        skillName: newService.skillName.trim(),
        hourlyRate: newService.hourlyRate.trim(),
        description: newService.description.trim(),
        isActive: true,
      }])
      setNewService({ skillName: '', hourlyRate: '', description: '' })
    }
  }

  const handleRemoveService = (index: number) => {
    setWorkerServices(workerServices.filter((_, i) => i !== index))
  }

  const handleUpdateService = (index: number, field: string, value: string) => {
    const updated = [...workerServices]
    updated[index] = { ...updated[index], [field]: value }
    setWorkerServices(updated)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to server
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'avatar')

        const uploadResponse = await fetch('/api/v1/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Upload error response:', errorData)
          throw new Error(errorData.error || `Upload failed with status ${uploadResponse.status}`)
        }

        const uploadData = await uploadResponse.json()
        if (!uploadData.url) {
          throw new Error('No URL returned from upload')
        }
        
        // Store the uploaded URL and show cropper
        setPendingAvatarUrl(uploadData.url)
        setAvatarPreview(uploadData.url)
        setShowAvatarCropper(true)
      } catch (error: any) {
        console.error('Error uploading avatar:', error)
        const errorMessage = error.message || 'Failed to upload avatar. Please try again.'
        toast.error(errorMessage)
      }
    }
  }

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setBannerPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to server
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'banner')

        const uploadResponse = await fetch('/api/v1/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Upload error response:', errorData)
          throw new Error(errorData.error || `Upload failed with status ${uploadResponse.status}`)
        }

        const uploadData = await uploadResponse.json()
        if (!uploadData.url) {
          throw new Error('No URL returned from upload')
        }
        
        setFormData((prev) => ({ ...prev, bannerUrl: uploadData.url }))
        toast.success('Banner uploaded successfully')
      } catch (error: any) {
        console.error('Error uploading banner:', error)
        const errorMessage = error.message || 'Failed to upload banner. Please try again.'
        toast.error(errorMessage)
      }
    }
  }

  const handleAddressSelect = (data: AddressData) => {
    setFormData((prev) => ({
      ...prev,
      locationLat: data.lat.toString(),
      locationLng: data.lng.toString(),
      location: data.formattedAddress || data.address,
    }))
  }

  const handleLocationChange = (lat: number, lng: number) => {
    setFormData((prev) => ({
      ...prev,
      locationLat: lat.toString(),
      locationLng: lng.toString(),
    }))
  }

  const handleAvatarCropSave = (cropData: { x: number; y: number; scale: number }) => {
    setAvatarCropData(cropData)
    setFormData((prev) => ({
      ...prev,
      avatarUrl: pendingAvatarUrl,
      avatarCropX: cropData.x.toString(),
      avatarCropY: cropData.y.toString(),
      avatarCropScale: cropData.scale.toString(),
    }))
    setShowAvatarCropper(false)
    toast.success('Avatar position saved')
  }

  const handleAvatarCropCancel = () => {
    setShowAvatarCropper(false)
    setPendingAvatarUrl('')
    // Reset to previous avatar if available
    if (user?.avatarUrl) {
      setAvatarPreview(user.avatarUrl)
    } else {
      setAvatarPreview('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          bio: formData.bio,
          avatarUrl: formData.avatarUrl,
          avatarCropX: formData.avatarCropX ? parseFloat(formData.avatarCropX) : undefined,
          avatarCropY: formData.avatarCropY ? parseFloat(formData.avatarCropY) : undefined,
          avatarCropScale: formData.avatarCropScale ? parseFloat(formData.avatarCropScale) : undefined,
          phone: formData.phone,
          website: formData.website,
          linkedinUrl: formData.linkedinUrl,
          githubUrl: formData.githubUrl,
          locationLat: formData.locationLat ? parseFloat(formData.locationLat) : undefined,
          locationLng: formData.locationLng ? parseFloat(formData.locationLng) : undefined,
          serviceRadiusMiles: isWorker ? (formData.serviceRadiusMiles ? parseInt(formData.serviceRadiusMiles) : undefined) : undefined,
          hourlyRate: isWorker ? (formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined) : undefined,
          serviceType: isWorker ? formData.serviceType : undefined,
          skills: isWorker ? skills : undefined,
          yearsOfExperience: isWorker ? (formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : undefined) : undefined,
          education: isWorker ? (formData.education || undefined) : undefined,
          languages: isWorker ? (formData.languages || undefined) : undefined,
          certifications: isWorker ? (formData.certifications || undefined) : undefined,
          bannerUrl: formData.bannerUrl || undefined,
          slug: (isWorker || isClient) ? formData.slug || undefined : undefined,
          workerServices: isWorker ? workerServices : undefined,
          // Buyer-specific fields
          company: isClient ? formData.company || undefined : undefined,
          companySize: isClient ? formData.companySize || undefined : undefined,
          industry: isClient ? formData.industry || undefined : undefined,
          projectTypes: isClient ? formData.projectTypes || undefined : undefined,
          budgetRange: isClient ? formData.budgetRange || undefined : undefined,
          preferredCommunication: isClient ? formData.preferredCommunication || undefined : undefined,
          typicalProjectDuration: isClient ? formData.typicalProjectDuration || undefined : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update profile' }))
        const errorMessage = errorData.details || errorData.error || 'Failed to update profile'
        console.error('API Error:', errorData)
        throw new Error(errorMessage)
      }

      const updatedUser = await response.json()
      
      // Update form data with saved values to keep them in the form
      const userBannerUrl = updatedUser?.bannerUrl || ''
      setFormData({
        name: updatedUser?.name || '',
        bio: updatedUser?.bio || '',
        avatarUrl: updatedUser?.avatarUrl || '',
        avatarCropX: (updatedUser?.avatarCropX?.toString() || ''),
        avatarCropY: (updatedUser?.avatarCropY?.toString() || ''),
        avatarCropScale: (updatedUser?.avatarCropScale?.toString() || ''),
        email: updatedUser?.email || '',
        phone: updatedUser?.phone || '',
        website: updatedUser?.website || '',
        linkedinUrl: updatedUser?.linkedinUrl || '',
        githubUrl: updatedUser?.githubUrl || '',
        location: updatedUser?.location || '',
        locationLat: updatedUser?.locationLat?.toString() || '',
        locationLng: updatedUser?.locationLng?.toString() || '',
        serviceRadiusMiles: updatedUser?.serviceRadiusMiles?.toString() || '',
        hourlyRate: updatedUser?.hourlyRate?.toString() || '',
        serviceType: updatedUser?.serviceType || 'VIRTUAL',
        yearsOfExperience: updatedUser?.yearsOfExperience?.toString() || '',
        education: updatedUser?.education || '',
        languages: updatedUser?.languages || '',
        certifications: updatedUser?.certifications || '',
        bannerUrl: userBannerUrl,
        // Buyer-specific fields
        company: updatedUser?.company || '',
        companySize: updatedUser?.companySize || '',
        industry: updatedUser?.industry || '',
        projectTypes: updatedUser?.projectTypes || '',
        budgetRange: updatedUser?.budgetRange || '',
        preferredCommunication: updatedUser?.preferredCommunication || '',
        typicalProjectDuration: updatedUser?.typicalProjectDuration || '',
      })
      
      // Update skills from saved data
      if (updatedUser?.skills) {
        setSkills(updatedUser.skills.map((s: any) => ({ skill: s.skill, level: s.level })))
      }
      
      // Update workerServices from saved data
      if (updatedUser?.workerServices) {
        setWorkerServices(updatedUser.workerServices.map((s: any) => ({
          id: s.id,
          skillName: s.skillName || '',
          hourlyRate: s.hourlyRate?.toString() || '',
          description: s.description || '',
          isActive: s.isActive !== false,
        })))
      }
      
      // Update avatar preview and crop data if avatar was saved
      if (updatedUser?.avatarUrl) {
        setAvatarPreview(updatedUser.avatarUrl)
        if (updatedUser.avatarCropX !== null || updatedUser.avatarCropY !== null || updatedUser.avatarCropScale !== null) {
          setAvatarCropData({
            x: updatedUser.avatarCropX || 0,
            y: updatedUser.avatarCropY || 0,
            scale: updatedUser.avatarCropScale || 1,
          })
        }
      }
      
      // Update bannerPreview if bannerUrl was saved
      if (updatedUser?.bannerUrl) {
        setBannerPreview(updatedUser.bannerUrl)
      } else if (formData.bannerUrl) {
        // If API doesn't return bannerUrl but we have it in formData, use that
        setBannerPreview(formData.bannerUrl)
      }
      
      // Refresh user data to ensure everything is in sync
      mutate(updatedUser, false) // Update cache with the response data
      
      toast.success('Profile updated successfully!')
      // Stay on the profile edit page - no redirect
    } catch (error: any) {
      console.error('Profile update error:', error)
      const errorMessage = error.message || 'Failed to update profile'
      toast.error(errorMessage, { duration: 5000 })
      console.error('Full error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F3F2EF]" suppressHydrationWarning>
        <div className="max-w-[1128px] mx-auto px-4 py-8">
          <div className="bg-white rounded-lg p-12 text-center text-gray-600">
            Please sign in to access this page
          </div>
        </div>
      </div>
    )
  }

  // Allow both workers and clients to edit their profiles
  if ((session.user as any).role !== 'WORKER' && (session.user as any).role !== 'CLIENT') {
    return (
      <div className="min-h-screen bg-[#F3F2EF]" suppressHydrationWarning>
        <div className="max-w-[1128px] mx-auto px-4 py-8">
          <div className="bg-white rounded-lg p-12 text-center text-gray-600">
            This page is only available for workers and buyers
          </div>
        </div>
      </div>
    )
  }

  if (userError) {
    return (
      <div className="min-h-screen bg-[#F3F2EF]" suppressHydrationWarning>
        <div className="max-w-[1128px] mx-auto px-4 py-8">
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-gray-600 mb-4">Error loading profile data</p>
            <p className="text-sm text-red-500">{userError.message || 'Unknown error'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F2EF] pb-8" suppressHydrationWarning>
      {/* LinkedIn-Style Banner Image */}
      <div className="relative w-full h-[200px] md:h-[300px] bg-gradient-to-r from-[#94FE0C] via-[#7FE00A] to-[#94FE0C] z-0">
        {(bannerPreview || formData.bannerUrl) ? (
          <img
            src={bannerPreview || formData.bannerUrl}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        ) : null}
        <label
          htmlFor="banner-upload"
          className="absolute top-4 right-4 px-4 py-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-all cursor-pointer flex items-center gap-2 text-sm font-semibold text-gray-900 z-10"
        >
          <Image className="w-4 h-4" />
          {(bannerPreview || formData.bannerUrl) ? 'Change Banner' : 'Upload Banner'}
        </label>
        <input
          id="banner-upload"
          type="file"
          accept="image/*"
          onChange={handleBannerChange}
          className="hidden"
        />
      </div>

      {/* Main Content Container */}
      <div className="max-w-[1128px] mx-auto px-4 -mt-20 relative z-10">
        <form onSubmit={handleSubmit}>
          {/* Profile Card - Overlapping Banner */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
            {/* Profile Header */}
            <div className="px-6 pt-4 pb-6">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Avatar */}
                <div className="relative -mt-20 md:-mt-24">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg overflow-hidden">
                    <AvatarDisplay
                      src={avatarPreview || undefined}
                      alt="Profile"
                      fallback={formData.name?.[0]?.toUpperCase() || 'U'}
                      className="w-full h-full"
                      cropX={formData.avatarCropX ? parseFloat(formData.avatarCropX) : undefined}
                      cropY={formData.avatarCropY ? parseFloat(formData.avatarCropY) : undefined}
                      cropScale={formData.avatarCropScale ? parseFloat(formData.avatarCropScale) : undefined}
                      size={160}
                    />
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center cursor-pointer shadow-md hover:bg-gray-50 transition-all"
                  >
                    <Upload className="w-4 h-4 text-gray-700" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Profile Info */}
                <div className="flex-1 mt-4 md:mt-0">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="text-2xl md:text-3xl font-bold border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto"
                          placeholder="Your name"
                        />
                        {user?.badgeTier && user.badgeTier !== 'STARTER' && (
                          <TaskerBadge 
                            tier={user.badgeTier as TaskerBadgeTier} 
                            size="md"
                          />
                        )}
                        {user?.verificationStatus === 'VERIFIED' && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-[#94FE0C]/20 rounded text-xs font-semibold text-gray-900">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </div>
                        )}
                      </div>

                      {/* Location & Contact */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                        {isWorker && formData.locationLat && formData.locationLng && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>Available for in-person</span>
                            {formData.serviceRadiusMiles && (
                              <span className="text-gray-500">• {formData.serviceRadiusMiles} mi radius</span>
                            )}
                          </div>
                        )}
                        {isClient && formData.locationLat && formData.locationLng && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{formData.location || 'Location set'}</span>
                          </div>
                        )}
                        {isWorker && formData.hourlyRate && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-gray-900">{formatCurrency(parseFloat(formData.hourlyRate))}/hr</span>
                          </div>
                        )}
                        {isClient && formData.company && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-gray-900">{formData.company}</span>
                            {formData.industry && (
                              <span className="text-gray-500">• {formData.industry}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      {user && (
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-gray-900">{(user.rating || 0).toFixed(1)}</span>
                            <span className="text-gray-600">({(user as any)._count?.reviewsReceived || 0})</span>
                          </div>
                          <span className="text-gray-400">•</span>
                          {isWorker && (
                            <span className="text-gray-600">{(user as any)._count?.tasksAssigned || 0} tasks completed</span>
                          )}
                          {isClient && (
                            <span className="text-gray-600">{(user as any)._count?.tasksPosted || 0} projects posted</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 bg-[#94FE0C] text-gray-900 rounded-lg hover:bg-[#7FE00A] transition-all font-semibold text-sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid - LinkedIn Style */}
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 pb-8">
            {/* Left Sidebar */}
            <div className="space-y-4">
              {/* About Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">About</h2>
                <Textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={6}
                  className="w-full text-sm border-gray-200"
                  placeholder="Tell us about yourself, your experience, and what makes you unique..."
                />
              </div>

              {/* Contact & Links */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Contact & Links</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="linkedinUrl" className="text-xs text-gray-500 mb-1 block">LinkedIn</Label>
                    <Input
                      id="linkedinUrl"
                      name="linkedinUrl"
                      type="url"
                      value={formData.linkedinUrl}
                      onChange={handleInputChange}
                      className="w-full text-sm h-9"
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                  <div>
                    <Label htmlFor="githubUrl" className="text-xs text-gray-500 mb-1 block">GitHub</Label>
                    <Input
                      id="githubUrl"
                      name="githubUrl"
                      type="url"
                      value={formData.githubUrl}
                      onChange={handleInputChange}
                      className="w-full text-sm h-9"
                      placeholder="https://github.com/yourusername"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website" className="text-xs text-gray-500 mb-1 block">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full text-sm h-9"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-xs text-gray-500 mb-1 block">Phone (Private)</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full text-sm h-9"
                      placeholder="+1 (555) 123-4567"
                    />
                    <p className="text-xs text-gray-400 mt-1">Not shown on public profile</p>
                  </div>
                  {(isWorker || isClient) && (
                    <div>
                      <Label htmlFor="slug" className="text-xs text-gray-500 mb-1 block">Profile URL</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">codeforce.com/</span>
                        <Input
                          id="slug"
                          name="slug"
                          value={formData.slug}
                          onChange={handleInputChange}
                          className="flex-1 text-sm h-9"
                          placeholder={isWorker ? 'your-name' : 'your-company'}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {isWorker 
                          ? 'Your public profile URL: /developers/your-name'
                          : 'Your public profile URL: /buyers/your-company'}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Location</Label>
                    <GoogleMapsLoader>
                      <AddressAutocomplete
                        value={formData.location}
                        onSelect={handleAddressSelect}
                        label=""
                        placeholder="Enter your address..."
                        showLocationButton={false}
                      />
                    </GoogleMapsLoader>
                    {formData.locationLat && formData.locationLng && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setShowLocationPicker(!showLocationPicker)}
                          className="text-xs text-[#94FE0C] hover:text-[#7FE00A] font-medium"
                        >
                          {showLocationPicker ? 'Hide Map' : 'Show Map'}
                        </button>
                        {showLocationPicker && (
                          <div className="mt-2">
                            <LocationPicker
                              lat={parseFloat(formData.locationLat)}
                              lng={parseFloat(formData.locationLng)}
                              onLocationChange={handleLocationChange}
                              height="192px"
                              zoom={15}
                              readOnly={false}
                              showControls={true}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {isWorker && formData.locationLat && formData.locationLng && (
                      <div className="mt-2">
                        <Label htmlFor="serviceRadiusMiles" className="text-xs text-gray-500 mb-1 block">Service Radius (miles)</Label>
                        <Input
                          id="serviceRadiusMiles"
                          name="serviceRadiusMiles"
                          type="number"
                          value={formData.serviceRadiusMiles}
                          onChange={handleInputChange}
                          className="w-full text-sm h-9"
                          placeholder="25"
                          min="0"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Info - Worker */}
              {isWorker && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Professional Info</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="yearsOfExperience" className="text-xs text-gray-500 mb-1 block">Experience</Label>
                      <Input
                        id="yearsOfExperience"
                        name="yearsOfExperience"
                        type="number"
                        value={formData.yearsOfExperience}
                        onChange={handleInputChange}
                        className="w-full text-sm h-9"
                        placeholder="5"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="education" className="text-xs text-gray-500 mb-1 block">Education</Label>
                      <Input
                        id="education"
                        name="education"
                        value={formData.education}
                        onChange={handleInputChange}
                        className="w-full text-sm h-9"
                        placeholder="e.g., BS Computer Science, MIT"
                      />
                    </div>
                    <div>
                      <Label htmlFor="languages" className="text-xs text-gray-500 mb-1 block">Languages</Label>
                      <Input
                        id="languages"
                        name="languages"
                        value={formData.languages}
                        onChange={handleInputChange}
                        className="w-full text-sm h-9"
                        placeholder="e.g., English (Native), Spanish (Fluent)"
                      />
                    </div>
                    <div>
                      <Label htmlFor="certifications" className="text-xs text-gray-500 mb-1 block">Certifications</Label>
                      <Input
                        id="certifications"
                        name="certifications"
                        value={formData.certifications}
                        onChange={handleInputChange}
                        className="w-full text-sm h-9"
                        placeholder="e.g., AWS Certified, Google Cloud Professional"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Company & Project Info - Buyer */}
              {isClient && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Company & Project Info</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="company" className="text-xs text-gray-500 mb-1 block">Company Name</Label>
                      <Input
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full text-sm h-9"
                        placeholder="e.g., Acme Corp, StartupXYZ"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="companySize" className="text-xs text-gray-500 mb-1 block">Company Size</Label>
                        <select
                          id="companySize"
                          name="companySize"
                          value={formData.companySize}
                          onChange={handleInputChange}
                          className="w-full text-sm h-9 border-gray-200 rounded-md"
                        >
                          <option value="">Select size</option>
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-500">201-500 employees</option>
                          <option value="500+">500+ employees</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="industry" className="text-xs text-gray-500 mb-1 block">Industry</Label>
                        <Input
                          id="industry"
                          name="industry"
                          value={formData.industry}
                          onChange={handleInputChange}
                          className="w-full text-sm h-9"
                          placeholder="e.g., Technology, Healthcare, Finance"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="projectTypes" className="text-xs text-gray-500 mb-1 block">Project Types</Label>
                      <Input
                        id="projectTypes"
                        name="projectTypes"
                        value={formData.projectTypes}
                        onChange={handleInputChange}
                        className="w-full text-sm h-9"
                        placeholder="e.g., Web Development, Mobile Apps, API Integration, UI/UX Design"
                      />
                      <p className="text-xs text-gray-400 mt-1">Types of projects you typically work on (comma-separated)</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="budgetRange" className="text-xs text-gray-500 mb-1 block">Typical Budget Range</Label>
                        <select
                          id="budgetRange"
                          name="budgetRange"
                          value={formData.budgetRange}
                          onChange={handleInputChange}
                          className="w-full text-sm h-9 border-gray-200 rounded-md"
                        >
                          <option value="">Select range</option>
                          <option value="$500-$1,000">$500-$1,000</option>
                          <option value="$1,000-$5,000">$1,000-$5,000</option>
                          <option value="$5,000-$25,000">$5,000-$25,000</option>
                          <option value="$25,000-$100,000">$25,000-$100,000</option>
                          <option value="$100,000+">$100,000+</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="typicalProjectDuration" className="text-xs text-gray-500 mb-1 block">Typical Project Duration</Label>
                        <select
                          id="typicalProjectDuration"
                          name="typicalProjectDuration"
                          value={formData.typicalProjectDuration}
                          onChange={handleInputChange}
                          className="w-full text-sm h-9 border-gray-200 rounded-md"
                        >
                          <option value="">Select duration</option>
                          <option value="1-2 weeks">1-2 weeks</option>
                          <option value="1-3 months">1-3 months</option>
                          <option value="3-6 months">3-6 months</option>
                          <option value="6+ months">6+ months</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="preferredCommunication" className="text-xs text-gray-500 mb-1 block">Preferred Communication</Label>
                      <select
                        id="preferredCommunication"
                        name="preferredCommunication"
                        value={formData.preferredCommunication}
                        onChange={handleInputChange}
                        className="w-full text-sm h-9 border-gray-200 rounded-md"
                      >
                        <option value="">Select preference</option>
                        <option value="Email">Email</option>
                        <option value="Phone">Phone</option>
                        <option value="Video Call">Video Call</option>
                        <option value="In-Person">In-Person</option>
                        <option value="Flexible">Flexible</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Map */}
              {formData.locationLat && formData.locationLng && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Location</h2>
                  <GoogleMapsLoader>
                    <LocationPicker
                      lat={parseFloat(formData.locationLat)}
                      lng={parseFloat(formData.locationLng)}
                      onLocationChange={handleLocationChange}
                      height="192px"
                      zoom={12}
                      readOnly={false}
                      showControls={true}
                    />
                  </GoogleMapsLoader>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="space-y-4">
              {/* Skills Section - Workers Only */}
              {isWorker && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Skills</h2>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="e.g., React, Node.js, Python"
                      value={newSkill.skill}
                      onChange={(e) => setNewSkill({ ...newSkill, skill: e.target.value })}
                      className="flex-1 text-sm"
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
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#94FE0C]"
                    >
                      <option value="junior">Junior</option>
                      <option value="mid">Mid Level</option>
                      <option value="senior">Senior</option>
                    </select>
                    <Button type="button" onClick={handleAddSkill} className="bg-[#94FE0C] hover:bg-[#7FE00A] text-gray-900">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  {skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[#94FE0C]/10 border border-[#94FE0C]/30 rounded-lg"
                        >
                          <span className="text-sm font-semibold text-gray-900">{skill.skill}</span>
                          <span className="text-xs text-gray-600 capitalize">({skill.level})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(index)}
                            className="ml-1 text-gray-600 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Add your skills to showcase your expertise</p>
                  )}
                </div>
              </div>
              )}

              {/* Worker Services Section - Workers Only */}
              {isWorker && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Services</h2>
                <p className="text-xs text-gray-500 mb-4">Add specific services you offer with individual pricing</p>
                
                <div className="space-y-4">
                  {/* Add New Service */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Add New Service</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Service Name *</Label>
                        <Input
                          placeholder="e.g., React Development, UI/UX Design"
                          value={newService.skillName}
                          onChange={(e) => setNewService({ ...newService, skillName: e.target.value })}
                          className="text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddService()
                            }
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Hourly Rate ($) *</Label>
                          <Input
                            type="number"
                            placeholder="50.00"
                            value={newService.hourlyRate}
                            onChange={(e) => setNewService({ ...newService, hourlyRate: e.target.value })}
                            className="text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Description</Label>
                        <Textarea
                          placeholder="Describe what this service includes..."
                          value={newService.description}
                          onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                          className="text-sm min-h-[80px]"
                          rows={3}
                        />
                      </div>
                      <Button 
                        type="button" 
                        onClick={handleAddService}
                        disabled={!newService.skillName.trim() || !newService.hourlyRate.trim()}
                        className="bg-[#94FE0C] hover:bg-[#7FE00A] text-gray-900"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Service
                      </Button>
                    </div>
                  </div>

                  {/* Existing Services */}
                  {workerServices.length > 0 ? (
                    <div className="space-y-3">
                      {workerServices.map((service, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4 bg-white"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div>
                                <Label className="text-xs text-gray-500 mb-1 block">Service Name</Label>
                                <Input
                                  value={service.skillName}
                                  onChange={(e) => handleUpdateService(index, 'skillName', e.target.value)}
                                  className="text-sm font-semibold"
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1 block">Hourly Rate ($)</Label>
                                  <Input
                                    type="number"
                                    value={service.hourlyRate}
                                    onChange={(e) => handleUpdateService(index, 'hourlyRate', e.target.value)}
                                    className="text-sm"
                                    min="0"
                                    step="0.01"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500 mb-1 block">Description</Label>
                                <Textarea
                                  value={service.description}
                                  onChange={(e) => handleUpdateService(index, 'description', e.target.value)}
                                  className="text-sm min-h-[60px]"
                                  rows={2}
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveService(index)}
                              className="text-gray-400 hover:text-red-500 transition-colors mt-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-4">
                      No services added yet. Add your first service above.
                    </p>
                  )}
                </div>
              </div>
              )}

              {/* Service Information - Workers Only */}
              {isWorker && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">General Service Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="serviceType" className="text-xs text-gray-500 mb-1 block">Service Type</Label>
                    <select
                      id="serviceType"
                      name="serviceType"
                      value={formData.serviceType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#94FE0C]"
                    >
                      <option value="VIRTUAL">Remote/Virtual</option>
                      <option value="IN_PERSON">In-Person</option>
                      <option value="BOTH">Both</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="hourlyRate" className="text-xs text-gray-500 mb-1 block">Default Hourly Rate ($)</Label>
                    <Input
                      id="hourlyRate"
                      name="hourlyRate"
                      type="number"
                      value={formData.hourlyRate}
                      onChange={handleInputChange}
                      className="w-full text-sm h-9"
                      placeholder="50.00"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-400 mt-1">Used if no specific service rate is set</p>
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Avatar Cropper Dialog */}
      {pendingAvatarUrl && (
        <AvatarCropper
          image={pendingAvatarUrl}
          open={showAvatarCropper}
          onClose={handleAvatarCropCancel}
          onSave={handleAvatarCropSave}
        />
      )}
    </div>
  )
}
