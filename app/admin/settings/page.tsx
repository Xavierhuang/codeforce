'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import toast from 'react-hot-toast'
import { Save, Settings, Megaphone, DollarSign, ShieldCheck, Lock, Mail, Users as UsersIcon, AlertCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    platformFeeRate: '0.15',
    platformName: 'Skillyy',
    supportEmail: 'support@skillyy.com',
    minTaskAmount: '5.00',
    maxTaskAmount: '10000.00',
    trustAndSupportFeeRate: '0.05',
    workerVerificationRequired: true,
    autoApprovePayouts: false,
    maintenanceMode: false,
    allowNewRegistrations: true,
    requireEmailVerification: false,
    announcement: '',
  })

  // Load settings on mount
  const { data: loadedSettings, mutate: mutateSettings } = useSWR(
    mounted && session?.user?.role === 'ADMIN' ? '/api/v1/admin/settings' : null,
    fetcher
  )

  useEffect(() => {
    if (loadedSettings) {
      setSettings({
        platformFeeRate: loadedSettings.platformFeeRate?.toString() || '0.15',
        platformName: loadedSettings.platformName || 'Skillyy',
        supportEmail: loadedSettings.supportEmail || 'support@skillyy.com',
        minTaskAmount: loadedSettings.minTaskAmount?.toString() || '5.00',
        maxTaskAmount: loadedSettings.maxTaskAmount?.toString() || '10000.00',
        trustAndSupportFeeRate: loadedSettings.trustAndSupportFeeRate?.toString() || '0.05',
        workerVerificationRequired: loadedSettings.workerVerificationRequired !== false,
        autoApprovePayouts: loadedSettings.autoApprovePayouts === true,
        maintenanceMode: loadedSettings.maintenanceMode === true,
        allowNewRegistrations: loadedSettings.allowNewRegistrations !== false,
        requireEmailVerification: loadedSettings.requireEmailVerification === true,
        announcement: '',
      })
    }
  }, [loadedSettings])

  useEffect(() => {
    setMounted(true)
    // Check hash on mount to set active tab
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '')
      if (hash && ['general', 'fees', 'security', 'broadcast'].includes(hash)) {
        setActiveTab(hash)
      }
    }
  }, [])

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.replace('#', '')
        if (hash && ['general', 'fees', 'security', 'broadcast'].includes(hash)) {
          setActiveTab(hash)
        }
      }
    }
    
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

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

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/v1/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformFeeRate: settings.platformFeeRate,
          platformName: settings.platformName,
          supportEmail: settings.supportEmail,
          minTaskAmount: settings.minTaskAmount,
          maxTaskAmount: settings.maxTaskAmount,
          trustAndSupportFeeRate: settings.trustAndSupportFeeRate,
          workerVerificationRequired: settings.workerVerificationRequired,
          autoApprovePayouts: settings.autoApprovePayouts,
          maintenanceMode: settings.maintenanceMode,
          allowNewRegistrations: settings.allowNewRegistrations,
          requireEmailVerification: settings.requireEmailVerification,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      toast.success('Settings saved successfully')
      mutateSettings()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBroadcast = async (targetRole?: 'CLIENT' | 'WORKER') => {
    if (!settings.announcement.trim()) {
      toast.error('Please enter a message')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/v1/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: settings.announcement.trim(),
          targetRole: targetRole || undefined,
        }),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to send broadcast'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      toast.success(`Broadcast sent to ${data.count} user(s)`)
      setSettings({ ...settings, announcement: '' })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send broadcast'
      toast.error(errorMessage)
      // Log error details without circular references
      if (error instanceof Error) {
        console.error('Broadcast error:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        })
      } else {
        console.error('Broadcast error:', String(error))
      }
    } finally {
      setIsSaving(false)
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
    <div className="container mx-auto px-4 md:px-8 py-4 md:py-8 max-w-6xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Platform Settings</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Configure platform-wide settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-col sm:grid sm:grid-cols-4 w-full gap-2">
          <TabsTrigger value="general" className="w-full text-sm">General</TabsTrigger>
          <TabsTrigger value="fees" className="w-full text-sm">Fees & Payments</TabsTrigger>
          <TabsTrigger value="security" className="w-full text-sm">Security & Access</TabsTrigger>
          <TabsTrigger value="broadcast" id="broadcast" className="w-full text-sm">Broadcast</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Settings className="w-5 h-5" />
                General Settings
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Basic platform configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="platform-name">Platform Name</Label>
                <Input
                  id="platform-name"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="support-email">Support Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Temporarily disable platform access for all users
                  </p>
                </div>
                <Switch
                  id="maintenance-mode"
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-registrations">Allow New Registrations</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable or disable new user sign-ups
                  </p>
                </div>
                <Switch
                  id="allow-registrations"
                  checked={settings.allowNewRegistrations}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowNewRegistrations: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fees & Payments */}
        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Fee Configuration
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Configure platform fees and payment settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="platform-fee">Platform Fee Rate (%)</Label>
                <Input
                  id="platform-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.platformFeeRate}
                  onChange={(e) => setSettings({ ...settings, platformFeeRate: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Platform fee percentage deducted from worker payout (e.g., 0.15 = 15%)
                </p>
              </div>
              <div>
                <Label htmlFor="trust-fee">Trust & Support Fee Rate (%)</Label>
                <Input
                  id="trust-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.trustAndSupportFeeRate}
                  onChange={(e) => setSettings({ ...settings, trustAndSupportFeeRate: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Trust and support fee added to buyer total (e.g., 0.05 = 5%)
                </p>
              </div>
              <div>
                <Label htmlFor="min-task-amount">Minimum Task Amount ($)</Label>
                <Input
                  id="min-task-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.minTaskAmount}
                  onChange={(e) => setSettings({ ...settings, minTaskAmount: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum amount allowed for task creation
                </p>
              </div>
              <div>
                <Label htmlFor="max-task-amount">Maximum Task Amount ($)</Label>
                <Input
                  id="max-task-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.maxTaskAmount}
                  onChange={(e) => setSettings({ ...settings, maxTaskAmount: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum amount allowed for task creation
                </p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-approve-payouts">Auto-Approve Payouts</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically approve payout requests without manual review
                  </p>
                </div>
                <Switch
                  id="auto-approve-payouts"
                  checked={settings.autoApprovePayouts}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoApprovePayouts: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security & Access */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Security & Access Control
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Configure security and access settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="worker-verification">Require Worker Verification</Label>
                  <p className="text-xs text-muted-foreground">
                    Workers must be verified before accepting tasks
                  </p>
                </div>
                <Switch
                  id="worker-verification"
                  checked={settings.workerVerificationRequired}
                  onCheckedChange={(checked) => setSettings({ ...settings, workerVerificationRequired: checked })}
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-verification">Require Email Verification</Label>
                  <p className="text-xs text-muted-foreground">
                    New users must verify their email before accessing the platform
                  </p>
                </div>
                <Switch
                  id="email-verification"
                  checked={settings.requireEmailVerification}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireEmailVerification: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Broadcast */}
        <TabsContent value="broadcast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Broadcast Message
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Send a message to all users or specific user roles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="announcement">Announcement Message</Label>
                <Textarea
                  id="announcement"
                  value={settings.announcement}
                  onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                  placeholder="Share updates with your users..."
                  className="mt-1"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This message will be sent as an in-app notification and email to your selected audience.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={(e) => {
                    e.preventDefault()
                    handleBroadcast()
                  }} 
                  disabled={isSaving || !settings.announcement.trim()} 
                  className="w-full sm:w-auto"
                  variant="default"
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  {isSaving ? 'Sending...' : 'Send to All Users'}
                </Button>
                <Button 
                  onClick={(e) => {
                    e.preventDefault()
                    handleBroadcast('WORKER')
                  }} 
                  disabled={isSaving || !settings.announcement.trim()} 
                  className="w-full sm:w-auto"
                  variant="outline"
                >
                  Send to Workers Only
                </Button>
                <Button 
                  onClick={(e) => {
                    e.preventDefault()
                    handleBroadcast('CLIENT')
                  }} 
                  disabled={isSaving || !settings.announcement.trim()} 
                  className="w-full sm:w-auto"
                  variant="outline"
                >
                  Send to Clients Only
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  )
}


