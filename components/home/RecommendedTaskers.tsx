import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, CheckCircle, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { TaskerBadge } from '@/components/TaskerBadge'
import { TaskerBadgeTier } from '@/lib/badge-tier'

interface RecommendedTaskersProps {
  taskers: Array<{
    id: string
    name: string | null
    slug: string | null
    avatarUrl: string | null
    rating: number | null
    badgeTier: string | null
    workerServices?: Array<{
      id: string
      skillName: string
      hourlyRate: number
    }>
    skills?: Array<{
      id: string
      skill: string
    }>
    _count?: {
      tasksAssigned?: number
      reviewsReceived?: number
    }
    hourlyRate?: number | null
  }>
}

export function RecommendedTaskers({ taskers }: RecommendedTaskersProps) {
  if (!taskers || taskers.length === 0) {
    return null
  }

  return (
    <section className="max-w-7xl mx-auto mb-16">
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
        {taskers.slice(0, 6).map((tasker) => {
          const topServices = tasker.workerServices?.slice(0, 3) || []
          const completedTasks = tasker._count?.tasksAssigned || 0
          const rating = tasker.rating || 0
          const reviewCount = tasker._count?.reviewsReceived || 0
          
          return (
            <Card key={tasker.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                {/* Popular Badge */}
                <div className="text-xs text-muted-foreground mb-3">
                  Popular in your area
                </div>
                
                {/* Profile Picture and Name */}
                <div className="flex items-start gap-4 mb-4">
                  {tasker.avatarUrl ? (
                    <img
                      src={tasker.avatarUrl}
                      alt={tasker.name || 'Expert'}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold">
                      {tasker.name?.charAt(0).toUpperCase() || 'E'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">
                        {tasker.name || 'Expert'}
                      </h3>
                      {tasker.badgeTier && tasker.badgeTier !== 'STARTER' && (
                        <TaskerBadge 
                          tier={tasker.badgeTier as TaskerBadgeTier} 
                          size="sm"
                        />
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
                      topServices.map((service) => (
                        <Link
                          key={service.id}
                          href={`/profile/${tasker.slug || tasker.id}/service/${encodeURIComponent(service.skillName)}`}
                          className="px-3 py-1.5 text-xs font-medium border border-primary/30 hover:bg-primary hover:text-primary-foreground rounded transition-all"
                        >
                          {service.skillName} for {formatCurrency(service.hourlyRate)}/hr
                        </Link>
                      ))
                    ) : (
                      tasker.skills?.slice(0, 3).map((skill) => (
                        <span
                          key={skill.id}
                          className="px-3 py-1.5 text-xs font-medium border border-primary/30 rounded"
                        >
                          {skill.skill}
                          {tasker.hourlyRate && ` for ${formatCurrency(tasker.hourlyRate)}/hr`}
                        </span>
                      ))
                    )}
                  </div>
                  <Link href={`/profile/${tasker.slug || tasker.id}`}>
                    <Button variant="outline" className="w-full">
                      View Expert Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}





