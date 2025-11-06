'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function CalendarPage() {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get user's tasks
  const { data: user } = useSWR(session ? '/api/v1/users/me' : null, fetcher)
  
  // Get all tasks for the current week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const { data: tasks } = useSWR(
    session ? `/api/v1/tasks` : null,
    fetcher
  )
  
  // Filter tasks that belong to the user (exclude cancelled)
  const myTasks = tasks?.filter((task: any) => 
    (task.workerId === user?.id || task.clientId === user?.id) &&
    task.status !== 'CANCELLED'
  ) || []

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const getMyTasksForDay = (date: Date) => {
    if (!myTasks || !user) return []
    return myTasks.filter((task: any) => {
      if (!task.scheduledAt) return false
      return isSameDay(new Date(task.scheduledAt), date)
    })
  }

  const previousWeek = () => {
    setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000))
  }

  const nextWeek = () => {
    setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Calendar</h1>
          <p className="text-muted-foreground">
            View your scheduled tasks and manage your availability
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" onClick={previousWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={nextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </h2>
      </div>

      {/* Week View */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 gap-px border-b">
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`p-4 text-center border-r last:border-r-0 ${
                  isToday(day) ? 'bg-primary/5' : ''
                }`}
              >
                <div className="text-sm font-medium text-muted-foreground">
                  {format(day, 'EEE')}
                </div>
                <div
                  className={`text-lg font-semibold mt-1 ${
                    isToday(day) ? 'text-primary' : ''
                  }`}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px min-h-[400px]">
            {weekDays.map((day) => {
              const dayTasks = getMyTasksForDay(day)

              return (
                <div
                  key={day.toISOString()}
                  className={`p-2 border-r last:border-r-0 min-h-[400px] ${
                    isToday(day) ? 'bg-primary/5' : ''
                  }`}
                >
                  {dayTasks.length > 0 ? (
                    <div className="space-y-2">
                      {dayTasks.map((task: any) => (
                        <Link
                          key={task.id}
                          href={`/tasks/${task.id}`}
                          className={`block p-2 rounded text-sm transition-colors ${
                            task.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS'
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          }`}
                        >
                          <div className="font-medium truncate">{task.title}</div>
                          {task.scheduledAt && (
                            <div className="text-xs opacity-90">
                              {format(new Date(task.scheduledAt), 'h:mm a')}
                            </div>
                          )}
                          <div className="text-xs opacity-75 mt-0.5">{task.status}</div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center mt-2">
                      No tasks
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Tasks */}
      {myTasks && myTasks.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
            <CardDescription>Your scheduled tasks for the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myTasks
                .filter((task: any) => {
                  if (!task.scheduledAt) return false
                  const taskDate = new Date(task.scheduledAt)
                  const today = new Date()
                  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                  return taskDate >= today && taskDate <= nextWeek
                })
                .sort((a: any, b: any) => {
                  if (!a.scheduledAt || !b.scheduledAt) return 0
                  return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
                })
                .slice(0, 5)
                .map((task: any) => (
                  <div
                    key={task.id}
                    className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {task.title}
                      </Link>
                      <div className="text-sm text-muted-foreground">
                        {task.scheduledAt &&
                          format(new Date(task.scheduledAt), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                    <Badge variant="outline">{task.status}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

