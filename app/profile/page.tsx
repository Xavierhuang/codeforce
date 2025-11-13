'use client'

import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { Search, Star, MapPin, CheckCircle, ChevronDown, ChevronLeft, Briefcase, Calendar } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { TaskerBadge } from '@/components/TaskerBadge'
import { TaskerBadgeTier } from '@/lib/badge-tier'
import { AvatarDisplay } from '@/components/AvatarDisplay'
import { Slider } from '@/components/ui/slider'
import { AddressAutocomplete, AddressData } from '@/components/maps/AddressAutocomplete'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error('API error:', res.status, res.statusText)
      return []
    }
    const data = await res.json()
    if (Array.isArray(data)) {
      return data
    }
    if (data?.error) {
      console.error('API returned error:', data.error)
      return []
    }
    console.warn('API did not return an array:', typeof data, data)
    return []
  } catch (error) {
    console.error('Fetcher error:', error)
    return []
  }
}

type SortOption = 'lastUpdated' | 'priceLow' | 'priceHigh' | 'rating' | 'name'

export default function ProfilesPage() {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedExperience, setSelectedExperience] = useState<string>('')
  const [selectedServiceType, setSelectedServiceType] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('lastUpdated')
 const [priceRange, setPriceRange] = useState<[number, number]>([0, 500])
  const [locationData, setLocationData] = useState<AddressData | null>(null)
  const [locationRadius, setLocationRadius] = useState<number>(25)
  const [showLocationFilter, setShowLocationFilter] = useState(false)
  const [showPriceFilter, setShowPriceFilter] = useState(false)
  const [showExperienceFilter, setShowExperienceFilter] = useState(false)
  const isBuyer = session?.user && (session.user as any).role === 'CLIENT'

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (selectedSkills.length > 0) {
      params.set('skills', selectedSkills.join(','))
    }
    if (selectedServiceType.length > 0) {
      params.set('serviceType', selectedServiceType.join(','))
    }
    if (priceRange[0] > 0) {
      params.set('minPrice', priceRange[0].toString())
    }
    if (priceRange[1] < 500) {
      params.set('maxPrice', priceRange[1].toString())
    }
    if (locationData) {
      params.set('near', `${locationData.lat},${locationData.lng}`)
      params.set('radius', locationRadius.toString())
    }
    if (selectedExperience) {
      // Experience filtering handled client-side below
    }
    return params.toString()
  }, [selectedSkills, selectedServiceType, priceRange, locationData, locationRadius, selectedExperience])

  const { data: developers, isLoading, error } = useSWR(
    `/api/v1/search/developers?${queryParams}`,
    fetcher
  )

  if (error) {
    console.error('SWR error:', error)
  }

  const developersArray = Array.isArray(developers) ? developers : []

  const filteredDevelopers = developersArray.filter((dev: any) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = (
        dev.name?.toLowerCase().includes(query) ||
        dev.bio?.toLowerCase().includes(query) ||
        dev.skills?.some((skill: any) => skill.skill.toLowerCase().includes(query))
      )
      if (!matchesSearch) return false
    }

    if (selectedExperience) {
      const completedTasks = dev._count?.tasksAssigned || 0
      if (selectedExperience === 'beginner' && completedTasks >= 10) return false
      if (selectedExperience === 'intermediate' && (completedTasks < 10 || completedTasks >= 50)) return false
      if (selectedExperience === 'expert' && completedTasks < 50) return false
    }

    return true
  })

  const sortedDevelopers = [...filteredDevelopers].sort((a: any, b: any) => {
    switch (sortBy) {
      case 'priceLow':
        return (a.hourlyRate || 0) - (b.hourlyRate || 0)
      case 'priceHigh':
        return (b.hourlyRate || 0) - (a.hourlyRate || 0)
      case 'rating':
        return (b.rating || 0) - (a.rating || 0)
      case 'name':
        return (a.name || '').localeCompare(b.name || '')
      case 'lastUpdated':
      default:
        return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
    }
  })

  const allSkills = Array.from(
    new Set(
      developersArray.flatMap((dev: any) => dev.skills?.map((s: any) => s.skill) || [])
    )
  ).slice(0, 10) as string[]

  const priceBounds = useMemo(() => {
    if (developersArray.length === 0) return [0, 500]
    const prices = developersArray
      .map((d: any) => d.hourlyRate)
      .filter((p: any) => p != null && p > 0)
    if (prices.length === 0) return [0, 500]
    const min = Math.floor(Math.min(...prices))
    const max = Math.ceil(Math.max(...prices))
    return [Math.max(0, min - 10), Math.min(1000, max + 10)]
  }, [developersArray])

  useEffect(() => {
    if (priceBounds[1] > priceBounds[0] && priceRange[1] === 500) {
      setPriceRange([priceBounds[0], priceBounds[1]])
    }
  }, [priceBounds])

  return (
    <div className="min-h-screen bg-[#F5F5F7]" suppressHydrationWarning>
      <div className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <div className="relative flex-1 min-w-full md:min-w-[200px]">
              <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
              <input
                type="text"
                placeholder="Search experts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl text-gray-900 placeholder:text-gray-400 text-sm md:text-[14px] font-medium focus:outline-none focus:bg-white focus:border-[#94FE0C] transition-all"
              />
            </div>

            <DropdownMenu open={showLocationFilter} onOpenChange={setShowLocationFilter}>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all min-w-full md:min-w-[200px]">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-gray-600 flex-shrink-0" />
                  <span className="text-sm md:text-[14px] font-medium text-gray-900 flex-1">
                    {locationData ? locationData.city || locationData.address : 'Work location'}
                  </span>
                  <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-gray-600 flex-shrink-0" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-4">
                <AddressAutocomplete
                  onSelect={(data) => {
                    setLocationData(data)
                    setShowLocationFilter(false)
                  }}
                  placeholder="Enter location"
                  showLocationButton
                />
                {locationData && (
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">Radius (miles)</label>
                    <Slider
                      value={[locationRadius]}
                      onValueChange={(value) => setLocationRadius(value[0])}
                      min={5}
                      max={100}
                      step={5}
                      className="mb-2"
                    />
                    <div className="text-xs text-muted-foreground text-center">{locationRadius} miles</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLocationData(null)
                        setShowLocationFilter(false)
                      }}
                      className="w-full mt-2"
                    >
                      Clear Location
                    </Button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={showExperienceFilter} onOpenChange={setShowExperienceFilter}>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all min-w-full md:min-w-[200px]">
                  <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-gray-600 flex-shrink-0" />
                  <span className="text-sm md:text-[14px] font-medium text-gray-900 flex-1">
                    {selectedExperience === 'beginner' ? 'Beginner' : selectedExperience === 'intermediate' ? 'Intermediate' : selectedExperience === 'expert' ? 'Expert' : 'Experience'}
                  </span>
                  <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-gray-600 flex-shrink-0" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => { setSelectedExperience(''); setShowExperienceFilter(false) }}>
                  All Experience
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedExperience('beginner'); setShowExperienceFilter(false) }}>
                  Beginner (0-9 tasks)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedExperience('intermediate'); setShowExperienceFilter(false) }}>
                  Intermediate (10-49 tasks)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedExperience('expert'); setShowExperienceFilter(false) }}>
                  Expert (50+ tasks)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={showPriceFilter} onOpenChange={setShowPriceFilter}>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all min-w-full md:min-w-[200px]">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-gray-600 flex-shrink-0" />
                  <span className="text-sm md:text-[14px] font-medium text-gray-900 flex-1">
                    {priceRange[0] === priceBounds[0] && priceRange[1] === priceBounds[1] ? 'Per hour' : `${formatCurrency(priceRange[0])} - ${formatCurrency(priceRange[1])}`}
                  </span>
                  <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-gray-600 flex-shrink-0" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-4">
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Price Range</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
                    </span>
                  </div>
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    min={priceBounds[0]}
                    max={priceBounds[1]}
                    step={5}
                    className="mb-2"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPriceRange([priceBounds[0], priceBounds[1]])
                    setShowPriceFilter(false)
                  }}
                  className="w-full"
                >
                  Reset
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {!sidebarCollapsed && (
            <aside className="w-full lg:w-[280px]">
              <div className="bg-black rounded-3xl p-8 mb-6 relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-xl md:text-2xl font-bold text-white leading-tight mb-5">
                    Find top experts with Skillyy
                  </h2>
                  <button className="px-4 md:px-5 py-2 md:py-3 text-sm md:text-[14px] font-semibold text-[#1A1A1A] bg-[#94FE0C] rounded-xl md:rounded-2xl border-none cursor-pointer hover:bg-[#7FE00A] transition-all">
                    Learn more
                  </button>
                </div>
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='white' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`,
                }}></div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-bold text-[#1A1A1A]">Filters</h3>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="w-6 h-6 flex items-center justify-center"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
                  </button>
                </div>

                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-[#6B7280] mb-3 uppercase tracking-wider">
                    Service Type
                  </h4>
                  <div className="space-y-2">
                    {['Remote', 'On-site', 'Both'].map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-3 py-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedServiceType.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServiceType([...selectedServiceType, type])
                            } else {
                              setSelectedServiceType(selectedServiceType.filter((t) => t !== type))
                            }
                          }}
                          className="w-5 h-5 rounded-md border-2 border-[#E5E7EB] bg-white checked:bg-[#1A1A1A] checked:border-[#1A1A1A] appearance-none relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-white checked:after:text-xs checked:after:font-bold"
                        />
                        <span className="text-[14px] font-medium text-[#1A1A1A]">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {allSkills.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-[#6B7280] mb-3 uppercase tracking-wider">
                      Skills
                    </h4>
                    <div className="space-y-2">
                      {allSkills.map((skill) => (
                        <label
                          key={skill}
                          className="flex items-center gap-3 py-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSkills.includes(skill)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSkills([...selectedSkills, skill])
                              } else {
                                setSelectedSkills(selectedSkills.filter((s) => s !== skill))
                              }
                            }}
                            className="w-5 h-5 rounded-md border-2 border-[#E5E7EB] bg-white checked:bg-[#1A1A1A] checked:border-[#1A1A1A] appearance-none relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-white checked:after:text-xs checked:after:font-bold"
                          />
                          <span className="text-[14px] font-medium text-[#1A1A1A]">{skill}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}

          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="fixed left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center z-10 hidden lg:flex"
            >
              <ChevronLeft className="w-5 h-5 text-[#1A1A1A]" />
            </button>
          )}

          <div className={sidebarCollapsed ? 'lg:col-span-2' : ''}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-bold text-[#1A1A1A]">Recommended Experts</h1>
                {sortedDevelopers && sortedDevelopers.length > 0 && (
                  <span className="px-2 md:px-3 py-1 text-sm md:text-base font-semibold text-[#1A1A1A] bg-[#FAFAFA] rounded-full">
                    {sortedDevelopers.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-xs md:text-[14px] text-[#6B7280]">Sort by:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                      <span className="text-xs md:text-[14px] font-semibold text-[#1A1A1A]">
                        {sortBy === 'lastUpdated' && 'Last updated'}
                        {sortBy === 'priceLow' && 'Price: Low to High'}
                        {sortBy === 'priceHigh' && 'Price: High to Low'}
                        {sortBy === 'rating' && 'Rating'}
                        {sortBy === 'name' && 'Name'}
                      </span>
                      <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-[#6B7280]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => setSortBy('lastUpdated')}
                      className={sortBy === 'lastUpdated' ? 'bg-gray-100' : ''}
                    >
                      Last updated
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy('priceLow')}
                      className={sortBy === 'priceLow' ? 'bg-gray-100' : ''}
                    >
                      Price: Low to High
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy('priceHigh')}
                      className={sortBy === 'priceHigh' ? 'bg-gray-100' : ''}
                    >
                      Price: High to Low
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy('rating')}
                      className={sortBy === 'rating' ? 'bg-gray-100' : ''}
                    >
                      Rating
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy('name')}
                      className={sortBy === 'name' ? 'bg-gray-100' : ''}
                    >
                      Name
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-[#6B7280]">Loading profiles...</div>
            ) : sortedDevelopers && sortedDevelopers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedDevelopers.map((developer: any) => {
                  const completedTasks = developer._count?.tasksAssigned || 0
                  const rating = developer.rating || 0
                  const reviewCount = developer._count?.reviewsReceived || 0
                  const topServices = developer.skills?.slice(0, 3) || []
                  const displayName = developer.name || developer.slug || developer.email || 'Expert'

                  return (
                    <Card key={developer.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="text-xs text-muted-foreground mb-3">
                          Popular in your area
                        </div>

                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                            <AvatarDisplay
                              src={developer.avatarUrl || undefined}
                              alt={displayName}
                              fallback={displayName[0]?.toUpperCase() || 'D'}
                              className="w-full h-full rounded-full"
                              cropX={developer.avatarCropX ?? undefined}
                              cropY={developer.avatarCropY ?? undefined}
                              cropScale={developer.avatarCropScale ?? undefined}
                              size={64}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg truncate">
                                {displayName}
                              </h3>
                              {developer.badgeTier && developer.badgeTier !== 'STARTER' && (
                                <TaskerBadge 
                                  tier={developer.badgeTier as TaskerBadgeTier} 
                                  size="sm"
                                />
                              )}
                              {developer.verificationStatus === 'VERIFIED' && (
                                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>{completedTasks} Completed Tasks</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">{rating.toFixed(1)}</span>
                              <span className="text-muted-foreground">({reviewCount} reviews)</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <div className="text-xs font-semibold text-muted-foreground mb-3">
                            Top Skills
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {topServices.length > 0 ? (
                              topServices.map((skill: any) => (
                                <span
                                  key={skill.id}
                                  className="px-3 py-1.5 text-xs font-medium border border-primary/30 rounded"
                                >
                                  {skill.skill}
                                  {developer.hourlyRate && ` for ${formatCurrency(developer.hourlyRate)}/hr`}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No skills listed</span>
                            )}
                          </div>
                          {isBuyer && developer.hourlyRate ? (
                            <Link href={`/book/${developer.slug || developer.id}`}>
                              <Button variant="outline" className="w-full">
                                Book Now
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/profile/${developer.slug || developer.id}`}>
                              <Button variant="outline" className="w-full">
                                View Profile
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center text-[#6B7280]">
                No profiles found. Try adjusting your search or filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
