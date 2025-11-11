/**
 * Availability utility functions for developer discoverability and recommendations
 */

type TimeSlot = {
  start: string
  end: string
}

type AvailabilityData = Record<string, TimeSlot[]>

/**
 * Check if a developer is available at a specific day and time
 */
export function isAvailableAt(
  availability: AvailabilityData | null | undefined,
  day: string,
  time: string
): boolean {
  if (!availability) return false

  const dayKey = day.toLowerCase()
  const daySlots = availability[dayKey] || availability[day] || []

  if (daySlots.length === 0) return false

  return daySlots.some((slot) => {
    const slotStart = slot.start
    const slotEnd = slot.end
    return time >= slotStart && time <= slotEnd
  })
}

/**
 * Check if a developer is available today
 */
export function isAvailableToday(
  availability: AvailabilityData | null | undefined
): boolean {
  if (!availability) return false

  const today = new Date()
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
  const currentTime = today.toTimeString().slice(0, 5) // HH:MM format

  return isAvailableAt(availability, dayName, currentTime)
}

/**
 * Check if a developer is available this week (has any availability slots)
 */
export function isAvailableThisWeek(
  availability: AvailabilityData | null | undefined
): boolean {
  if (!availability) return false

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return days.some((day) => {
    const dayKey = day.toLowerCase()
    const daySlots = availability[dayKey] || availability[day] || []
    return daySlots.length > 0
  })
}

/**
 * Get availability score for ranking (0-100)
 * Higher score = more available
 */
export function getAvailabilityScore(
  availability: AvailabilityData | null | undefined
): number {
  if (!availability) return 0

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  let totalSlots = 0
  let daysWithAvailability = 0

  days.forEach((day) => {
    const dayKey = day.toLowerCase()
    const daySlots = availability[dayKey] || availability[day] || []
    if (daySlots.length > 0) {
      daysWithAvailability++
      totalSlots += daySlots.length
    }
  })

  // Score based on:
  // - Days with availability (max 70 points: 7 days * 10 points)
  // - Total time slots (max 30 points: normalized)
  const daysScore = Math.min(daysWithAvailability * 10, 70)
  const slotsScore = Math.min((totalSlots / 14) * 30, 30) // Normalize to max 2 slots per day

  return Math.round(daysScore + slotsScore)
}

/**
 * Check if developer has availability set up
 */
export function hasAvailabilitySet(
  availability: AvailabilityData | null | undefined
): boolean {
  if (!availability) return false
  return isAvailableThisWeek(availability)
}

