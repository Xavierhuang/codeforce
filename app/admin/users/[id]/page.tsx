'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  User,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  DollarSign,
  ClipboardList,
  Star,
  MessageSquare,
  TrendingUp,
  Wallet,
  FileText,
  Clock,
  AlertTriangle,
  Ban,
  ArrowLeft,
  Eye,
  CheckCircle,
  XCircle,
  Activity,
  CreditCard,
  Briefcase,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.status}`)
  }
  return res.json()
}

export default function UserDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const [mounted, setMounted] = useState(false)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendDuration, setSuspendDuration] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: userData, error, mutate } = useSWR(
    status === 'authenticated' && userId ? `/api/v1/admin/users/${userId}` : null,
    fetcher
  )

  const user = userData?.user

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

  const handleSuspendUser = async () => {
    if (!suspendReason.trim()) {
      toast.error('Please provide a reason for suspension')
      return
    }

    try {
      const response = await fetch('/api/v1/admin/users/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          reason: suspendReason,
          duration: suspendDuration || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to suspend user')
      }

      toast.success('User suspended successfully')
      setShowSuspendDialog(false)
      setSuspendReason('')
      setSuspendDuration('')
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to suspend user')
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

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center text-destructive">
          <p className="mb-4">Error loading user: {error.message}</p>
          <Button onClick={() => router.push('/admin/users')}>Back to Users</Button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="mb-4">User not found</p>
          <Button onClick={() => router.push('/admin/users')}>Back to Users</Button>
        </div>
      </div>
    )
  }

  const isWorkerUser = user.role === 'WORKER'
  const memberSince = user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : null
  const formattedBirthdate = (user as any).birthdate ? format(new Date((user as any).birthdate), 'MMM d, yyyy') : null
  const workerSkills = isWorkerUser ? ((user as any).skills || []) : []
  const socialLinks = [
    { label: 'Website', value: user.website },
    { label: 'LinkedIn', value: user.linkedinUrl },
    { label: 'GitHub', value: user.githubUrl },
    { label: 'Twitter', value: (user as any).twitterUrl },
    { label: 'Instagram', value: (user as any).instagramUrl },
    { label: 'Scheduling', value: (user as any).schedulingUrl },
  ].filter((link) => !!link.value)
  const hasProfessionalDetails = Boolean(
    (user as any).gender ||
    (user as any).birthdate ||
    (user as any).schedulingUrl ||
    (user as any).referralSource
  )
  const hasSocialLinks = socialLinks.length > 0

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/users')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{user.name || 'No name'}</h1>
            <p className="text-sm md:text-base text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
            {user.role}
          </Badge>
          {user.role === 'WORKER' && (
            <Badge
              variant={
                user.verificationStatus === 'VERIFIED'
                  ? 'default'
                  : user.verificationStatus === 'REJECTED'
                  ? 'destructive'
                  : 'outline'
              }
            >
              {user.verificationStatus}
            </Badge>
          )}
          {user.role !== 'ADMIN' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowSuspendDialog(true)}
            >
              <Ban className="h-4 w-4 mr-2" />
              Suspend
            </Button>
          )}
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Tasks Posted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user._count?.tasksPosted || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Tasks Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user._count?.tasksAssigned || 0}</div>
          </CardContent>
        </Card>

        {user.role === 'WORKER' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(user.totalEarnings || 0)}</div>
            </CardContent>
          </Card>
        )}

        {user.role === 'CLIENT' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(user.totalSpent || 0)}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.averageRating ? user.averageRating.toFixed(1) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {user._count?.reviewsReceived || 0} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap gap-2 justify-start">
          <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="text-sm">Tasks</TabsTrigger>
          <TabsTrigger value="transactions" className="text-sm">Transactions</TabsTrigger>
          <TabsTrigger value="reviews" className="text-sm">Reviews</TabsTrigger>
          {user.role === 'WORKER' && (
            <TabsTrigger value="time-reports" className="text-sm">Time Reports</TabsTrigger>
          )}
          {user.role === 'WORKER' && (
            <TabsTrigger value="payouts" className="text-sm">Payouts</TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">{user.name || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{user.phone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Joined</p>
                    <p className="text-sm text-muted-foreground">
                      {memberSince || format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm">Tasks Posted</span>
                  <Badge variant="secondary">{user._count?.tasksPosted || 0}</Badge>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm">Tasks Assigned</span>
                  <Badge variant="secondary">{user._count?.tasksAssigned || 0}</Badge>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm">Reviews Received</span>
                  <Badge variant="secondary">{user._count?.reviewsReceived || 0}</Badge>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm">Reviews Given</span>
                  <Badge variant="secondary">{user._count?.reviewsGiven || 0}</Badge>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm">Offers Made</span>
                  <Badge variant="secondary">{user._count?.offers || 0}</Badge>
                </div>
                {isWorkerUser && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm">Time Reports</span>
                    <Badge variant="secondary">{user._count?.timeReports || 0}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {user.bio && (
              <Card className="lg:col-span-2 h-full">
                <CardHeader>
                  <CardTitle>Bio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-[260px] overflow-y-auto pr-2">
                    {user.bio}
                  </p>
                </CardContent>
              </Card>
            )}
            <Card className={`h-full ${user.bio ? '' : 'lg:col-span-3'}`}>
              <CardHeader className="pb-3">
                <CardTitle>{isWorkerUser ? 'Expert Snapshot' : 'Client Snapshot'}</CardTitle>
                <CardDescription>Quick reference for admins</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium">{user.role}</span>
                </div>
                {memberSince && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="font-medium">{memberSince}</span>
                  </div>
                )}
                {isWorkerUser ? (
                  <>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-muted-foreground">Verification</span>
                      <span className="font-medium">{user.verificationStatus}</span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-muted-foreground">Badge Tier</span>
                      <span className="font-medium">{user.badgeTier || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-muted-foreground">Hourly Rate</span>
                      <span className="font-medium">
                        {user.hourlyRate ? `${formatCurrency(user.hourlyRate)}/hr` : 'Not set'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-muted-foreground">Total Earnings</span>
                      <span className="font-medium">{formatCurrency(user.totalEarnings || 0)}</span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-muted-foreground">Wallet Balance</span>
                      <span className="font-medium">{formatCurrency(user.walletBalance || 0)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-muted-foreground">Total Spent</span>
                      <span className="font-medium">{formatCurrency(user.totalSpent || 0)}</span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-muted-foreground">Tasks Posted</span>
                      <span className="font-medium">{user._count?.tasksPosted || 0}</span>
                    </div>
                  </>
                )}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-muted-foreground">Average Rating</span>
                  <span className="font-medium">
                    {user.averageRating ? user.averageRating.toFixed(1) : 'No reviews'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {isWorkerUser && workerSkills.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Skills & Services</CardTitle>
                <CardDescription>Expertise shared on profile</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {workerSkills.map((skill: any) => (
                    <Badge key={skill.id} variant="outline" className="text-xs px-2 py-1">
                      {skill.skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(hasProfessionalDetails || hasSocialLinks) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {hasProfessionalDetails && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Profile Details</CardTitle>
                    <CardDescription>Additional context provided by the user</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {(user as any).gender && (
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">Gender</span>
                        <span className="font-medium">{(user as any).gender}</span>
                      </div>
                    )}
                    {formattedBirthdate && (
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">Birthdate</span>
                        <span className="font-medium">{formattedBirthdate}</span>
                      </div>
                    )}
                    {(user as any).schedulingUrl && (
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">Scheduling</span>
                        <a
                          href={(user as any).schedulingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          View link
                        </a>
                      </div>
                    )}
                    {(user as any).referralSource && (
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">Referral Source</span>
                        <span className="font-medium">{(user as any).referralSource}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              {hasSocialLinks && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>External Links</CardTitle>
                    <CardDescription>Useful links shared by the user</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {socialLinks.map((link) => (
                        <div key={link.label} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-muted-foreground">{link.label}</span>
                          <a
                            href={link.value as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            Open
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {user.role === 'CLIENT' && (
              <Card>
                <CardHeader>
                  <CardTitle>Tasks Posted ({user.tasksPosted?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {user.tasksPosted && user.tasksPosted.length > 0 ? (
                    <div className="space-y-3">
                      {user.tasksPosted.map((task: any) => (
                        <Link key={task.id} href={`/admin/tasks?taskId=${task.id}`}>
                          <div className="p-3 border rounded-lg hover:bg-accent transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{task.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {task.worker?.name || 'Unassigned'} • {format(new Date(task.createdAt), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <Badge variant={task.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                {task.status}
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tasks posted</p>
                  )}
                </CardContent>
              </Card>
            )}

            {user.role === 'WORKER' && (
              <Card>
                <CardHeader>
                  <CardTitle>Tasks Assigned ({user.tasksAssigned?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {user.tasksAssigned && user.tasksAssigned.length > 0 ? (
                    <div className="space-y-3">
                      {user.tasksAssigned.map((task: any) => (
                        <Link key={task.id} href={`/admin/tasks?taskId=${task.id}`}>
                          <div className="p-3 border rounded-lg hover:bg-accent transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{task.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {task.client?.name} • {format(new Date(task.createdAt), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <Badge variant={task.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                {task.status}
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tasks assigned</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {user.role === 'CLIENT' && (
              <Card>
                <CardHeader>
                  <CardTitle>Purchase History ({user.buyerTransactions?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {user.buyerTransactions && user.buyerTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {user.buyerTransactions.map((transaction: any) => (
                        <div key={transaction.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{transaction.task?.title || 'N/A'}</p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.worker?.name} • {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                              <Badge variant={transaction.status === 'CAPTURED' ? 'default' : 'secondary'}>
                                {transaction.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No transactions</p>
                  )}
                </CardContent>
              </Card>
            )}

            {user.role === 'WORKER' && (
              <Card>
                <CardHeader>
                  <CardTitle>Earnings History ({user.workerTransactions?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {user.workerTransactions && user.workerTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {user.workerTransactions.map((transaction: any) => (
                        <div key={transaction.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{transaction.task?.title || 'N/A'}</p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.buyer?.name} • {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(transaction.workerPayout || 0)}</p>
                              <Badge variant={transaction.status === 'CAPTURED' ? 'default' : 'secondary'}>
                                {transaction.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No earnings</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Reviews Received ({user.reviewsReceived?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {user.reviewsReceived && user.reviewsReceived.length > 0 ? (
                  <div className="space-y-3">
                    {user.reviewsReceived.map((review: any) => (
                      <div key={review.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{review.reviewer?.name}</p>
                            {review.taskId && (
                              <p className="text-sm text-muted-foreground">Task: {review.taskId}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(review.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No reviews received</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reviews Given ({user.reviewsGiven?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {user.reviewsGiven && user.reviewsGiven.length > 0 ? (
                  <div className="space-y-3">
                    {user.reviewsGiven.map((review: any) => (
                      <div key={review.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{review.targetUser?.name}</p>
                            {review.taskId && (
                              <p className="text-sm text-muted-foreground">Task: {review.taskId}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(review.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No reviews given</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Time Reports Tab (Worker only) */}
        {user.role === 'WORKER' && (
          <TabsContent value="time-reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Time Reports ({user.timeReports?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {user.timeReports && user.timeReports.length > 0 ? (
                  <div className="space-y-3">
                    {user.timeReports.map((report: any) => (
                      <div key={report.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{report.task?.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {report.hoursWorked} hours • {format(new Date(report.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Badge
                            variant={
                              report.status === 'APPROVED'
                                ? 'default'
                                : report.status === 'REJECTED'
                                ? 'destructive'
                                : report.status === 'DISPUTED'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {report.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No time reports</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Payouts Tab (Worker only) */}
        {user.role === 'WORKER' && (
          <TabsContent value="payouts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payout Requests ({user.payoutRequests?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {user.payoutRequests && user.payoutRequests.length > 0 ? (
                  <div className="space-y-3">
                    {user.payoutRequests.map((payout: any) => (
                      <div key={payout.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{formatCurrency(payout.amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payout.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Badge
                            variant={
                              payout.status === 'APPROVED'
                                ? 'default'
                                : payout.status === 'REJECTED'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {payout.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No payout requests</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Suspend User Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Suspend user account temporarily or permanently
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="suspend-reason">Reason for Suspension *</Label>
              <Textarea
                id="suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g., Violation of terms of service, inappropriate behavior, etc."
                className="mt-1 min-h-[100px]"
              />
            </div>
            <div>
              <Label htmlFor="suspend-duration">Duration</Label>
              <Select value={suspendDuration || undefined} onValueChange={(value) => setSuspendDuration(value === 'permanent' ? '' : value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Permanent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowSuspendDialog(false)
              setSuspendReason('')
              setSuspendDuration('')
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspendUser}
              disabled={!suspendReason.trim()}
            >
              Suspend User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

