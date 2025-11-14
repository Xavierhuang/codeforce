'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { Search, MapPin, Clock, DollarSign, Users, Filter, Grid, List } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function TasksPage() {
  const { data: session } = useSession()
  const [filters, setFilters] = useState({
    status: 'open',
    category: 'all',
    type: 'all',
    search: '',
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const queryParams = new URLSearchParams()
  if (filters.status) queryParams.set('status', filters.status.toUpperCase())
  if (filters.category && filters.category !== 'all') queryParams.set('category', filters.category)
  if (filters.type && filters.type !== 'all') queryParams.set('type', filters.type)

  const { data: tasks, isLoading } = useSWR(
    `/api/v1/tasks?${queryParams.toString()}`,
    fetcher
  )

  const filteredTasks = tasks?.filter((task: any) => {
    if (!filters.search) return true
    const searchLower = filters.search.toLowerCase()
    return (
      task.title?.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower) ||
      task.category?.toLowerCase().includes(searchLower)
    )
  }) || []

  const categories = ['Bug Fix', 'Web Development', 'Mobile App', 'DevOps', 'API Integration', 'Other']

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" suppressHydrationWarning>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Browse Tasks</h1>
            <p className="text-muted-foreground text-lg">
              View tasks assigned to you and manage your work
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search tasks by title, description, or category..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10 h-12 text-base"
                />
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="w-4 h-4" />
                  <span>Filters:</span>
                </div>
                
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters({ ...filters, category: value })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.type}
                  onValueChange={(value) => setFilters({ ...filters, type: value })}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="VIRTUAL">Virtual</SelectItem>
                    <SelectItem value="IN_PERSON">In-Person</SelectItem>
                  </SelectContent>
                </Select>

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded mb-4"></div>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-2'
        }>
          {filteredTasks.map((task: any) => (
            viewMode === 'list' ? (
              <Card 
                key={task.id} 
                className="hover:shadow-lg transition-all duration-200 hover:border-primary/50 group cursor-pointer"
              >
                <Link href={`/tasks/${task.id}`}>
                  <CardContent className="py-2 px-4">
                    <div className="flex items-center gap-4">
                      {/* Title and Description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                            {task.title}
                          </h3>
                          <StatusBadge status={task.status} />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 truncate mt-0.5">
                          {task.description}
                        </p>
                      </div>

                      {/* Category and Type */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs py-0 px-2 h-5">
                          {task.category}
                        </Badge>
                        {task.type === 'IN_PERSON' && (
                          <Badge variant="outline" className="text-xs py-0 px-2 h-5">
                            <MapPin className="w-2.5 h-2.5 mr-1" />
                            In-Person
                          </Badge>
                        )}
                      </div>

                      {/* Price */}
                      {task.price && (
                        <div className="text-right flex-shrink-0 min-w-[90px]">
                          <div className="text-base font-bold text-primary">
                            {formatCurrency(task.price)}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                        {task._count?.offers > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{task._count.offers}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{format(new Date(task.createdAt), 'MMM d')}</span>
                        </div>
                      </div>

                      {/* Client Avatar */}
                      {task.client && (
                        <div className="flex-shrink-0">
                          {task.client.avatarUrl ? (
                            <img
                              src={task.client.avatarUrl}
                              alt={task.client.name || 'Client'}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                              <Users className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ) : (
              <Card 
                key={task.id} 
                className="hover:shadow-xl transition-all duration-200 hover:border-primary/50 group cursor-pointer h-full flex flex-col"
              >
                <Link href={`/tasks/${task.id}`} className="flex flex-col h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {task.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={task.status} />
                          <Badge variant="outline" className="text-xs">
                            {task.category}
                          </Badge>
                          {task.type === 'IN_PERSON' && (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="w-3 h-3 mr-1" />
                              In-Person
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-muted-foreground line-clamp-3 mb-4 text-sm flex-1">
                      {task.description}
                    </p>
                    
                    <div className="space-y-3 pt-4 border-t">
                      {/* Price */}
                      {task.price && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-sm">Budget</span>
                          </div>
                          <span className="text-2xl font-bold text-primary">
                            {formatCurrency(task.price)}
                          </span>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          {task._count?.offers > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{task._count.offers} {task._count.offers === 1 ? 'offer' : 'offers'}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{format(new Date(task.createdAt), 'MMM d')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Client Info */}
                      {task.client && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {task.client.avatarUrl ? (
                            <img
                              src={task.client.avatarUrl}
                              alt={task.client.name || 'Client'}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                              <Users className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {task.client.name || 'Anonymous'}
                          </span>
                          {task.client.rating && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              ⭐ {task.client.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            )
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground mb-6">
                {filters.search || (filters.category && filters.category !== 'all') || (filters.type && filters.type !== 'all')
                  ? 'Try adjusting your filters to see more results.'
                  : 'No tasks available at the moment.'}
              </p>
              <Link href="/experts">
                <Button>Find Experts</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
