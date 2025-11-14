'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Star, CheckCircle, ChevronRight } from 'lucide-react'
import useSWR from 'swr'
import { formatCurrency } from '@/lib/utils'
import { useMemo, useState } from 'react'
import { TaskerBadge } from '@/components/TaskerBadge'
import { TaskerBadgeTier } from '@/lib/badge-tier'

// Force dynamic rendering to prevent static caching
export const dynamic = 'force-dynamic'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const POPULAR_CATEGORIES = [
  'Bug Fix',
  'Web Development',
  'Mobile App',
  'DevOps',
  'API Integration',
  'UI/UX Design',
  'Database',
  'Code Review'
]

export default function Home() {
  const { data: session } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  
  // Fetch recommended experts
  const { data: recommendedTaskers } = useSWR(
    '/api/v1/search/developers?limit=6&verificationStatus=VERIFIED',
    fetcher
  )

  const verifiedRecommendedTaskers = useMemo(
    () => (recommendedTaskers || []).filter((tasker: any) => tasker.verificationStatus === 'VERIFIED'),
    [recommendedTaskers]
  )

  const handleGetStarted = () => {
    if (session) {
      router.push('/dashboard')
    } else {
      router.push('/auth/signup')
    }
  }

  const handleBecomeBuyer = () => {
    window.location.href = '/auth/signup?role=CLIENT'
  }

  const handleBecomeExpert = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    console.log('Become Expert clicked - navigating to signup')
    window.location.href = '/auth/signup?role=WORKER'
  }

  return (
    <div className="min-h-screen bg-white" suppressHydrationWarning>
      {/* Header is handled by UnifiedHeader in root layout */}

      {/* Hero Section */}
      <main className="container mx-auto px-4" suppressHydrationWarning>
        <div className="max-w-4xl mx-auto py-12 md:py-20" suppressHydrationWarning>
          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-center mb-4 md:mb-6 leading-tight px-2">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Hire skilled experts</span>
            <br />
            <span className="text-foreground">for anything on your to-do list.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base md:text-xl text-center text-muted-foreground mb-8 md:mb-12 max-w-2xl mx-auto px-4">
            Search for skilled experts, browse their profiles, and book directly. 
            No task posting needed—just find, book, and get your work done.
          </p>

          {/* Book Your Next Task Section - TaskRabbit Style */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
              Book Your Next Task
            </h2>
            
            {/* Large Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-muted-foreground w-6 h-6" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Describe one task, e.g. fix the hole in my wall"
                className="w-full pl-14 pr-4 py-6 text-lg rounded-lg border-2 focus:border-primary h-16"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    router.push(`/experts?search=${encodeURIComponent(searchQuery.trim())}`)
                  }
                }}
              />
            </div>
            
            {/* Popular Categories - TaskRabbit Style */}
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              {POPULAR_CATEGORIES.map((cat) => (
                <Link 
                  key={cat} 
                  href={`/experts?category=${encodeURIComponent(cat)}`}
                  className="px-5 py-2.5 text-sm font-medium border-2 border-primary/30 hover:border-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-all"
                >
                  {cat}
                </Link>
              ))}
              <Link 
                href="/experts"
                className="px-5 py-2.5 text-sm font-medium border-2 border-primary/30 hover:border-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-all"
              >
                See More
              </Link>
            </div>
          </div>

          {/* Experts Recommended for You */}
          {verifiedRecommendedTaskers.length > 0 && (
            <section className="max-w-7xl mx-auto mb-16" suppressHydrationWarning>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold">
                  Experts recommended for you
                </h2>
                <Link 
                  href="/experts"
                  className="text-primary hover:underline flex items-center gap-1 text-sm md:text-base"
                >
                  See all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {verifiedRecommendedTaskers.slice(0, 6).map((tasker: any) => {
                  const topServices = tasker.workerServices?.slice(0, 3) || []
                  const completedTasks = tasker._count?.tasksAssigned || 0
                  const rating = tasker.rating || 0
                  const reviewCount = tasker._count?.reviewsReceived || 0
                  
                  return (
                    <Card key={tasker.id} className="transition-shadow hover:shadow-lg h-full">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="text-xs text-muted-foreground mb-3">Verified Expert</div>

                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                            {tasker.avatarUrl ? (
                              <img
                                src={tasker.avatarUrl}
                                alt={tasker.name || 'Expert'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-xl font-semibold">
                                {tasker.name?.charAt(0).toUpperCase() || 'E'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg truncate">
                                {tasker.name || 'Expert'}
                              </h3>
                              {tasker.badgeTier && tasker.badgeTier !== 'STARTER' && (
                                <TaskerBadge
                                  tier={tasker.badgeTier as TaskerBadgeTier}
                                  size="sm"
                                />
                              )}
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {tasker.bio || 'Experienced expert on Skillyy ready to help with your project.'}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                {completedTasks} jobs
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {rating.toFixed(1)} ({reviewCount})
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex-1 flex flex-col">
                          <div className="text-xs font-semibold text-muted-foreground mb-2">
                            Top Skills
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
                            {topServices.length > 0
                              ? topServices.map((service: any) => (
                                  <Link
                                    key={service.id}
                                    href={`/profile/${tasker.slug || tasker.id}/service/${encodeURIComponent(service.skillName)}`}
                                    className="px-3 py-1.5 text-xs font-medium border border-primary/30 rounded bg-primary/5 truncate hover:bg-primary/10 transition-colors"
                                  >
                                    {service.skillName}
                                  </Link>
                                ))
                              : (tasker.skills || []).slice(0, 3).map((skill: any) => (
                                  <span
                                    key={skill.id}
                                    className="px-3 py-1.5 text-xs font-medium border border-primary/30 rounded bg-primary/5 truncate"
                                  >
                                    {skill.skill}
                                  </span>
                                ))}
                          </div>
                          <div className="mt-auto space-y-2">
                            {tasker.hourlyRate && (
                              <div className="text-sm font-semibold text-gray-900">
                                {formatCurrency(tasker.hourlyRate)} / hr
                              </div>
                            )}
                            <Link href={`/profile/${tasker.slug || tasker.id}`}>
                              <Button variant="outline" className="w-full">
                                View Expert Profile
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

        </div>

        {/* How It Works */}
        <section className="bg-muted/30 py-20" suppressHydrationWarning>
          <div className="container mx-auto px-4" suppressHydrationWarning>
            <h2 className="text-4xl font-bold text-center mb-12">
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">Search & Browse</h3>
                <p className="text-muted-foreground">
                  Search for experts by skills, expertise, or category. Browse verified profiles with ratings and reviews.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">Book Directly</h3>
                <p className="text-muted-foreground">
                  Select an expert and fill out a simple form describing your needs. Book instantly with secure payment.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">Get It Done</h3>
                <p className="text-muted-foreground">
                  Communicate directly with your expert, track progress, and release payment only when satisfied.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center" suppressHydrationWarning>
          <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join Skillyy as a buyer or expert
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center" suppressHydrationWarning>
            <Button 
              onClick={(e) => {
                e.preventDefault()
                handleBecomeBuyer()
              }}
              size="lg" 
              className="px-8 touch-manipulation"
              type="button"
            >
              Become a Buyer
            </Button>
            <Button 
              onClick={handleBecomeExpert}
              size="lg" 
              variant="outline" 
              className="px-8 touch-manipulation"
              type="button"
            >
              Become an Expert
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}

