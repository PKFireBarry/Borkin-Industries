"use client"

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Booking } from '@/types/booking'

interface CompactAvailabilityCalendarProps {
  unavailableDates?: string[] // YYYY-MM-DD format
  bookings?: Booking[] // Optional: bookings to overlay
  initialMonth?: Date // Optional: Date object for the initial month to display
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getDaysInMonth(year: number, month: number): Date[] {
  const date = new Date(year, month, 1)
  const days: Date[] = []
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

export function CompactAvailabilityCalendar({
  unavailableDates = [],
  bookings = [],
  initialMonth,
}: CompactAvailabilityCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize today to start of day

  const [currentMonth, setCurrentMonth] = useState(() => {
    const initial = initialMonth || today
    return new Date(initial.getFullYear(), initial.getMonth(), 1)
  })

  const daysInCurrentMonth = useMemo(
    () => getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  )

  const firstDayOffset = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    return firstDay.getDay() // 0 for Sunday, 1 for Monday, etc.
  }, [currentMonth])

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const uniqueUnavailableDates = useMemo(() => new Set(unavailableDates), [unavailableDates])

  // Helper to get bookings for a specific date (inclusive of start/end)
  const getDayBookings = useMemo(() => {
    return (isoDate: string) => {
      return bookings.filter(b => {
        const bookingStart = new Date(b.startDate)
        const bookingEnd = new Date(b.endDate)
        const checkDate = new Date(isoDate)
        bookingStart.setUTCHours(0, 0, 0, 0)
        bookingEnd.setUTCHours(0, 0, 0, 0)
        checkDate.setUTCHours(0, 0, 0, 0)
        return checkDate >= bookingStart && checkDate <= bookingEnd
      })
    }
  }, [bookings])

  return (
    <div className="w-full max-w-xs mx-auto bg-background p-3 rounded-lg shadow">
      <div className="flex items-center justify-between mb-3 px-1">
        <Button
          variant="outline"
          onClick={handlePrevMonth}
          aria-label="Previous month"
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold text-foreground">
          {MONTHS_SHORT[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <Button
          variant="outline"
          onClick={handleNextMonth}
          aria-label="Next month"
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-px text-center text-xs text-muted-foreground">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div key={`${day}-${index}`} className="font-medium p-1">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px" style={{ minHeight: '150px' /* approx 5 weeks */ }}>
        {Array(firstDayOffset).fill(null).map((_, i) => (
          <div key={`empty-start-${i}`} className="p-1"></div>
        ))}
        {daysInCurrentMonth.map(date => {
          const dateStr = date.toISOString().slice(0, 10)
          const isDateToday = date.getTime() === today.getTime()
          const isUnavailable = uniqueUnavailableDates.has(dateStr)
          const dayBookings = getDayBookings(dateStr)
          const hasBookings = dayBookings.length > 0
          const hasFullDayBooking = hasBookings && dayBookings.some(b => !b.time)

          const titleText = isUnavailable
            ? `${date.toLocaleDateString()}: Unavailable`
            : hasBookings
            ? `${date.toLocaleDateString()}: ${hasFullDayBooking ? 'Booked' : 'Partially booked'}`
            : date.toLocaleDateString()

          return (
            <div
              key={dateStr}
              className={cn(
                "p-1 flex items-center justify-center aspect-square text-xs rounded-sm relative",
                isUnavailable
                  ? "bg-destructive/20 text-destructive line-through cursor-not-allowed"
                  : hasBookings
                  ? hasFullDayBooking
                    ? "bg-purple-200 text-purple-800"
                    : "bg-purple-50 text-purple-700 border border-purple-200"
                  : "text-foreground",
                isDateToday && "bg-primary/10 border border-primary text-primary font-semibold",
                !isUnavailable && !isDateToday && "hover:bg-accent cursor-default" 
              )}
              title={titleText}
            >
              {date.getDate()}
              {hasBookings && (
                <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                  {dayBookings.slice(0, 3).map((_, i) => (
                    <span key={i} className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  ))}
                  {dayBookings.length > 3 && (
                    <span className="text-[10px] font-bold text-purple-700">+</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
         {/* Fill remaining grid cells if month is short to maintain height */}
        {Array(Math.max(0, 35 - daysInCurrentMonth.length - firstDayOffset)).fill(null).map((_, i) => (
            <div key={`empty-end-${i}`} className="p-1"></div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-purple-200 rounded-xs inline-block"></span> Booked
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-destructive/20 rounded-xs inline-block"></span> Unavailable
        </div>
      </div>
    </div>
  )
} 