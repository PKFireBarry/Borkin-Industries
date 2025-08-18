import type { PlatformService } from '@/types/service'

/**
 * Default service durations in minutes
 */
export const DEFAULT_SERVICE_DURATIONS = {
  'dog-walking': 60,
  'medication': 60,
  'baths': 60,
  'nail-trims': 60,
  'drop-ins': 60,
  'overnight-stays': 720, // 12 hours
} as const

/**
 * Calculate total duration for multiple services
 */
export function calculateTotalDuration(services: PlatformService[]): number {
  return services.reduce((total, service) => total + service.durationMinutes, 0)
}

/**
 * Calculate end time based on start time and duration
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(hours, minutes, 0, 0)
  
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)
  
  return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
}

/**
 * Check if a time slot can accommodate the booking duration
 */
export function canAccommodateBooking(
  startTime: string,
  durationMinutes: number,
  maxEndTime: string = '22:00'
): boolean {
  const endTime = calculateEndTime(startTime, durationMinutes)
  return endTime <= maxEndTime
}

/**
 * Generate valid time slots for a given duration
 */
export function generateValidTimeSlots(
  durationMinutes: number,
  startHour: number = 8,
  endHour: number = 22,
  intervalMinutes: number = 30
): string[] {
  const slots: string[] = []
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      
      if (canAccommodateBooking(timeSlot, durationMinutes, `${endHour}:00`)) {
        slots.push(timeSlot)
      }
    }
  }
  
  return slots
}

/**
 * Format duration in a human-readable way
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`
  }
  
  return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMinutes} min`
}
