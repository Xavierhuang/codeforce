'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, CheckCircle, Calendar, Mail, ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { QRCode } from '@/components/QRCode'
import { TaskerBadge } from '@/components/TaskerBadge'
import { TaskerBadgeTier } from '@/lib/badge-tier'
import { GoogleMapsLoader } from '@/components/maps/GoogleMapsLoader'
import { LocationPicker } from '@/components/maps/LocationPicker'
import { AvatarDisplay } from '@/components/AvatarDisplay'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DeveloperProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const slug = params?.slug as string
  const [profileUrl, setProfileUrl] = useState('')

  const { data: developer, isLoading } = useSWR(
    slug ? `/api/v1/developers/${slug}` : null,
    fetcher
  )

  const { data: user } = useSWR(
    session ? '/api/v1/users/me' : null,
    fetcher
  )

  const isBuyer = user?.role === 'CLIENT' || (session?.user as any)?.role === 'CLIENT'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setProfileUrl(window.location.href)
    }
  }, [developer])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F2EF]" suppressHydrationWarning>
        <div className="container mx-auto px-4 py-16 text-center">Loading...</div>
      </div>
    )
  }

  if (!developer) {
    return (
      <div className="min-h-screen bg-[#F3F2EF]" suppressHydrationWarning>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Developer profile not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F2EF] pb-8" suppressHydrationWarning>
      {/* LinkedIn-Style Banner Image - Full width at top */}
      <div className="relative w-full h-[200px] md:h-[300px] bg-gradient-to-r from-[#94FE0C] via-[#7FE00A] to-[#94FE0C] z-0">
        {developer.bannerUrl ? (
          <img
            src={developer.bannerUrl}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      {/* Main Content Container */}
      <div className="max-w-[1128px] mx-auto px-4 -mt-20 relative z-10">
        {/* Single Profile Card - All Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row md:items-start gap-6 mb-6 pb-6 border-b">
            {/* Avatar */}
            <div className="relative -mt-20 md:-mt-24 flex-shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg overflow-hidden">
                <AvatarDisplay
                  src={developer.avatarUrl || undefined}
                  alt={developer.name || 'Developer'}
                  fallback={developer.name?.[0]?.toUpperCase() || 'D'}
                  className="w-full h-full"
                  cropX={developer.avatarCropX ?? undefined}
                  cropY={developer.avatarCropY ?? undefined}
                  cropScale={developer.avatarCropScale ?? undefined}
                  size={160}
                />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 mt-4 md:mt-0">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      {developer.name || 'Developer'}
                    </h1>
                    {developer.badgeTier && developer.badgeTier !== 'STARTER' && (
                      <TaskerBadge 
                        tier={developer.badgeTier as TaskerBadgeTier} 
                        size="md"
                      />
                    )}
                    {developer.verificationStatus === 'VERIFIED' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-[#94FE0C]/20 rounded text-xs font-semibold text-gray-900">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </div>
                    )}
                  </div>

                  {/* Location & Rate */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                    {developer.locationLat && developer.locationLng && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>Available for in-person</span>
                        {developer.serviceRadiusMiles && (
                          <span className="text-gray-500">• {developer.serviceRadiusMiles} mi radius</span>
                        )}
                      </div>
                    )}
                    {developer.hourlyRate && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-gray-900">{formatCurrency(developer.hourlyRate)}/hr</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-gray-900">{(developer.rating || 0).toFixed(1)}</span>
                      <span className="text-gray-600">({developer._count?.reviewsReceived || 0})</span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">{developer._count?.tasksAssigned || 0} tasks completed</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {isBuyer && developer.hourlyRate && (
                    <Button
                      className="bg-[#94FE0C] hover:bg-[#7FE00A] text-gray-900 font-semibold"
                      onClick={() => router.push(`/book/${developer.slug || developer.id}`)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Now
                    </Button>
                  )}
                  
                  {isBuyer && !developer.hourlyRate && (
                    <Button
                      className="bg-[#94FE0C] hover:bg-[#7FE00A] text-gray-900 font-semibold"
                      onClick={() => router.push(`/book/${developer.slug || developer.id}`)}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Contact Developer
                    </Button>
                  )}
                  
                  {!isBuyer && !session && (
                    <Button
                      className="bg-[#94FE0C] hover:bg-[#7FE00A] text-gray-900 font-semibold"
                      onClick={() => {
                        const callbackUrl = typeof window !== 'undefined' ? window.location.pathname : '/developers'
                        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
                      }}
                    >
                      Sign In to Book
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-6">
            {/* About Section */}
            {developer.bio && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">About</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{developer.bio}</p>
              </div>
            )}

            {/* Skills Section */}
            {developer.skills && developer.skills.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {developer.skills.map((skill: any) => (
                    <div
                      key={skill.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#94FE0C]/10 border border-[#94FE0C]/30 rounded-lg"
                    >
                      <span className="text-sm font-semibold text-gray-900">{skill.skill}</span>
                      {skill.level && (
                        <span className="text-xs text-gray-600 capitalize">({skill.level})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Professional Information */}
            {(developer.yearsOfExperience || developer.education || developer.languages || developer.certifications) && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Professional Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {developer.yearsOfExperience && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Years of Experience</p>
                      <p className="text-sm font-medium text-gray-900">{developer.yearsOfExperience} years</p>
                    </div>
                  )}
                  {developer.education && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Education</p>
                      <p className="text-sm font-medium text-gray-900">{developer.education}</p>
                    </div>
                  )}
                  {developer.languages && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Languages</p>
                      <p className="text-sm font-medium text-gray-900">{developer.languages}</p>
                    </div>
                  )}
                  {developer.certifications && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Certifications</p>
                      <p className="text-sm font-medium text-gray-900">{developer.certifications}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Professional Links */}
            {(developer.linkedinUrl || developer.githubUrl || developer.website) && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Professional Links</h2>
                <div className="flex flex-wrap gap-4">
                  {developer.linkedinUrl && (
                    <a
                      href={developer.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#94FE0C] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      LinkedIn
                    </a>
                  )}
                  {developer.githubUrl && (
                    <a
                      href={developer.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#94FE0C] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      GitHub
                    </a>
                  )}
                  {developer.website && (
                    <a
                      href={developer.website}
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
            {developer.locationLat && developer.locationLng && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Location</h2>
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <GoogleMapsLoader>
                    <LocationPicker
                      lat={parseFloat(developer.locationLat.toString())}
                      lng={parseFloat(developer.locationLng.toString())}
                      onLocationChange={() => {}}
                      height="300px"
                      zoom={12}
                      readOnly={true}
                      showControls={false}
                    />
                  </GoogleMapsLoader>
                </div>
              </div>
            )}

            {/* Reviews Section */}
            {developer.reviewsReceived && developer.reviewsReceived.length > 0 && (
              <div className="pt-6 border-t">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Reviews</h2>
                <div className="space-y-4">
                  {developer.reviewsReceived.map((review: any) => (
                    <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {review.reviewer?.name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-700">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* QR Code */}
            {profileUrl && (
              <div className="pt-6 border-t">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Share Profile</h3>
                <div className="flex flex-col items-center space-y-3">
                  <QRCode value={profileUrl} size={150} />
                  <div className="w-full max-w-md">
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
      </div>
    </div>
  )
}
