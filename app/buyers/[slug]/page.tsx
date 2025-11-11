'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, CheckCircle, Mail, ExternalLink, Building2, Briefcase, DollarSign, MessageSquare, Calendar } from 'lucide-react'
import { QRCode } from '@/components/QRCode'
import { GoogleMapsLoader } from '@/components/maps/GoogleMapsLoader'
import { LocationPicker } from '@/components/maps/LocationPicker'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BuyerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const slug = params?.slug as string
  const [profileUrl, setProfileUrl] = useState('')

  const { data: buyer, isLoading } = useSWR(
    slug ? `/api/v1/buyers/${slug}` : null,
    fetcher
  )

  const { data: user } = useSWR(
    session ? '/api/v1/users/me' : null,
    fetcher
  )

  const isOwner = user?.id === buyer?.id
  const isWorker = user?.role === 'WORKER' || (session?.user as any)?.role === 'WORKER'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setProfileUrl(window.location.href)
    }
  }, [buyer])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F2EF]" suppressHydrationWarning>
        <div className="container mx-auto px-4 py-16 text-center">Loading...</div>
      </div>
    )
  }

  if (!buyer) {
    return (
      <div className="min-h-screen bg-[#F3F2EF]" suppressHydrationWarning>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Buyer profile not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F2EF] pb-8" suppressHydrationWarning>
      {/* LinkedIn-Style Banner Image - Full width at top */}
      <div className="relative w-full h-[200px] md:h-[300px] bg-gradient-to-r from-[#94FE0C] via-[#7FE00A] to-[#94FE0C] z-0">
        {buyer.bannerUrl ? (
          <img
            src={buyer.bannerUrl}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      {/* Main Content Container */}
      <div className="max-w-[1128px] mx-auto px-4 -mt-20 relative z-10">
        {/* Profile Card - Overlapping Banner */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          {/* Profile Header */}
          <div className="px-6 pt-4 pb-6">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* Avatar */}
              <div className="relative -mt-20 md:-mt-24">
                {buyer.avatarUrl ? (
                  <img
                    src={buyer.avatarUrl}
                    alt={buyer.name || 'Buyer'}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg bg-[#94FE0C]/20 flex items-center justify-center text-4xl md:text-5xl font-bold text-gray-900">
                    {buyer.name?.[0]?.toUpperCase() || 'B'}
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 mt-4 md:mt-0">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                        {buyer.name || 'Buyer'}
                      </h1>
                      {buyer.verificationStatus === 'VERIFIED' && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-[#94FE0C]/20 rounded text-xs font-semibold text-gray-900">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </div>
                      )}
                    </div>

                    {/* Company & Location */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      {buyer.company && (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          <span>{buyer.company}</span>
                        </div>
                      )}
                      {buyer.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{buyer.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      {buyer.rating && buyer.ratingCount > 0 && (
                        <>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-gray-900">{buyer.rating.toFixed(1)}</span>
                            <span className="text-gray-600">({buyer.ratingCount})</span>
                          </div>
                          <span className="text-gray-400">•</span>
                        </>
                      )}
                      <span className="text-gray-600">{buyer._count?.tasksPosted || 0} projects completed</span>
                    </div>
                  </div>

                  {/* Edit Profile Button - Only for owner */}
                  {isOwner && (
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard/profile')}
                      className="flex-shrink-0"
                    >
                      Edit Profile
                    </Button>
                  )}
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
            {buyer.bio && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">About</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{buyer.bio}</p>
              </div>
            )}

            {/* Company Information */}
            {(buyer.company || buyer.industry || buyer.companySize) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Company Information</h2>
                <div className="space-y-3">
                  {buyer.company && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Company</p>
                      <p className="text-sm font-semibold text-gray-900">{buyer.company}</p>
                    </div>
                  )}
                  {buyer.industry && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Industry</p>
                      <p className="text-sm text-gray-900">{buyer.industry}</p>
                    </div>
                  )}
                  {buyer.companySize && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Company Size</p>
                      <p className="text-sm text-gray-900">{buyer.companySize}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Project Preferences */}
            {(buyer.projectTypes || buyer.budgetRange || buyer.preferredCommunication || buyer.typicalProjectDuration) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Project Preferences</h2>
                <div className="space-y-3">
                  {buyer.projectTypes && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Project Types</p>
                      <p className="text-sm text-gray-900">{buyer.projectTypes}</p>
                    </div>
                  )}
                  {buyer.budgetRange && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Budget Range</p>
                      <p className="text-sm font-semibold text-gray-900">{buyer.budgetRange}</p>
                    </div>
                  )}
                  {buyer.preferredCommunication && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Preferred Communication</p>
                      <p className="text-sm text-gray-900">{buyer.preferredCommunication}</p>
                    </div>
                  )}
                  {buyer.typicalProjectDuration && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Typical Project Duration</p>
                      <p className="text-sm text-gray-900">{buyer.typicalProjectDuration}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Professional Links */}
            {(buyer.linkedinUrl || buyer.website) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Professional Links</h2>
                <div className="space-y-3">
                  {buyer.linkedinUrl && (
                    <a
                      href={buyer.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#94FE0C] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      LinkedIn
                    </a>
                  )}
                  {buyer.website && (
                    <a
                      href={buyer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#94FE0C] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Location Map */}
            {buyer.locationLat && buyer.locationLng && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Location</h2>
                <GoogleMapsLoader>
                  <LocationPicker
                    lat={parseFloat(buyer.locationLat.toString())}
                    lng={parseFloat(buyer.locationLng.toString())}
                    onLocationChange={() => {}}
                    height="192px"
                    zoom={12}
                    readOnly={true}
                    showControls={false}
                  />
                </GoogleMapsLoader>
              </div>
            )}

            {/* Contact & QR Code */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
              {/* Contact Button - Show for workers */}
              {isWorker && (
                <Button
                  className="w-full bg-[#94FE0C] hover:bg-[#7FE00A] text-gray-900 font-semibold"
                  onClick={() => {
                    // Navigate to create task or contact page
                    router.push(`/tasks/new?buyer=${buyer.slug || buyer.id}`)
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Buyer
                </Button>
              )}
              
              {/* Sign in prompt for non-authenticated users */}
              {!session && (
                <Button
                  className="w-full bg-[#94FE0C] hover:bg-[#7FE00A] text-gray-900 font-semibold"
                  onClick={() => {
                    const callbackUrl = typeof window !== 'undefined' ? window.location.pathname : '/buyers'
                    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
                  }}
                >
                  Sign In to Contact
                </Button>
              )}

              {/* QR Code */}
              {profileUrl && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Share Profile</h3>
                  <div className="flex flex-col items-center space-y-3">
                    <QRCode value={profileUrl} size={150} />
                    <div className="w-full">
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <input
                          type="text"
                          value={profileUrl}
                          readOnly
                          className="flex-1 text-xs bg-transparent border-0 outline-none truncate"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(profileUrl)
                            alert('Link copied to clipboard!')
                          }}
                          className="flex-shrink-0"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            {/* Recent Projects */}
            {buyer.tasksPosted && buyer.tasksPosted.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Projects</h2>
                <div className="space-y-4">
                  {buyer.tasksPosted.map((task: any) => (
                    <div key={task.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">{task.title}</h3>
                        <Badge variant={task.status === 'COMPLETED' ? 'default' : 'secondary'}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

