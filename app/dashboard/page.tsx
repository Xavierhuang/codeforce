'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { QRCode } from '@/components/QRCode'
import { Copy, ExternalLink } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { data: user } = useSWR(
    status === 'authenticated' ? '/api/v1/users/me' : null,
    fetcher
  )
  const [profileUrl, setProfileUrl] = useState('')
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    if (user?.slug) {
      setSlug(user.slug)
      if (typeof window !== 'undefined') {
        setProfileUrl(`${window.location.origin}/developers/${user.slug}`)
      }
    } else if (user?.role === 'WORKER' && user?.id) {
      // Generate slug from name or email if not set
      const baseSlug = user.name || user.email?.split('@')[0] || user.id
      setSlug(baseSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
    }
  }, [user])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading' || !session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  const isClient = user?.role === 'CLIENT'
  const isWorker = user?.role === 'WORKER'
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name || user?.email}!
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {isClient && (
          <Card>
            <CardHeader>
              <CardTitle>Post a Task</CardTitle>
              <CardDescription>
                Need help with a development task? Post it and receive offers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/tasks/new">
                <Button className="w-full">Create New Task</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {isWorker && (
          <Card>
            <CardHeader>
              <CardTitle>Browse Tasks</CardTitle>
              <CardDescription>
                Find tasks that match your skills and submit offers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/tasks">
                <Button className="w-full" variant="outline">
                  Browse Tasks
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>
              Manage your profile and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/settings">
              <Button className="w-full" variant="outline">
                Edit Profile
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>
              View your scheduled tasks and availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/calendar">
              <Button className="w-full" variant="outline">
                View Calendar
              </Button>
            </Link>
          </CardContent>
        </Card>

        {isWorker && (
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
              <CardDescription>
                Set your weekly schedule and available hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/availability">
                <Button className="w-full" variant="outline">
                  Set Availability
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {isWorker && slug && (
          <Card>
            <CardHeader>
              <CardTitle>Share Your Profile</CardTitle>
              <CardDescription>
                Share your unique profile link and QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <input
                  type="text"
                  value={profileUrl}
                  readOnly
                  className="flex-1 text-sm bg-transparent border-0 outline-none"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(profileUrl)
                    alert('Link copied to clipboard!')
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {profileUrl && (
                <div className="flex justify-center">
                  <QRCode value={profileUrl} size={150} />
                </div>
              )}
              <Link href={`/developers/${slug}`} target="_blank">
                <Button className="w-full" variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Public Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle>Admin Dashboard</CardTitle>
              <CardDescription>
                Manage users, tasks, and platform statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin">
                <Button className="w-full" variant="outline">
                  Go to Admin Panel
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {isWorker && user?.verificationStatus !== 'VERIFIED' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle>Verification Required</CardTitle>
            <CardDescription>
              Complete your verification to start receiving task invitations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/verify">
              <Button>Start Verification</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {isWorker && !user?.stripeAccountId && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Set Up Payments</CardTitle>
            <CardDescription>
              Connect your Stripe account to receive payouts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/settings">
              <Button variant="outline">Connect Stripe</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

