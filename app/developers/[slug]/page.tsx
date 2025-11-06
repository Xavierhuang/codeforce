'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, CheckCircle, Calendar, Mail } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { QRCode } from '@/components/QRCode'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DeveloperProfilePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const [profileUrl, setProfileUrl] = useState('')

  const { data: developer, isLoading } = useSWR(
    slug ? `/api/v1/developers/${slug}` : null,
    fetcher
  )

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setProfileUrl(window.location.href)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!developer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Developer profile not found
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/developers" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Developers
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Profile */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {developer.avatarUrl ? (
                  <img
                    src={developer.avatarUrl}
                    alt={developer.name || 'Developer'}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold">
                    {developer.name?.charAt(0).toUpperCase() || 'D'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold">{developer.name || 'Developer'}</h1>
                    {developer.verificationStatus === 'VERIFIED' && (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-foreground">
                        {developer.rating.toFixed(1)}
                      </span>
                      <span>({developer._count?.reviewsReceived || 0} reviews)</span>
                    </div>
                    <span>•</span>
                    <span>{developer._count?.tasksAssigned || 0} tasks completed</span>
                  </div>
                  {developer.bio && (
                    <p className="text-muted-foreground mb-4">{developer.bio}</p>
                  )}
                  {developer.locationLat && developer.locationLng && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>Available for in-person</span>
                      {developer.serviceRadiusMiles && (
                        <span>• {developer.serviceRadiusMiles} mi radius</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          {developer.skills && developer.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {developer.skills.map((skill: any) => (
                    <Badge key={skill.id} variant="secondary" className="text-sm py-1 px-3">
                      {skill.skill}
                      {skill.level && (
                        <span className="ml-2 text-xs opacity-75">({skill.level})</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          {developer.reviewsReceived && developer.reviewsReceived.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      <span className="text-sm font-semibold">
                        {review.reviewer.name || 'Anonymous'}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Booking & QR Code */}
        <div className="space-y-6">
          {/* Book Developer */}
          <Card>
            <CardHeader>
              <CardTitle>Book This Developer</CardTitle>
              <CardDescription>
                Create a task and this developer will be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                onClick={() => router.push(`/tasks/new?developer=${developer.id}`)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Create Task
              </Button>
              <div className="text-xs text-muted-foreground text-center">
                Or browse{' '}
                <Link href="/tasks" className="text-primary hover:underline">
                  all available tasks
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card>
            <CardHeader>
              <CardTitle>Share Profile</CardTitle>
              <CardDescription>Scan QR code to view this profile</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              {profileUrl && (
                <>
                  <QRCode value={profileUrl} size={180} />
                  <div className="w-full">
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <input
                        type="text"
                        value={profileUrl}
                        readOnly
                        className="flex-1 text-xs bg-transparent border-0 outline-none"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(profileUrl)
                          alert('Link copied to clipboard!')
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

