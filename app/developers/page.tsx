'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { Search, Star, MapPin, Wifi, Building2, CheckCircle, Bookmark, ChevronDown, ChevronLeft, Sliders, Briefcase, Calendar, Bell, Settings, Menu } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { TaskerBadge } from '@/components/TaskerBadge'
import { TaskerBadgeTier } from '@/lib/badge-tier'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error('API error:', res.status, res.statusText)
      // Return empty array on error instead of throwing
      return []
    }
    const data = await res.json()
    // Ensure we return an array
    if (Array.isArray(data)) {
      return data
    }
    // If API returns an object with error, log it
    if (data?.error) {
      console.error('API returned error:', data.error)
      return []
    }
    // If data is not an array, log and return empty array
    console.warn('API did not return an array:', typeof data, data)
    return []
  } catch (error) {
    console.error('Fetcher error:', error)
    return []
  }
}

// Card color variants matching design tokens
const cardColors = [
  { bg: '#FFE4D6', name: 'peach' },
  { bg: '#D6F5E8', name: 'mint' },
  { bg: '#E8DEFF', name: 'lavender' },
  { bg: '#E0F2FE', name: 'lightBlue' },
  { bg: '#FFE4F0', name: 'pink' },
  { bg: '#FFF8E7', name: 'cream' },
]

type SortOption = 'lastUpdated' | 'priceLow' | 'priceHigh' | 'rating' | 'name'

export default function DevelopersPage() {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedExperience, setSelectedExperience] = useState<string>('')
  const [selectedServiceType, setSelectedServiceType] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('lastUpdated')
  const isBuyer = session?.user && (session.user as any).role === 'CLIENT'

  const queryParams = new URLSearchParams()
  if (selectedSkills.length > 0) {
    queryParams.set('skills', selectedSkills.join(','))
  }

  const { data: developers, isLoading, error } = useSWR(
    `/api/v1/search/developers?${queryParams.toString()}`,
    fetcher
  )

  // Log for debugging
  if (error) {
    console.error('SWR error:', error)
  }
  if (developers !== undefined) {
    console.log('Developers data:', Array.isArray(developers) ? `${developers.length} developers` : typeof developers, developers)
  }

  // Ensure developers is always an array
  const developersArray = Array.isArray(developers) ? developers : []

  const filteredDevelopers = developersArray.filter((dev: any) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      dev.name?.toLowerCase().includes(query) ||
      dev.bio?.toLowerCase().includes(query) ||
      dev.skills?.some((skill: any) => skill.skill.toLowerCase().includes(query))
    )
  })

  // Sort developers based on selected sort option
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

  const getCardColor = (index: number) => cardColors[index % cardColors.length]

  return (
    <div className="min-h-screen bg-[#F5F5F7]" suppressHydrationWarning>
      {/* Header is handled by UnifiedHeader in AppLayout */}

      {/* Search Bar Section - Updated to white style to match UnifiedHeader */}
      <div className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-full md:min-w-[200px]">
              <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
              <input
                type="text"
                placeholder="Search developers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl text-gray-900 placeholder:text-gray-400 text-sm md:text-[14px] font-medium focus:outline-none focus:bg-white focus:border-[#94FE0C] transition-all"
              />
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all min-w-full md:min-w-[200px]">
              <MapPin className="w-4 h-4 md:w-5 md:h-5 text-gray-600 flex-shrink-0" />
              <span className="text-sm md:text-[14px] font-medium text-gray-900 flex-1">Work location</span>
              <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-gray-600 flex-shrink-0" />
            </div>

            {/* Experience Filter */}
            <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all min-w-full md:min-w-[200px]">
              <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-gray-600 flex-shrink-0" />
              <span className="text-sm md:text-[14px] font-medium text-gray-900 flex-1">Experience</span>
              <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-gray-600 flex-shrink-0" />
            </div>

            {/* Payment Filter */}
            <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all min-w-full md:min-w-[200px]">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-gray-600 flex-shrink-0" />
              <span className="text-sm md:text-[14px] font-medium text-gray-900 flex-1">Per hour</span>
              <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-gray-600 flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar */}
          {!sidebarCollapsed && (
            <aside className="w-full lg:w-[280px]">
              {/* Promotional Banner */}
              <div className="bg-black rounded-3xl p-8 mb-6 relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-xl md:text-2xl font-bold text-white leading-tight mb-5">
                    Get Your best profession with CodeForce
                  </h2>
                  <button className="px-4 md:px-5 py-2 md:py-3 text-sm md:text-[14px] font-semibold text-[#1A1A1A] bg-[#94FE0C] rounded-xl md:rounded-2xl border-none cursor-pointer hover:bg-[#7FE00A] transition-all">
                    Learn more
                  </button>
                </div>
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='white' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`,
                }}></div>
              </div>

              {/* Filters Section */}
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

                {/* Service Type Filter */}
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

                {/* Skills Filter */}
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

          {/* Collapsed Sidebar Button */}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="fixed left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center z-10 hidden lg:flex"
            >
              <ChevronLeft className="w-5 h-5 text-[#1A1A1A]" />
            </button>
          )}

          {/* Main Content */}
          <div className={sidebarCollapsed ? 'lg:col-span-2' : ''}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-bold text-[#1A1A1A]">Recommended Developers</h1>
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

            {/* Developers Grid */}
            {isLoading ? (
              <div className="text-center py-12 text-[#6B7280]">Loading developers...</div>
            ) : sortedDevelopers && sortedDevelopers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {sortedDevelopers.map((developer: any, index: number) => {
                  const cardColor = getCardColor(index)
                  return (
                    <div
                      key={developer.id}
                      className="bg-white rounded-3xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_8px_16px_rgba(0,0,0,0.12)] relative"
                      style={{ backgroundColor: cardColor.bg }}
                    >
                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-xs font-medium text-[#1A1A1A] mb-3">
                          {new Date(developer.createdAt || Date.now()).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <button className="w-8 h-8 bg-white/60 rounded-lg flex items-center justify-center cursor-pointer">
                          <Bookmark className="w-4 h-4 text-[#1A1A1A]" />
                        </button>
                      </div>

                      {/* Company/Developer Info */}
                      <div className="flex items-center gap-3 mb-3">
                    {developer.avatarUrl ? (
                      <img
                        src={developer.avatarUrl}
                        alt={developer.name || 'Developer'}
                            className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center"
                      />
                    ) : (
                          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center">
                            <span className="text-lg font-semibold text-[#1A1A1A]">
                          {developer.name?.[0]?.toUpperCase() || developer.email[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-[#1A1A1A]">
                              {developer.name || 'Developer'}
                            </span>
                        {developer.badgeTier && developer.badgeTier !== 'STARTER' && (
                          <TaskerBadge 
                            tier={developer.badgeTier as TaskerBadgeTier} 
                            size="sm"
                          />
                        )}
                            {developer.verificationStatus === 'VERIFIED' && (
                              <CheckCircle className="w-4 h-4 text-[#10B981]" />
                            )}
                      </div>
                          <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>
                          {developer.rating?.toFixed(1) || '0.0'} ({developer.ratingCount || 0})
                        </span>
                      </div>
                    </div>
                  </div>

                      {/* Job Title / Bio */}
                {developer.bio && (
                        <h3 className="text-xl font-bold text-[#1A1A1A] leading-tight mb-4 line-clamp-2">
                          {developer.bio.length > 50 ? `${developer.bio.substring(0, 50)}...` : developer.bio}
                        </h3>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-5">
                  {developer.serviceType === 'VIRTUAL' || developer.serviceType === null ? (
                          <span className="px-3 py-1 text-xs font-medium text-[#1A1A1A] bg-white/50 border border-black/10 rounded-full">
                      Remote
                          </span>
                  ) : developer.serviceType === 'IN_PERSON' ? (
                          <span className="px-3 py-1 text-xs font-medium text-[#1A1A1A] bg-white/50 border border-black/10 rounded-full">
                      On-site
                          </span>
                  ) : (
                    <>
                            <span className="px-3 py-1 text-xs font-medium text-[#1A1A1A] bg-white/50 border border-black/10 rounded-full">
                        Remote
                            </span>
                            <span className="px-3 py-1 text-xs font-medium text-[#1A1A1A] bg-white/50 border border-black/10 rounded-full">
                        On-site
                            </span>
                    </>
                  )}
                        {developer.skills?.slice(0, 2).map((skill: any) => (
                          <span
                            key={skill.id}
                            className="px-3 py-1 text-xs font-medium text-[#1A1A1A] bg-white/50 border border-black/10 rounded-full"
                          >
                            {skill.skill}
                          </span>
                        ))}
                </div>

                      {/* Footer */}
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col gap-1">
                {developer.hourlyRate && (
                            <div className="text-xl font-bold text-[#1A1A1A]">
                              {formatCurrency(developer.hourlyRate)}/hr
                  </div>
                )}
                {developer.locationLat && developer.locationLng && (
                            <div className="text-xs text-[#6B7280] flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {developer.serviceRadiusMiles ? `${developer.serviceRadiusMiles} mi radius` : 'Available'}
                  </div>
                )}
                  </div>
                  {isBuyer && developer.hourlyRate ? (
                    <Link href={`/book/${developer.slug || developer.id}`}>
                            <button className="px-5 py-2 text-[14px] font-semibold text-white bg-[#1A1A1A] rounded-full border-none cursor-pointer hover:bg-[#2D2D2D] transition-all">
                              Book Now
                            </button>
                    </Link>
                  ) : (
                    <Link href={`/developers/${developer.slug || developer.id}`}>
                            <button className="px-5 py-2 text-[14px] font-semibold text-white bg-[#1A1A1A] rounded-full border-none cursor-pointer hover:bg-[#2D2D2D] transition-all">
                              Details
                            </button>
                    </Link>
                  )}
                </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center text-[#6B7280]">
                No developers found. Try adjusting your search or filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
