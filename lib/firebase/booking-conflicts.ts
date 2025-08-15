import { db } from '../../firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import type { Booking } from '@/types/booking'
import type { TimeSlot } from '@/types/contractor'

export interface BookingConflict {
  bookingId: string
  conflictDate: string
  conflictTime: TimeSlot
  clientName?: string
  services: string[]
}

export interface AvailabilitySlot {
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
  conflictingBookings?: BookingConflict[]
}

/**
 * Check if two time slots overlap
 */
export function doTimeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  return slot1.startTime < slot2.endTime && slot1.endTime > slot2.startTime
}

/**
 * Get all bookings for a contractor within a date range
 */
export async function getContractorBookingsInRange(
  contractorId: string,
  startDate: string,
  endDate: string
): Promise<Booking[]> {
  const bookingsRef = collection(db, 'bookings')
  const q = query(
    bookingsRef,
    where('contractorId', '==', contractorId),
    where('status', 'in', ['approved', 'completed']) // Only consider confirmed bookings
  )
  
  const snapshot = await getDocs(q)
  const allBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking))
  
  // Filter bookings that overlap with the requested date range
  const start = new Date(startDate)
  const end = new Date(endDate)
  start.setUTCHours(0, 0, 0, 0)
  end.setUTCHours(23, 59, 59, 999)
  
  return allBookings.filter(booking => {
    const bookingStart = new Date(booking.startDate)
    const bookingEnd = new Date(booking.endDate)
    bookingStart.setUTCHours(0, 0, 0, 0)
    bookingEnd.setUTCHours(23, 59, 59, 999)
    
    // Check if booking dates overlap with requested range
    return bookingStart <= end && bookingEnd >= start
  })
}

/**
 * Check if a new booking conflicts with existing bookings
 */
export async function checkBookingConflicts(
  contractorId: string,
  startDate: string,
  endDate: string,
  timeSlot?: TimeSlot,
  excludeBookingId?: string
): Promise<BookingConflict[]> {
  const existingBookings = await getContractorBookingsInRange(contractorId, startDate, endDate)
  const conflicts: BookingConflict[] = []
  
  const requestStart = new Date(startDate)
  const requestEnd = new Date(endDate)
  requestStart.setUTCHours(0, 0, 0, 0)
  requestEnd.setUTCHours(0, 0, 0, 0)
  
  for (const booking of existingBookings) {
    // Skip if this is the same booking (for updates)
    if (excludeBookingId && booking.id === excludeBookingId) {
      continue
    }
    
    const bookingStart = new Date(booking.startDate)
    const bookingEnd = new Date(booking.endDate)
    bookingStart.setUTCHours(0, 0, 0, 0)
    bookingEnd.setUTCHours(0, 0, 0, 0)
    
    // Check each day that overlaps
    for (let d = new Date(Math.max(requestStart.getTime(), bookingStart.getTime())); 
         d <= new Date(Math.min(requestEnd.getTime(), bookingEnd.getTime())); 
         d.setDate(d.getDate() + 1)) {
      
      const dateStr = d.toISOString().slice(0, 10)
      
      // If no time specified for either booking, it's a full-day conflict
      if (!timeSlot && !booking.time) {
        conflicts.push({
          bookingId: booking.id,
          conflictDate: dateStr,
          conflictTime: { startTime: '00:00', endTime: '23:59' },
          services: booking.services?.map(s => s.name || s.serviceId) || [booking.serviceType || 'Unknown Service']
        })
        continue
      }
      
      // If one booking has time and the other doesn't, it's a conflict
      if (!timeSlot && booking.time) {
        conflicts.push({
          bookingId: booking.id,
          conflictDate: dateStr,
          conflictTime: booking.time,
          services: booking.services?.map(s => s.name || s.serviceId) || [booking.serviceType || 'Unknown Service']
        })
        continue
      }
      
      if (timeSlot && !booking.time) {
        conflicts.push({
          bookingId: booking.id,
          conflictDate: dateStr,
          conflictTime: { startTime: '00:00', endTime: '23:59' },
          services: booking.services?.map(s => s.name || s.serviceId) || [booking.serviceType || 'Unknown Service']
        })
        continue
      }
      
      // Both bookings have time slots - check for overlap
      if (timeSlot && booking.time && doTimeSlotsOverlap(timeSlot, booking.time)) {
        conflicts.push({
          bookingId: booking.id,
          conflictDate: dateStr,
          conflictTime: booking.time,
          services: booking.services?.map(s => s.name || s.serviceId) || [booking.serviceType || 'Unknown Service']
        })
      }
    }
  }
  
  return conflicts
}

/**
 * Get available time slots for a contractor on a specific date
 */
export async function getAvailableTimeSlots(
  contractorId: string,
  date: string,
  duration: number = 4, // Default 4 hours
  interval: number = 1 // Check every hour
): Promise<AvailabilitySlot[]> {
  const existingBookings = await getContractorBookingsInRange(contractorId, date, date)
  const slots: AvailabilitySlot[] = []
  
  // Generate time slots from 6 AM to 10 PM
  for (let hour = 6; hour <= 22 - duration; hour += interval) {
    const startTime = `${hour.toString().padStart(2, '0')}:00`
    const endTime = `${(hour + duration).toString().padStart(2, '0')}:00`
    
    const timeSlot: TimeSlot = { startTime, endTime }
    const conflicts: BookingConflict[] = []
    
    // Check against existing bookings
    for (const booking of existingBookings) {
      const bookingStart = new Date(booking.startDate)
      const bookingEnd = new Date(booking.endDate)
      const checkDate = new Date(date)
      
      // Check if this date falls within the booking range
      if (checkDate >= bookingStart && checkDate <= bookingEnd) {
        // If booking has no time, it's a full-day booking
        if (!booking.time) {
          conflicts.push({
            bookingId: booking.id,
            conflictDate: date,
            conflictTime: { startTime: '00:00', endTime: '23:59' },
            services: booking.services?.map(s => s.name || s.serviceId) || [booking.serviceType || 'Unknown Service']
          })
        } else if (doTimeSlotsOverlap(timeSlot, booking.time)) {
          conflicts.push({
            bookingId: booking.id,
            conflictDate: date,
            conflictTime: booking.time,
            services: booking.services?.map(s => s.name || s.serviceId) || [booking.serviceType || 'Unknown Service']
          })
        }
      }
    }
    
    slots.push({
      date,
      startTime,
      endTime,
      isAvailable: conflicts.length === 0,
      conflictingBookings: conflicts.length > 0 ? conflicts : undefined
    })
  }
  
  return slots
}

/**
 * Get contractor's schedule for a date range showing all bookings and availability
 */
export async function getContractorSchedule(
  contractorId: string,
  startDate: string,
  endDate: string
): Promise<{
  date: string
  bookings: Booking[]
  availableSlots: AvailabilitySlot[]
}[]> {
  const existingBookings = await getContractorBookingsInRange(contractorId, startDate, endDate)
  const schedule: { date: string; bookings: Booking[]; availableSlots: AvailabilitySlot[] }[] = []
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  start.setUTCHours(0, 0, 0, 0)
  end.setUTCHours(0, 0, 0, 0)
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    
    // Get bookings for this date
    const dayBookings = existingBookings.filter(booking => {
      const bookingStart = new Date(booking.startDate)
      const bookingEnd = new Date(booking.endDate)
      bookingStart.setUTCHours(0, 0, 0, 0)
      bookingEnd.setUTCHours(0, 0, 0, 0)
      
      return d >= bookingStart && d <= bookingEnd
    })
    
    // Get available slots for this date
    const availableSlots = await getAvailableTimeSlots(contractorId, dateStr)
    
    schedule.push({
      date: dateStr,
      bookings: dayBookings,
      availableSlots
    })
  }
  
  return schedule
}

/**
 * Validate a booking request against existing bookings and contractor availability
 */
export async function validateBookingRequest(
  contractorId: string,
  startDate: string,
  endDate: string,
  timeSlot?: TimeSlot,
  excludeBookingId?: string
): Promise<{
  isValid: boolean
  conflicts: BookingConflict[]
  message?: string
}> {
  try {
    const conflicts = await checkBookingConflicts(
      contractorId,
      startDate,
      endDate,
      timeSlot,
      excludeBookingId
    )
    
    if (conflicts.length > 0) {
      const conflictDates = [...new Set(conflicts.map(c => c.conflictDate))].join(', ')
      return {
        isValid: false,
        conflicts,
        message: `Booking conflicts with existing bookings on: ${conflictDates}`
      }
    }
    
    return {
      isValid: true,
      conflicts: []
    }
  } catch (error) {
    console.error('Error validating booking request:', error)
    return {
      isValid: false,
      conflicts: [],
      message: 'Failed to validate booking request'
    }
  }
}