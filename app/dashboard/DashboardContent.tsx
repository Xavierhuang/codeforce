'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { 
  ShieldCheck, 
  CreditCard, 
  Search, 
  Star, 
  DollarSign,
  Briefcase,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wallet,
  ArrowUpRight,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

const CATEGORIES = [
  'Bug Fix',
  'Web Development',
  'Mobile App',
  'DevOps',
  'Database',
  'API Integration',
  'UI/UX Design',
  'Code Review',
  'Other',
]

interface DashboardContentProps {
  user: {
    id: string
    name: string | null
    email: string
    role: 'CLIENT' | 'WORKER' | 'ADMIN'
    verificationStatus: string | null
    stripeAccountId: string | null
  }
  workerStats?: {
    stats: {
      walletBalance: number
      totalEarnings: number
      completedTasks: number
      inProgressTasks: number
      assignedTasks: number
      pendingOffers: number
      openTasks: number
      averageRating: number
      ratingCount: number
      thisMonthEarnings: number
      thisMonthCompleted: number
      pendingPayoutAmount: number
    }
    recentCompleted: Array<{
      id: string
      title: string
      price: number
      completedAt: Date | null
    }>
  } | null
  developers?: Array<any>
}

export function DashboardContent({ user, workerStats, developers = [] }: DashboardContentProps) {
  const isWorker = user.role === 'WORKER'
  const isClient = user.role === 'CLIENT'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Bug Fix')

  // Filter experts by category and search
  const filteredDevelopers = developers.filter((dev: any) => {
    const categoryMatch = !selectedCategory || 
      dev.skills?.some((skill: any) => 
        skill.skill.toLowerCase().includes(selectedCategory.toLowerCase())
      ) ||
      dev.bio?.toLowerCase().includes(selectedCategory.toLowerCase())

    const searchMatch = !searchQuery ||
      dev.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dev.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dev.skills?.some((skill: any) => 
        skill.skill.toLowerCase().includes(searchQuery.toLowerCase())
      )

    return categoryMatch && searchMatch
  })

  // Group experts by category for display
  const developersByCategory: Record<string, any[]> = {}
  CATEGORIES.forEach(category => {
    developersByCategory[category] = developers.filter((dev: any) => {
      return dev.skills?.some((skill: any) => 
        skill.skill.toLowerCase().includes(category.toLowerCase())
      ) || dev.bio?.toLowerCase().includes(category.toLowerCase())
    })
  })

  const stats = workerStats?.stats || {
    walletBalance: 0,
    totalEarnings: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    assignedTasks: 0,
    pendingOffers: 0,
    openTasks: 0,
    averageRating: 0,
    ratingCount: 0,
    thisMonthEarnings: 0,
    thisMonthCompleted: 0,
    pendingPayoutAmount: 0,
  }

  return (
    <div className="p-4 md:p-8" suppressHydrationWarning>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-4xl font-bold mb-2">
          Welcome back{user.name ? `, ${user.name}` : ''}!
        </h1>
        <p className="text-muted-foreground text-sm md:text-lg">
          {user.email}
        </p>
      </div>

      <div className="space-y-6">
        {/* Worker Dashboard Stats */}
        {isWorker && workerStats && (
          <>
            {/* Verification Required - Show First */}
            {user.verificationStatus !== 'VERIFIED' && (
              <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/20 dark:to-yellow-900/10 hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">Verification Required</CardTitle>
                      <CardDescription>
                        Complete your verification to start receiving bookings.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/verify">
                    <Button className="w-full">Start Verification</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Wallet Balance Card */}
              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle>
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary mb-1">
                    {formatCurrency(stats.walletBalance || 0)}
                  </div>
                  {stats.pendingPayoutAmount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(stats.pendingPayoutAmount)} pending
                    </p>
                  )}
                </CardContent>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
              </Card>

              {/* Total Earnings Card */}
              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                    {formatCurrency(stats.totalEarnings || 0)}
                  </div>
                  {stats.thisMonthEarnings > 0 && (
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <TrendingUp className="h-3 w-3" />
                      <span>{formatCurrency(stats.thisMonthEarnings)} this month</span>
                    </div>
                  )}
                </CardContent>
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16" />
              </Card>

              {/* Tasks Completed Card */}
              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Tasks Completed</CardTitle>
                    <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {stats.completedTasks || 0}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{stats.completedTasks || 0} total</span>
                    {stats.thisMonthCompleted > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600 dark:text-blue-400">{stats.thisMonthCompleted} this month</span>
                      </>
                    )}
                  </div>
                </CardContent>
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16" />
              </Card>

              {/* Rating Card */}
              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/20 dark:to-yellow-900/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
                    <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400 fill-yellow-400 dark:fill-yellow-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
                    </span>
                    <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400 fill-yellow-400 dark:fill-yellow-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.ratingCount || 0} review{stats.ratingCount !== 1 ? 's' : ''}
                  </p>
                </CardContent>
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -mr-16 -mt-16" />
              </Card>
            </div>

            {/* Recent Completed Tasks */}
            {workerStats.recentCompleted && workerStats.recentCompleted.length > 0 && (
              <Card className="border-2 hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Completed Tasks</CardTitle>
                      <CardDescription>Your latest completed work</CardDescription>
                    </div>
                    <Link href="/dashboard/tasks">
                      <Button variant="outline" size="sm">
                        View All
                        <ArrowUpRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workerStats.recentCompleted.map((task: any) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{task.title}</p>
                          {task.completedAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Completed {format(new Date(task.completedAt), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                        {task.price && (
                          <div className="ml-4 text-right">
                            <p className="font-semibold text-primary">
                              {formatCurrency(task.price)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.pendingPayoutAmount > 0 && (
                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">Pending Payout</CardTitle>
                        <CardDescription>
                          {formatCurrency(stats.pendingPayoutAmount)} awaiting approval
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link href="/dashboard/wallet">
                      <Button variant="outline" className="w-full">View Wallet</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Client Dashboard */}
        {isClient && (
          <>
            {/* Search Bar */}
            <Card className="border-2 hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search experts by name, skills, or expertise..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Category Filter */}
            <Card className="border-2 hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Experts by Category */}
            {Object.entries(developersByCategory).map(([category, categoryDevelopers]) => {
              if (categoryDevelopers.length === 0) return null
              
              return (
                <div key={category} className="space-y-4">
                  <h2 className="text-2xl font-bold">{category}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryDevelopers.slice(0, 6).map((dev: any) => (
                      <Card key={dev.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4 mb-4">
                            {dev.avatarUrl ? (
                              <img
                                src={dev.avatarUrl}
                                alt={dev.name || 'Expert'}
                                className="w-16 h-16 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold">
                                {dev.name?.charAt(0).toUpperCase() || 'D'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg truncate">{dev.name || 'Expert'}</h3>
                              <div className="flex items-center gap-1 text-sm">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold">{dev.rating?.toFixed(1) || '0.0'}</span>
                              </div>
                            </div>
                          </div>
                          <Link href={`/profile/${dev.slug || dev.id}`}>
                            <Button variant="outline" className="w-full">
                              View Profile
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {categoryDevelopers.length > 6 && (
                    <div className="text-center">
                      <Link href={`/profile?category=${encodeURIComponent(category)}`}>
                        <Button variant="outline">
                          View All {categoryDevelopers.length} Experts
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}

            {(!developers || developers.length === 0) && (
              <Card className="border-2">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No experts found.</p>
                  <Link href="/profile">
                    <Button>Browse All Experts</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}



