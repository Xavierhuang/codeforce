'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  isSameMonth,
  addMonths,
  subMonths,
  addDays,
  startOfDay,
  isBefore,
  isAfter,
  parseISO
} from 'date-fns'
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  Search, 
  Plus,
  CheckCircle2,
  Circle,
  Sun,
  Cloud,
  CloudRain
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type ViewType = 'month' | 'week' | 'day' | 'agenda'

// Helper to parse date safely
const parseTaskDate = (dateStr: string | Date | null | undefined): Date | null => {
  if (!dateStr) return null
  if (dateStr instanceof Date) return dateStr
  try {
    return parseISO(dateStr)
  } catch {
    return null
  }
}

export default function CalendarPage() {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [view, setView] = useState<ViewType>('month')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get user's tasks
  const { data: user } = useSWR(session ? '/api/v1/users/me' : null, fetcher)
  const { data: tasks, error: tasksError } = useSWR(
    session ? `/api/v1/tasks?myTasks=true` : null,
    fetcher
  )
  
  // Filter tasks that belong to the user (exclude cancelled)
  const myTasks = useMemo(() => {
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return []
    }
    if (!tasks || !user) return []
    if (!Array.isArray(tasks)) return []
    return tasks.filter((task: any) => 
    (task.workerId === user?.id || task.clientId === user?.id) &&
    task.status !== 'CANCELLED'
    )
  }, [tasks, user, tasksError])

  // Filter tasks by search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery) return myTasks
    const query = searchQuery.toLowerCase()
    return myTasks.filter((task: any) => 
      task.title?.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query)
    )
  }, [myTasks, searchQuery])

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    return filteredTasks.filter((task: any) => {
      const taskDate = parseTaskDate(task.scheduledAt)
      if (!taskDate) return false
      return isSameDay(taskDate, date)
    })
  }

  // Get upcoming tasks (next 7 days)
  const upcomingTasks = useMemo(() => {
    const today = startOfDay(new Date())
    const nextWeek = addDays(today, 7)
    return filteredTasks
      .filter((task: any) => {
        const taskDate = parseTaskDate(task.scheduledAt)
        if (!taskDate) return false
        const taskDay = startOfDay(taskDate)
        return !isBefore(taskDay, today) && !isAfter(taskDay, nextWeek)
      })
      .sort((a: any, b: any) => {
        const dateA = parseTaskDate(a.scheduledAt)
        const dateB = parseTaskDate(b.scheduledAt)
        if (!dateA || !dateB) return 0
        return dateA.getTime() - dateB.getTime()
      })
      .slice(0, 10)
  }, [filteredTasks])

  // Group upcoming tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    upcomingTasks.forEach((task: any) => {
      const taskDate = parseTaskDate(task.scheduledAt)
      if (!taskDate) return
      const dateKey = format(taskDate, 'yyyy-MM-dd')
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(task)
    })
    return grouped
  }, [upcomingTasks])

  // Month view calculations
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Week view calculations
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Navigation functions
  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const previousWeek = () => setCurrentDate(addDays(currentDate, -7))
  const nextWeek = () => setCurrentDate(addDays(currentDate, 7))
  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Get task color based on status
  const getTaskColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { bg: '#C8E6C9', dot: '#4CAF50', text: '#1B5E20' }
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return { bg: '#BBDEFB', dot: '#2196F3', text: '#0D47A1' }
      case 'OPEN':
      case 'OFFERED':
        return { bg: '#FFF9C4', dot: '#FBC02D', text: '#F57F17' }
      default:
        return { bg: '#E1BEE7', dot: '#9C27B0', text: '#4A148C' }
    }
  }

  // Mini calendar for sidebar
  const miniCalendarStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
  const miniCalendarEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
  const miniCalendarDays = eachDayOfInterval({ start: miniCalendarStart, end: miniCalendarEnd })

  // Close sidebar on mobile when clicking backdrop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Show loading or error state
  if (!session) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <p className="text-sm text-gray-600">Please sign in to view your calendar</p>
      </div>
    )
  }

  // Show error message if tasks failed to load
  if (tasksError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-4">
        <p className="text-sm text-red-600 mb-2">Failed to load tasks</p>
        <p className="text-xs text-gray-500">Please refresh the page or try again later</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)] bg-white overflow-hidden">
      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-white/80 z-[99] lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:relative z-[100] lg:z-auto
          w-[280px] lg:w-[300px]
          bg-white
          border-r border-[#E5E7EB]
          h-full
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
          shadow-xl lg:shadow-none
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 lg:p-5 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-4">
        <div>
              <div className="text-xl md:text-2xl font-bold text-[#1A1A1A]">
                <span className="text-[#1A1A1A]">{format(currentDate, 'MMMM')}</span>
                <span className="text-[#94FE0C] ml-2">{format(currentDate, 'yyyy')}</span>
              </div>
        </div>
        <div className="flex gap-2">
              <button
                onClick={previousMonth}
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-md bg-[#F5F5F5] text-[#1A1A1A] hover:bg-[#E5E7EB] transition-colors flex items-center justify-center"
              >
            <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-md bg-[#F5F5F5] text-[#1A1A1A] hover:bg-[#E5E7EB] transition-colors flex items-center justify-center"
              >
            <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mini Calendar */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <div 
                  key={idx}
                  className="text-[10px] font-semibold text-[#666666] text-center py-1 uppercase"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {miniCalendarDays.map((day) => {
                const dayTasks = getTasksForDate(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isDayToday = isToday(day)
                const isSelected = selectedDate && isSameDay(day, selectedDate)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => {
                      setSelectedDate(day)
                      setCurrentDate(day)
                      setView('day') // Navigate to day view when clicking a day
                    }}
                    className={`
                      aspect-square flex items-center justify-center
                      text-xs
                      rounded-md transition-all
                      ${!isCurrentMonth ? 'text-[#999999] opacity-50' : 'text-[#1A1A1A]'}
                      ${isDayToday 
                        ? 'bg-[#94FE0C] text-[#1A1A1A] font-bold' 
                        : isSelected
                        ? 'bg-[#94FE0C]/20 text-[#1A1A1A]'
                        : 'hover:bg-[#F5F5F5]'
                      }
                      ${dayTasks.length > 0 ? 'relative' : ''}
                    `}
                  >
                    {format(day, 'd')}
                    {dayTasks.length > 0 && (
                      <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                        {dayTasks.slice(0, 3).map((task: any, idx: number) => (
                          <div
                            key={idx}
                            className="w-0.5 h-0.5 rounded-full bg-[#94FE0C]"
                          />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-5">
          <h3 className="text-xs md:text-sm font-bold text-[#1A1A1A] uppercase tracking-wider mb-3 flex items-center gap-3">
            Upcoming Tasks
          </h3>
          
          {Object.keys(tasksByDate).length === 0 ? (
            <p className="text-[#666666] text-xs">No upcoming tasks</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(tasksByDate).map(([dateKey, dateTasks]) => {
                const date = parseISO(dateKey)
                const isTodayDate = isToday(date)
                
                return (
                  <div key={dateKey} className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="text-xs md:text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                        {isTodayDate ? 'Today' : format(date, 'EEEE, MMM d')}
                      </h4>
      </div>

                    <div className="space-y-2">
                      {dateTasks.map((task: any) => {
                        const colors = getTaskColor(task.status)
                        const taskDate = parseTaskDate(task.scheduledAt)
                        const taskTime = taskDate 
                          ? format(taskDate, 'h:mm a')
                          : 'All day'

                        return (
                          <Link
                            key={task.id}
                            href={`/tasks/${task.id}`}
                            className="flex items-start gap-3 p-2 rounded-md hover:bg-[#F5F5F5] transition-colors cursor-pointer group"
                          >
                            <div 
                              className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full flex-shrink-0 mt-1.5"
                              style={{ backgroundColor: colors.dot }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-[#666666] mb-1">
                                {taskTime}
                              </div>
                              <div className="text-sm font-medium text-[#1A1A1A] truncate group-hover:text-[#94FE0C] transition-colors">
                                {task.title}
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-[#E5E7EB] px-3 md:px-4 lg:px-6 py-3 md:py-4 lg:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3 lg:gap-5">
            {/* Hamburger Menu */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden w-10 h-10 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center hover:bg-[#F5F5F5] transition-colors"
            >
              <Menu className="w-5 h-5 text-[#1A1A1A]" />
            </button>

            {/* Navigation */}
            <div className="flex items-center gap-2 lg:gap-3 order-1 lg:order-0">
              <button
                onClick={view === 'month' ? previousMonth : previousWeek}
                className="w-9 h-9 lg:w-11 lg:h-11 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center hover:bg-[#F5F5F5] transition-colors"
              >
                <ChevronLeft className="w-4 h-4 lg:w-[18px] lg:h-[18px] text-[#1A1A1A]" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#F5F5F5] transition-colors text-[#1A1A1A]"
              >
                Today
              </button>
              <button
                onClick={view === 'month' ? nextMonth : nextWeek}
                className="w-9 h-9 lg:w-11 lg:h-11 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center hover:bg-[#F5F5F5] transition-colors"
              >
                <ChevronRight className="w-4 h-4 lg:w-[18px] lg:h-[18px] text-[#1A1A1A]" />
              </button>
            </div>

            {/* Date Display */}
            <div className="flex-1 text-center lg:text-left order-2 lg:order-1">
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-[#1A1A1A]">
                {view === 'month' 
                  ? format(currentDate, 'MMMM yyyy')
                  : view === 'week'
                  ? `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
                  : format(currentDate, 'EEEE, MMMM d, yyyy')
                }
              </h1>
            </div>

            {/* View Toggle */}
            <div className="flex gap-1 bg-white border border-[#E5E7EB] rounded-lg p-1 order-3 lg:order-2 w-full lg:w-auto">
              {(['month', 'week', 'day'] as ViewType[]).map((viewType) => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType)}
                  className={`
                    px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold rounded-md transition-colors flex-1 lg:flex-0
                    ${view === viewType
                      ? 'bg-[#94FE0C] text-[#1A1A1A]'
                      : 'bg-transparent text-[#666666] hover:bg-[#F5F5F5]'
                    }
                  `}
                >
                  {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg min-w-[200px] order-4">
              <Search className="w-4 h-4 text-[#999999]" />
              <Input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 outline-none bg-transparent text-xs md:text-sm flex-1 p-0"
              />
            </div>
          </div>
        </header>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto p-2 md:p-4 lg:p-6">
          {view === 'month' && (
            <div className="bg-white rounded-lg lg:rounded-xl shadow-md">
              {/* Week Header */}
              <div className="grid grid-cols-7 border-b-2 border-[#E0E0E0] sticky top-0 bg-white z-10">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <div
                    key={day}
                    className="p-2 md:p-3 text-xs font-bold text-[#666666] text-center uppercase tracking-wider"
                  >
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const dayTasks = getTasksForDate(day)
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isDayToday = isToday(day)
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        min-h-[100px] md:min-h-[120px] lg:min-h-[140px] xl:min-h-[160px]
                        border border-[#E0E0E0]
                        p-2 lg:p-3 xl:p-4
                        relative
                        cursor-pointer
                        transition-colors
                        ${isWeekend ? 'bg-[#FAFAFA]' : 'bg-white'}
                        ${!isCurrentMonth ? 'bg-[#F5F5F5] opacity-50' : ''}
                        ${isDayToday ? 'bg-[rgba(148,254,12,0.1)]' : ''}
                        hover:bg-[#F5F5F5]
                      `}
                    >
                      {/* Date Number */}
                      <div className={`
                        text-sm md:text-base font-bold mb-1 relative z-10
                        ${isDayToday
                          ? 'inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full bg-[#94FE0C] text-[#1A1A1A]'
                          : 'text-[#1A1A1A]'
                        }
                      `}>
                        {format(day, 'd')}
      </div>

                      {/* Tasks */}
                      <div className="space-y-1 lg:space-y-2">
                        {dayTasks.slice(0, 3).map((task: any) => {
                          const colors = getTaskColor(task.status)
                          const taskDate = parseTaskDate(task.scheduledAt)
                          const taskTime = taskDate 
                            ? format(taskDate, 'h:mm a')
                            : ''

                          return (
                            <Link
                              key={task.id}
                              href={`/tasks/${task.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className={`
                                block p-1 md:p-1.5 rounded text-xs font-medium
                                overflow-hidden text-ellipsis whitespace-nowrap
                                cursor-pointer transition-all hover:translate-y-[-1px] hover:shadow-sm
                                flex items-center gap-1
                              `}
                              style={{
                                backgroundColor: colors.bg,
                                color: colors.text,
                              }}
                            >
                              <div 
                                className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: colors.dot }}
                              />
                              <span className="truncate">{task.title}</span>
                            </Link>
                          )
                        })}
                        {dayTasks.length > 3 && (
                          <div className="text-[10px] md:text-xs text-[#999999] px-1 py-0.5 text-center font-semibold cursor-pointer hover:text-[#94FE0C] transition-colors">
                            +{dayTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {view === 'week' && (
            <div className="bg-white rounded-lg lg:rounded-xl shadow-md overflow-hidden h-full">
              {/* Week Header */}
              <div className="grid grid-cols-7 border-b-2 border-[#E0E0E0]">
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                    className={`
                      p-3 lg:p-5 text-center border-r last:border-r-0
                      ${isToday(day) ? 'bg-[rgba(64,166,255,0.1)]' : ''}
                    `}
                  >
                    <div className="text-xs font-medium text-[#666666] mb-1">
                  {format(day, 'EEE')}
                </div>
                <div
                      className={`
                        text-sm md:text-base font-bold
                        ${isToday(day)
                          ? 'inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full bg-[#94FE0C] text-[#1A1A1A]'
                          : 'text-[#1A1A1A]'
                        }
                      `}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

              {/* Week Grid */}
              <div className="grid grid-cols-7 min-h-[400px] lg:min-h-[500px]">
            {weekDays.map((day) => {
                  const dayTasks = getTasksForDate(day)
                  const isDayToday = isToday(day)

              return (
                <div
                  key={day.toISOString()}
                      className={`
                        p-2 lg:p-3 xl:p-4 border-r last:border-r-0 min-h-[400px] lg:min-h-[500px]
                        ${isDayToday ? 'bg-[rgba(148,254,12,0.1)]' : 'bg-white'}
                      `}
                    >
                      <div className="space-y-2">
                  {dayTasks.length > 0 ? (
                          dayTasks.map((task: any) => {
                            const colors = getTaskColor(task.status)
                            const taskTime = task.scheduledAt 
                              ? format(parseISO(task.scheduledAt), 'h:mm a')
                              : 'All day'

                            return (
                              <Link
                                key={task.id}
                                href={`/tasks/${task.id}`}
                                className={`
                                  block p-2 md:p-2.5 rounded text-xs md:text-sm font-medium
                                  cursor-pointer transition-all hover:translate-y-[-1px] hover:shadow-sm
                                `}
                                style={{
                                  backgroundColor: colors.bg,
                                  color: colors.text,
                                }}
                              >
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <div 
                                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: colors.dot }}
                                    />
                                    <span className="text-xs opacity-75">{taskTime}</span>
                                  </div>
                                  <div className="font-semibold text-sm">{task.title}</div>
                                  <div className="text-xs opacity-75 mt-1">{task.status}</div>
                              </Link>
                            )
                          })
                        ) : (
                          <div className="text-sm text-[#999999] text-center mt-4">
                            No tasks
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {view === 'day' && (
            <div className="bg-white rounded-lg lg:rounded-xl shadow-md overflow-hidden h-full">
              <div className="p-4 md:p-6 border-b border-[#E0E0E0]">
                <h2 className="text-lg md:text-xl font-bold text-[#1A1A1A]">
                  {format(currentDate, 'EEEE, MMMM d, yyyy')}
                </h2>
              </div>
              <div className="p-4 md:p-6">
                {getTasksForDate(currentDate).length > 0 ? (
                  <div className="space-y-3">
                    {getTasksForDate(currentDate).map((task: any) => {
                      const colors = getTaskColor(task.status)
                      const taskTime = task.scheduledAt 
                        ? format(parseISO(task.scheduledAt), 'h:mm a')
                        : 'All day'

                      return (
                        <Link
                          key={task.id}
                          href={`/tasks/${task.id}`}
                          className="block p-3 md:p-4 rounded-lg border border-[#E5E7EB] hover:border-[#94FE0C] hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                              style={{ backgroundColor: colors.dot }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-base md:text-lg font-bold text-[#1A1A1A]">
                                  {task.title}
                                </h3>
                                <Badge variant="outline" className="text-xs">{task.status}</Badge>
                              </div>
                              <div className="text-xs md:text-sm text-[#666666] mb-2">
                                {taskTime}
                              </div>
                              {task.description && (
                                <p className="text-xs md:text-sm text-[#666666] line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
              )
            })}
          </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-[#999999] text-sm md:text-base">No tasks scheduled for this day</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Button (Mobile) */}
        <button
          className="lg:hidden fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#94FE0C] text-[#1A1A1A] shadow-lg z-50 flex items-center justify-center hover:bg-[#7FE00A] transition-colors"
          onClick={() => {
            // Navigate to create task or open modal
            window.location.href = '/dashboard'
          }}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
