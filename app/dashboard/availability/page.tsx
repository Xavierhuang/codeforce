'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type TimeSlot = {
  start: string
  end: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_SLOTS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00',
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
]

export default function AvailabilityPage() {
  const { data: session } = useSession()
  const { data: user, mutate } = useSWR(session ? '/api/v1/users/me' : null, fetcher)
  const [availability, setAvailability] = useState<Record<string, TimeSlot[]>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user?.availability) {
      // Convert old format (single slot) to new format (array of slots)
      const avail = user.availability as Record<string, any>
      const converted: Record<string, TimeSlot[]> = {}
      
      Object.keys(avail).forEach((day) => {
        if (Array.isArray(avail[day])) {
          converted[day] = avail[day]
        } else if (avail[day]?.start && avail[day]?.end) {
          // Old format: single slot
          converted[day] = [{ start: avail[day].start, end: avail[day].end }]
        }
      })
      
      setAvailability(converted)
    }
  }, [user])

  const addTimeSlot = (day: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: '09:00', end: '17:00' }],
    }))
  }

  const removeTimeSlot = (day: string, index: number) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }))
  }

  const updateTimeSlot = (day: string, index: number, field: 'start' | 'end', value: string) => {
    setAvailability((prev) => {
      const daySlots = [...(prev[day] || [])]
      daySlots[index] = { ...daySlots[index], [field]: value }
      return { ...prev, [day]: daySlots }
    })
  }

  const toggleDay = (day: string) => {
    const dayKey = day.toLowerCase()
    const hasSlots = availability[dayKey] && availability[dayKey].length > 0
    
    if (hasSlots) {
      // Remove all slots for this day
      setAvailability((prev) => {
        const newAvail = { ...prev }
        delete newAvail[dayKey]
        return newAvail
      })
    } else {
      // Add default slot
      setAvailability((prev) => ({
        ...prev,
        [dayKey]: [{ start: '09:00', end: '17:00' }],
      }))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availability,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save availability')
      }

      toast.success('Availability saved successfully!')
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save availability')
    } finally {
      setIsSaving(false)
    }
  }


  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Set Your Availability</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Let clients know when you&apos;re available for work. This helps with task matching.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>
            Set your available hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {DAYS.map((day) => {
            const dayKey = day.toLowerCase()
            const daySlots = availability[dayKey] || []
            const isAvailable = daySlots.length > 0

            return (
              <div key={day} className="border rounded-lg p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <Label className="text-base md:text-lg font-semibold">{day}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={isAvailable ? 'default' : 'outline'}
                      onClick={() => toggleDay(dayKey)}
                      className="text-xs md:text-sm"
                    >
                      {isAvailable ? 'Available' : 'Set Available'}
                    </Button>
                  </div>
                </div>

                {isAvailable && (
                  <div className="space-y-3">
                    {daySlots.map((slot, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-end gap-2 p-3 bg-muted rounded-lg"
                      >
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor={`${day}-${index}-start`} className="text-xs">
                              Start
                            </Label>
                            <select
                              id={`${day}-${index}-start`}
                              value={slot.start}
                              onChange={(e) =>
                                updateTimeSlot(dayKey, index, 'start', e.target.value)
                              }
                              className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md"
                            >
                              {TIME_SLOTS.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor={`${day}-${index}-end`} className="text-xs">
                              End
                            </Label>
                            <select
                              id={`${day}-${index}-end`}
                              value={slot.end}
                              onChange={(e) =>
                                updateTimeSlot(dayKey, index, 'end', e.target.value)
                              }
                              className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md"
                            >
                              {TIME_SLOTS.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTimeSlot(dayKey, index)}
                          className="mb-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addTimeSlot(dayKey)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Time Slot
                    </Button>
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1 w-full sm:w-auto">
              {isSaving ? 'Saving...' : 'Save Availability'}
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 flex-1 sm:flex-initial">
              <Button
                variant="outline"
                onClick={() => {
                  // Set default availability (Mon-Fri 9-5)
                  const defaultAvail: Record<string, TimeSlot[]> = {}
                  DAYS.slice(0, 5).forEach((day) => {
                    defaultAvail[day.toLowerCase()] = [{ start: '09:00', end: '17:00' }]
                  })
                  setAvailability(defaultAvail)
                }}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                Set Default (Mon-Fri 9-5)
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Clear all availability
                  setAvailability({})
                }}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

