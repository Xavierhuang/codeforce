'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Search, Star, MapPin } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DevelopersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])

  const queryParams = new URLSearchParams()
  if (selectedSkills.length > 0) {
    queryParams.set('skills', selectedSkills.join(','))
  }

  const { data: developers, isLoading } = useSWR(
    `/api/v1/search/developers?${queryParams.toString()}`,
    fetcher
  )

  const filteredDevelopers = developers?.filter((dev: any) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      dev.name?.toLowerCase().includes(query) ||
      dev.bio?.toLowerCase().includes(query) ||
      dev.skills?.some((skill: any) => skill.skill.toLowerCase().includes(query))
    )
  })

  const allSkills = Array.from(
    new Set(
      developers?.flatMap((dev: any) => dev.skills?.map((s: any) => s.skill) || []) || []
    )
  ).slice(0, 10)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Find Developers</h1>
        <p className="text-muted-foreground">
          Browse vetted developers ready to help with your projects
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            type="text"
            placeholder="Search developers by name, skills, or bio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {allSkills.map((skill) => (
            <Button
              key={skill}
              variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedSkills((prev) =>
                  prev.includes(skill)
                    ? prev.filter((s) => s !== skill)
                    : [...prev, skill]
                )
              }}
            >
              {skill}
            </Button>
          ))}
        </div>
      </div>

      {/* Developers List */}
      {isLoading ? (
        <div className="text-center py-12">Loading developers...</div>
      ) : filteredDevelopers && filteredDevelopers.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevelopers.map((developer: any) => (
            <Card key={developer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {developer.avatarUrl ? (
                      <img
                        src={developer.avatarUrl}
                        alt={developer.name || 'Developer'}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-semibold">
                          {developer.name?.[0]?.toUpperCase() || developer.email[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{developer.name || 'Developer'}</CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>
                          {developer.rating?.toFixed(1) || '0.0'} ({developer.ratingCount || 0})
                        </span>
                      </div>
                    </div>
                  </div>
                  {developer.verificationStatus === 'VERIFIED' && (
                    <Badge variant="default">Verified</Badge>
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
                      {developer.skills.slice(0, 4).map((skill: any) => (
                        <Badge key={skill.id} variant="secondary" className="text-xs">
                          {skill.skill}
                        </Badge>
                      ))}
                      {developer.skills.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{developer.skills.length - 4}
                        </Badge>
                      )}
                    </div>
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

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Tasks completed</p>
                    <p className="font-semibold">{developer._count?.tasksAssigned || 0}</p>
                  </div>
                  <Link href={`/developers/${developer.slug || developer.id}`}>
                    <Button size="sm">View Profile</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No developers found. Try adjusting your search or filters.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

