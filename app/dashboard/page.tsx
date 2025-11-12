'use client'

import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { 
  ShieldCheck, 
  CreditCard, 
  Search, 
  Star, 
  Wifi, 
  Building2, 
  MapPin,
  DollarSign,
  Briefcase,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { AvatarDisplay } from '@/components/AvatarDisplay'
import { useState } from 'react'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: user } = useSWR(
    session ? '/api/v1/users/me' : null,
    fetcher
  )

  const isWorker = user?.role === 'WORKER'
  const isClient = user?.role === 'CLIENT'

  // Fetch worker stats
  const { data: workerStats } = useSWR(
    isWorker ? '/api/v1/dashboard/stats' : null,
    fetcher
  )

  // For clients: fetch developers by category
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const { data: developers, error: developersError } = useSWR(
    isClient ? '/api/v1/search/developers' : null,
    fetcher
  )

  // Filter developers by category and search
  const filteredDevelopers = developers?.filter((dev: any) => {
    // If no category selected, show all developers
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
  }) || []

  // Group developers by category for display
  const developersByCategory: Record<string, any[]> = {}
  CATEGORIES.forEach(category => {
    developersByCategory[category] = developers?.filter((dev: any) => {
      return dev.skills?.some((skill: any) => 
        skill.skill.toLowerCase().includes(category.toLowerCase())
      ) || dev.bio?.toLowerCase().includes(category.toLowerCase())
    }) || []
  })

  const stats = workerStats?.stats || {}

  return (
    <div className="container mx-auto px-4 md:px-8 py-4 md:py-8 max-w-7xl" suppressHydrationWarning>
      <div className="mb-6 md:mb-8" suppressHydrationWarning>
        <h1 className="text-2xl md:text-4xl font-bold mb-2">
          Welcome back{user?.name ? `, ${user.name}` : ''}!
        </h1>
        <p className="text-muted-foreground text-sm md:text-lg">
          {user?.email}
        </p>
      </div>

      <div className="space-y-6">
        {/* Worker Dashboard Stats */}
        {isWorker && workerStats && (
          <>
            {/* Verification Required - Show First */}
            {user?.verificationStatus !== 'VERIFIED' && (
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
                    <span>{stats.totalTasks || 0} total</span>
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

            {/* Task Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-2 hover:shadow-md transition-all duration-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">In Progress</p>
                      <p className="text-2xl font-bold">{stats.inProgressTasks || 0}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-md transition-all duration-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Assigned</p>
                      <p className="text-2xl font-bold">{stats.assignedTasks || 0}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-md transition-all duration-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Pending Offers</p>
                      <p className="text-2xl font-bold">{stats.pendingOffers || 0}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-md transition-all duration-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Open Tasks</p>
                      <p className="text-2xl font-bold">{stats.openTasks || 0}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Search className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Completed Tasks */}
            {workerStats?.recentCompleted && workerStats.recentCompleted.length > 0 && (
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

        {isClient && (
          <>
            {/* Search Bar */}
            <Card className="border-2 hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search developers by name, skills, or expertise..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('')}
                className="touch-manipulation whitespace-nowrap"
              >
                All
              </Button>
              {CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="touch-manipulation whitespace-nowrap"
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Available Workers - Filtered Results */}
            {filteredDevelopers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Available Workers</h2>
                  <span className="text-sm text-muted-foreground">
                    {filteredDevelopers.length} developer{filteredDevelopers.length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {filteredDevelopers.map((developer: any) => (
                    <Card key={developer.id} className="border-2 hover:shadow-xl transition-all duration-300 cursor-pointer touch-manipulation group">
                      <Link href={`/developers/${developer.slug || developer.id}`} className="block">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full ring-2 ring-border group-hover:ring-primary transition-all overflow-hidden">
                                <AvatarDisplay
                                  src={developer.avatarUrl || undefined}
                                  alt={developer.name || 'Developer'}
                                  fallback={developer.name?.[0]?.toUpperCase() || developer.email?.[0]?.toUpperCase() || 'D'}
                                  className="w-full h-full"
                                  cropX={developer.avatarCropX ?? undefined}
                                  cropY={developer.avatarCropY ?? undefined}
                                  cropScale={developer.avatarCropScale ?? undefined}
                                  size={48}
                                />
                              </div>
                              <div>
                                <CardTitle className="text-lg group-hover:text-primary transition-colors">{developer.name || 'Developer'}</CardTitle>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span>
                                    {developer.rating?.toFixed(1) || '0.0'} ({developer.ratingCount || 0})
                                  </span>
                                </div>
                              </div>
                            </div>
                            {developer.verificationStatus === 'VERIFIED' && (
                              <Badge variant="default" className="shrink-0">Verified</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {developer.bio && (
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                              {developer.bio}
                            </p>
                          )}

                          {developer.skills && developer.skills.length > 0 && (
                            <div className="mb-4">
                              <div className="flex flex-wrap gap-1">
                                {developer.skills.slice(0, 3).map((skill: any) => (
                                  <Badge key={skill.id} variant="secondary" className="text-xs">
                                    {skill.skill}
                                  </Badge>
                                ))}
                                {developer.skills.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{developer.skills.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mb-4">
                            {developer.serviceType === 'VIRTUAL' || developer.serviceType === null ? (
                              <Badge variant="outline" className="text-xs">
                                <Wifi className="w-3 h-3 mr-1" />
                                Remote
                              </Badge>
                            ) : developer.serviceType === 'IN_PERSON' ? (
                              <Badge variant="outline" className="text-xs">
                                <Building2 className="w-3 h-3 mr-1" />
                                On-site
                              </Badge>
                            ) : (
                              <>
                                <Badge variant="outline" className="text-xs">
                                  <Wifi className="w-3 h-3 mr-1" />
                                  Remote
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  <Building2 className="w-3 h-3 mr-1" />
                                  On-site
                                </Badge>
                              </>
                            )}
                          </div>

                          {developer.hourlyRate && (
                            <div className="mb-4">
                              <p className="text-xs text-muted-foreground">Hourly Rate</p>
                              <p className="text-lg font-bold text-primary">
                                {formatCurrency(developer.hourlyRate)}/hour
                              </p>
                            </div>
                          )}

                          {developer.locationLat && developer.locationLng && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                              <MapPin className="w-4 h-4" />
                              <span>Available for in-person</span>
                              {developer.serviceRadiusMiles && (
                                <span>• {developer.serviceRadiusMiles} mi radius</span>
                              )}
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-4 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground">Tasks completed</p>
                              <p className="font-semibold">{developer._count?.tasksAssigned || 0}</p>
                            </div>
                            {developer.hourlyRate ? (
                              <Button 
                                size="sm" 
                                className="group-hover:scale-105 transition-transform"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  router.push(`/book/${developer.slug || developer.id}`)
                                }}
                              >
                                Book Now
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="group-hover:scale-105 transition-transform"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  router.push(`/developers/${developer.slug || developer.id}`)
                                }}
                              >
                                View Profile
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* No Results Message */}
            {filteredDevelopers.length === 0 && (searchQuery || selectedCategory) && developers && developers.length > 0 && (
              <Card className="border-2">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No developers found matching your search.</p>
                  <Button variant="outline" onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('')
                  }}>
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Developers Grid by Category */}
            {CATEGORIES.map((category) => {
              const categoryDevelopers = developersByCategory[category] || []
              if (categoryDevelopers.length === 0) return null

              return (
                <div key={category} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">{category}</h2>
                    <span className="text-sm text-muted-foreground">
                      {categoryDevelopers.length} developer{categoryDevelopers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {categoryDevelopers.slice(0, 6).map((developer: any) => (
                      <Card key={developer.id} className="border-2 hover:shadow-xl transition-all duration-300 cursor-pointer touch-manipulation group">
                        <Link href={`/book/${developer.slug || developer.id}`} className="block">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                {developer.avatarUrl ? (
                                  <img
                                    src={developer.avatarUrl}
                                    alt={developer.name || 'Developer'}
                                    className="w-12 h-12 rounded-full ring-2 ring-border group-hover:ring-primary transition-all"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border group-hover:ring-primary transition-all">
                                    <span className="text-lg font-semibold">
                                      {developer.name?.[0]?.toUpperCase() || developer.email[0].toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <CardTitle className="text-lg group-hover:text-primary transition-colors">{developer.name || 'Developer'}</CardTitle>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <span>
                                      {developer.rating?.toFixed(1) || '0.0'} ({developer.ratingCount || 0})
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {developer.verificationStatus === 'VERIFIED' && (
                                <Badge variant="default" className="shrink-0">Verified</Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            {developer.bio && (
                              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                {developer.bio}
                              </p>
                            )}

                            {developer.skills && developer.skills.length > 0 && (
                              <div className="mb-4">
                                <div className="flex flex-wrap gap-1">
                                  {developer.skills.slice(0, 3).map((skill: any) => (
                                    <Badge key={skill.id} variant="secondary" className="text-xs">
                                      {skill.skill}
                                    </Badge>
                                  ))}
                                  {developer.skills.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{developer.skills.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mb-4">
                              {developer.serviceType === 'VIRTUAL' || developer.serviceType === null ? (
                                <Badge variant="outline" className="text-xs">
                                  <Wifi className="w-3 h-3 mr-1" />
                                  Remote
                                </Badge>
                              ) : developer.serviceType === 'IN_PERSON' ? (
                                <Badge variant="outline" className="text-xs">
                                  <Building2 className="w-3 h-3 mr-1" />
                                  On-site
                                </Badge>
                              ) : (
                                <>
                                  <Badge variant="outline" className="text-xs">
                                    <Wifi className="w-3 h-3 mr-1" />
                                    Remote
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    <Building2 className="w-3 h-3 mr-1" />
                                    On-site
                                  </Badge>
                                </>
                              )}
                            </div>

                            {developer.hourlyRate && (
                              <div className="mb-4">
                                <p className="text-xs text-muted-foreground">Hourly Rate</p>
                                <p className="text-lg font-bold text-primary">
                                  {formatCurrency(developer.hourlyRate)}/hour
                                </p>
                              </div>
                            )}

                            {developer.locationLat && developer.locationLng && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                                <MapPin className="w-4 h-4" />
                                <span>Available for in-person</span>
                                {developer.serviceRadiusMiles && (
                                  <span>• {developer.serviceRadiusMiles} mi radius</span>
                                )}
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t">
                              <div>
                                <p className="text-xs text-muted-foreground">Tasks completed</p>
                                <p className="font-semibold">{developer._count?.tasksAssigned || 0}</p>
                              </div>
                              {developer.hourlyRate ? (
                                <Button 
                                  size="sm" 
                                  className="group-hover:scale-105 transition-transform"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    router.push(`/book/${developer.slug || developer.id}`)
                                  }}
                                >
                                  Book Now
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="group-hover:scale-105 transition-transform"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    router.push(`/developers/${developer.slug || developer.id}`)
                                  }}
                                >
                                  View Profile
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Link>
                      </Card>
                    ))}
                  </div>
                  {categoryDevelopers.length > 6 && (
                    <div className="text-center">
                      <Link href={`/developers?category=${encodeURIComponent(category)}`}>
                        <Button variant="outline">
                          View All {categoryDevelopers.length} Developers
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}

            {developersError && (
              <Card className="border-2">
                <CardContent className="py-12 text-center">
                  <p className="text-red-600 mb-2">Error loading developers</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {developersError?.message || 'Please try refreshing the page'}
                  </p>
                  <Link href="/developers">
                    <Button>Browse All Developers</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
            {!developersError && (!developers || developers.length === 0) && (
              <Card className="border-2">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No developers found.</p>
                  <Link href="/developers">
                    <Button>Browse All Developers</Button>
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
