'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { User, Mail, Phone, CreditCard, ShieldCheck, Save, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: user, mutate } = useSWR(
    session ? '/api/v1/users/me' : null,
    fetcher
  )

  const [isSaving, setIsSaving] = useState(false)
  const [isConnectingStripe, setIsConnectingStripe] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    slug: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        slug: user.slug || '',
      })
    }
  }, [user])

  useEffect(() => {
    // Handle Stripe redirect
    if (searchParams.get('success') === 'true') {
      toast.success('Stripe account connected successfully!')
      mutate()
    }
    if (searchParams.get('refresh') === 'true') {
      toast('Please complete your Stripe onboarding', { icon: 'ℹ️' })
    }
  }, [searchParams, mutate])

  const isWorker = user?.role === 'WORKER'

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update profile')
      }

      toast.success('Profile updated successfully!')
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConnectStripe = async () => {
    if (!isWorker) return

    setIsConnectingStripe(true)
    try {
      const response = await fetch('/api/v1/stripe/create-account', {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create Stripe account')
      }

      const data = await response.json()
      // Redirect to Stripe onboarding
      window.location.href = data.onboardingUrl
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect Stripe')
      setIsConnectingStripe(false)
    }
  }

  const handleStripeDashboard = async () => {
    if (!user?.stripeAccountId) return

    try {
      const response = await fetch('/api/v1/stripe/account-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: user.stripeAccountId }),
      })

      if (!response.ok) {
        throw new Error('Failed to get Stripe dashboard link')
      }

      const data = await response.json()
      window.open(data.url, '_blank')
    } catch (error: any) {
      toast.error(error.message || 'Failed to open Stripe dashboard')
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          {isWorker && <TabsTrigger value="payments">Payments</TabsTrigger>}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your public profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="mt-1 bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1"
                />
              </div>

              {isWorker && (
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell clients about your experience and expertise..."
                    className="mt-1 min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This appears on your public profile
                  </p>
                </div>
              )}

              {isWorker && (
                <div>
                  <Label htmlFor="slug">Profile URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/developers/
                    </span>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                      placeholder="your-username"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your public profile URL (letters, numbers, and hyphens only)
                  </p>
                </div>
              )}

              <Button onClick={handleSaveProfile} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <Badge variant="outline">Verified</Badge>
              </div>

              {isWorker && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Verification Status</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.verificationStatus === 'VERIFIED' 
                        ? 'Your profile is verified' 
                        : user?.verificationStatus === 'PENDING'
                        ? 'Verification pending review'
                        : 'Not verified'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.verificationStatus === 'VERIFIED' ? (
                      <Badge className="bg-green-500">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/dashboard/verify')}
                      >
                        Verify Now
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 border rounded-lg bg-destructive/5">
                <p className="font-medium text-destructive mb-2">Danger Zone</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="destructive" size="sm" disabled>
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab (Workers Only) */}
        {isWorker && (
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment Settings</CardTitle>
                <CardDescription>
                  Connect your Stripe account to receive payouts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user?.stripeAccountId ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">Stripe Connected</p>
                          <p className="text-sm text-muted-foreground">
                            Your Stripe account is connected and ready to receive payouts
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-500">Connected</Badge>
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleStripeDashboard}
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Stripe Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-yellow-50">
                      <div className="flex items-center gap-3 mb-2">
                        <CreditCard className="w-5 h-5 text-yellow-600" />
                        <p className="font-medium">Stripe Not Connected</p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Connect your Stripe account to receive payouts from completed tasks.
                        You'll be redirected to Stripe to complete the onboarding process.
                      </p>
                      <Button
                        onClick={handleConnectStripe}
                        disabled={isConnectingStripe}
                        className="w-full"
                      >
                        {isConnectingStripe ? 'Connecting...' : 'Connect Stripe Account'}
                      </Button>
                    </div>
                  </div>
                )}

                {user?.walletBalance !== undefined && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Wallet Balance</p>
                        <p className="text-sm text-muted-foreground">
                          Available for payout
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(user.walletBalance)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => router.push('/dashboard/wallet')}
                    >
                      View Wallet
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

