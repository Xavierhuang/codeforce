'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, Play, Square } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface ClockInOutButtonProps {
  task: {
    id: string
    clockInTime?: string | Date | null
    clockOutTime?: string | Date | null
    totalTimeMinutes?: number | null
    status?: string
  }
  onUpdate?: () => void
}

export function ClockInOutButton({ task, onUpdate }: ClockInOutButtonProps) {
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setIsClockedIn(!!task.clockInTime && !task.clockOutTime)
  }, [task.clockInTime, task.clockOutTime])

  useEffect(() => {
    if (isClockedIn) {
      const interval = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isClockedIn])

  const calculateElapsedTime = () => {
    if (!task.clockInTime) return 0
    const clockIn = new Date(task.clockInTime)
    const now = currentTime
    const diffMs = now.getTime() - clockIn.getTime()
    return Math.floor(diffMs / (1000 * 60)) // minutes
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const handleClockIn = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/tasks/${task.id}/clock-in`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to clock in')
      }

      toast.success('Clocked in successfully')
      setIsClockedIn(true)
      if (onUpdate) onUpdate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to clock in')
    } finally {
      setLoading(false)
    }
  }

  const handleClockOut = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/tasks/${task.id}/clock-out`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to clock out')
      }

      const data = await response.json()
      toast.success(`Clocked out. Session: ${formatTime(data.sessionTimeMinutes || 0)}`)
      setIsClockedIn(false)
      if (onUpdate) onUpdate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to clock out')
    } finally {
      setLoading(false)
    }
  }

  const elapsedMinutes = isClockedIn ? calculateElapsedTime() : 0
  const totalMinutes = (task.totalTimeMinutes || 0) + (isClockedIn ? elapsedMinutes : 0)

  const canClockIn = (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') && !isClockedIn
  const canClockOut = isClockedIn && (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS')

  // Show component if worker can clock in/out OR if there's tracked time to display
  if (!canClockIn && !canClockOut && !task.totalTimeMinutes) {
    return null
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="pt-4 md:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              <h4 className="text-sm md:text-base font-semibold">Time Tracking</h4>
            </div>
            <div className="space-y-1">
              {isClockedIn && (
                <div className="text-xs md:text-sm text-muted-foreground">
                  <span className="font-medium text-primary">Clocked in</span> since {format(new Date(task.clockInTime!), 'h:mm a')}
                </div>
              )}
              {task.clockInTime && task.clockOutTime && (
                <div className="text-xs md:text-sm text-muted-foreground">
                  Last session: {format(new Date(task.clockInTime), 'h:mm a')} - {format(new Date(task.clockOutTime), 'h:mm a')}
                </div>
              )}
              <div className="text-sm md:text-base font-semibold">
                Total time: {formatTime(totalMinutes)}
              </div>
              {isClockedIn && (
                <div className="text-xs md:text-sm text-primary font-medium">
                  Current session: {formatTime(elapsedMinutes)}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!isClockedIn && canClockIn && (
              <Button
                onClick={handleClockIn}
                disabled={loading}
                className="bg-primary hover:bg-primary/90"
              >
                <Play className="w-4 h-4 mr-2" />
                Clock In
              </Button>
            )}
            {canClockOut && (
              <Button
                onClick={handleClockOut}
                disabled={loading}
                variant="destructive"
              >
                <Square className="w-4 h-4 mr-2" />
                Clock Out
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

