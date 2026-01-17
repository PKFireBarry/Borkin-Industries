'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Booking } from '@/types/booking'

interface DateRange {
  startDate: string | null
  endDate: string | null
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  minDate?: string
  className?: string
  unavailableDates?: string[]
  bookings?: Booking[]
}

interface EndDatePickerProps {
  startDate: string
  endDate: string | null
  onChange: (date: string) => void
  minDate?: string
  className?: string
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function DateRangePicker({ value, onChange, minDate, className = '', unavailableDates = [], bookings = [] }: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [hoverDate, setHoverDate] = useState<string | null>(null)

  const minDateObj = minDate ? new Date(minDate) : new Date()

  // Precompute lookups for overlays
  const unavailableSet = new Set(unavailableDates)
  const getDayBookings = (isoDate: string) => {
    return (bookings || []).filter(b => {
      const bookingStart = new Date(b.startDate)
      const bookingEnd = new Date(b.endDate)
      const checkDate = new Date(isoDate)
      bookingStart.setUTCHours(0, 0, 0, 0)
      bookingEnd.setUTCHours(0, 0, 0, 0)
      checkDate.setUTCHours(0, 0, 0, 0)
      return checkDate >= bookingStart && checkDate <= bookingEnd
    })
  }

  // Get days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  // Parse date string to Date object
  const parseDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00')
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date')
      }
      return date
    } catch (error) {
      console.error('Error parsing date:', dateStr, error)
      // Return a fallback date to prevent crashes
      return new Date()
    }
  }

  // Check if date is in range
  const isDateInRange = (date: string) => {
    if (!value.startDate || !value.endDate) return false
    const dateObj = parseDate(date)
    const startObj = parseDate(value.startDate)
    const endObj = parseDate(value.endDate)
    return dateObj >= startObj && dateObj <= endObj
  }

  // Check if date is start or end
  const isStartDate = (date: string) => value.startDate === date
  const isEndDate = (date: string) => value.endDate === date

  // Check if date is disabled
  const isDateDisabled = (date: string) => {
    const dateObj = parseDate(date)
    return dateObj < minDateObj
  }

  // Check if any date in a range is unavailable
  const rangeIncludesUnavailableDate = (start: string, end: string): boolean => {
    const startDate = parseDate(start)
    const endDate = parseDate(end)
    const current = new Date(startDate)
    while (current <= endDate) {
      const dateStr = formatDate(current)
      if (unavailableSet.has(dateStr)) return true
      current.setDate(current.getDate() + 1)
    }
    return false
  }

  // Handle date click
  const handleDateClick = (date: string) => {
    if (isDateDisabled(date)) return

    if (!value.startDate || (value.startDate && value.endDate)) {
      // Start new selection
      onChange({ startDate: date, endDate: null })
    } else if (value.startDate && !value.endDate) {
      // Require minimum 2 days - don't allow same-day selection
      if (date === value.startDate) {
        return
      }

      // Determine actual start and end
      const startObj = parseDate(value.startDate)
      const endObj = parseDate(date)
      const actualStart = endObj >= startObj ? value.startDate : date
      const actualEnd = endObj >= startObj ? date : value.startDate

      // Check if range includes unavailable dates
      if (rangeIncludesUnavailableDate(actualStart, actualEnd)) {
        return
      }

      // Complete the range
      onChange({ startDate: actualStart, endDate: actualEnd })
    }
  }

  // Navigate months
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      days.push(formatDate(date))
    }

    return days
  }

  // Format display value
  const getDisplayValue = () => {
    if (value.startDate && value.endDate) {
      const start = parseDate(value.startDate)
      const end = parseDate(value.endDate)
      const startFormatted = start.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
      const endFormatted = end.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
      return `${startFormatted} - ${endFormatted}`
    } else if (value.startDate) {
      const start = parseDate(value.startDate)
      const startFormatted = start.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
      return `${startFormatted} - Select a different end date`
    }
    return 'Click two dates to select range (min. 2 days)'
  }

  const calendarDays = generateCalendarDays()

  return (
    <div className={`date-range-picker ${className}`}>
      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="h-10 w-10 p-0 hover:bg-purple-50 hover:text-purple-600 rounded-xl flex items-center justify-center transition-colors border border-slate-200 hover:border-purple-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <h3 className="text-xl font-bold text-slate-900">
            {MONTHS[currentMonth]} {currentYear}
          </h3>
          
          <button
            type="button"
            onClick={goToNextMonth}
            className="h-10 w-10 p-0 hover:bg-purple-50 hover:text-purple-600 rounded-xl flex items-center justify-center transition-colors border border-slate-200 hover:border-purple-200"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-3">
          {DAYS.map(day => (
            <div key={day} className="text-center text-sm font-semibold text-slate-600 py-3">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={index} className="h-12" />
            }

            const disabled = isDateDisabled(date)
            const isStart = isStartDate(date)
            const isEnd = isEndDate(date)
            const inRange = isDateInRange(date)
            const isHover = hoverDate === date
            const isUnavailable = unavailableSet.has(date)
            const dayBookings = getDayBookings(date)
            const hasBookings = dayBookings.length > 0
            const hasFullDayBooking = hasBookings && dayBookings.some(b => !b.time)
            const isSelectedOrRange = isStart || isEnd || inRange

            return (
              <button
                key={date}
                type="button"
                onClick={() => handleDateClick(date)}
                onMouseEnter={() => setHoverDate(date)}
                onMouseLeave={() => setHoverDate(null)}
                disabled={disabled}
                className={`
                  h-12 w-12 text-sm rounded-xl transition-all duration-200 relative font-medium
                  ${disabled 
                    ? 'text-slate-300 cursor-not-allowed' 
                    : 'text-slate-700 hover:bg-purple-50 hover:text-purple-600 cursor-pointer hover:scale-105'
                  }
                  ${isStart || isEnd 
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg transform scale-105' 
                    : ''
                  }
                  ${inRange && !isStart && !isEnd 
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                    : ''
                  }
                  ${isHover && !disabled && !isStart && !isEnd 
                    ? 'bg-purple-50 text-purple-600 scale-105' 
                    : ''
                  }
                  ${isUnavailable && !isSelectedOrRange && !disabled
                    ? 'bg-red-50 text-red-600 line-through'
                    : ''
                  }
                  ${hasFullDayBooking && !isSelectedOrRange && !disabled
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : ''
                  }
                `}
              >
                {parseDate(date).getDate()}
                {(isStart || isEnd) && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-purple-600"></div>
                )}
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
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Range Display */}
      <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200/60">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-700 mb-1">Selected Date Range</p>
            <p className="text-lg font-bold text-purple-900">
              {getDisplayValue()}
            </p>
          </div>
          {value.startDate && value.endDate && (
            <div className="text-right">
              <p className="text-sm font-medium text-purple-700 mb-1">Duration</p>
              <p className="text-lg font-bold text-purple-900">
                {(() => {
                  const start = parseDate(value.startDate)
                  const end = parseDate(value.endDate)
                  const diffTime = Math.abs(end.getTime() - start.getTime())
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`
                })()}
              </p>
            </div>
          )}
        </div>
        
        {/* Clear selection button */}
        {(value.startDate || value.endDate) && (
          <div className="mt-3 pt-3 border-t border-purple-200">
            <button
              type="button"
              onClick={() => onChange({ startDate: null, endDate: null })}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function EndDatePicker({ startDate, endDate, onChange, minDate, className = '' }: EndDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [hoverDate, setHoverDate] = useState<string | null>(null)

  const minDateObj = minDate ? new Date(minDate) : new Date(startDate)

  // Ensure we start with the month containing the start date or current date
  useEffect(() => {
    const dateToShow = endDate ? new Date(endDate) : new Date(startDate)
    setCurrentMonth(dateToShow.getMonth())
    setCurrentYear(dateToShow.getFullYear())
  }, [startDate, endDate])

  // Get days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  // Parse date string to Date object
  const parseDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00')
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date')
      }
      return date
    } catch (error) {
      console.error('Error parsing date:', dateStr, error)
      // Return a fallback date to prevent crashes
      return new Date()
    }
  }

  // Check if date is in range (between start and end/hover)
  const isDateInRange = (date: string) => {
    const dateObj = parseDate(date)
    const startObj = parseDate(startDate)
    const endObj = endDate ? parseDate(endDate) : (hoverDate ? parseDate(hoverDate) : null)
    
    if (!endObj) return false
    return dateObj > startObj && dateObj < endObj
  }

  // Check if date is start or end
  const isStartDate = (date: string) => startDate === date
  const isEndDate = (date: string) => endDate === date

  // Check if date is disabled
  const isDateDisabled = (date: string) => {
    const dateObj = parseDate(date)
    const startObj = parseDate(startDate)
    return dateObj < minDateObj || dateObj <= startObj
  }

  // Handle date click
  const handleDateClick = (date: string) => {
    if (isDateDisabled(date)) return
    onChange(date)
  }

  // Navigate months
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      days.push(formatDate(date))
    }

    return days
  }

  // Format display value
  const getDisplayValue = () => {
    if (endDate) {
      const start = parseDate(startDate)
      const end = parseDate(endDate)
      const startFormatted = start.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
      const endFormatted = end.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
      return `${startFormatted} - ${endFormatted}`
    } else {
      const start = parseDate(startDate)
      const startFormatted = start.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
      return `${startFormatted} - Select end date`
    }
  }

  const calendarDays = generateCalendarDays()

  return (
    <div className={`end-date-picker ${className}`}>
      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="h-10 w-10 p-0 hover:bg-purple-50 hover:text-purple-600 rounded-xl flex items-center justify-center transition-colors border border-slate-200 hover:border-purple-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <h3 className="text-xl font-bold text-slate-900">
            {MONTHS[currentMonth]} {currentYear}
          </h3>
          
          <button
            type="button"
            onClick={goToNextMonth}
            className="h-10 w-10 p-0 hover:bg-purple-50 hover:text-purple-600 rounded-xl flex items-center justify-center transition-colors border border-slate-200 hover:border-purple-200"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-3">
          {DAYS.map(day => (
            <div key={day} className="text-center text-sm font-semibold text-slate-600 py-3">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={index} className="h-12" />
            }

            const disabled = isDateDisabled(date)
            const isStart = isStartDate(date)
            const isEnd = isEndDate(date)
            const inRange = isDateInRange(date)
            const isHover = hoverDate === date

            return (
              <button
                key={date}
                type="button"
                onClick={() => handleDateClick(date)}
                onMouseEnter={() => setHoverDate(date)}
                onMouseLeave={() => setHoverDate(null)}
                disabled={disabled}
                className={`
                  h-12 w-12 text-sm rounded-xl transition-all duration-200 relative font-medium
                  ${disabled 
                    ? 'text-slate-300 cursor-not-allowed' 
                    : 'text-slate-700 hover:bg-purple-50 hover:text-purple-600 cursor-pointer hover:scale-105'
                  }
                  ${isStart 
                    ? 'bg-slate-400 text-white cursor-not-allowed' 
                    : ''
                  }
                  ${isEnd 
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg transform scale-105' 
                    : ''
                  }
                  ${inRange && !isStart && !isEnd 
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                    : ''
                  }
                  ${isHover && !disabled && !isStart && !isEnd 
                    ? 'bg-purple-50 text-purple-600 scale-105' 
                    : ''
                  }
                `}
              >
                {parseDate(date).getDate()}
                {isStart && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-slate-400 rounded-full border-2 border-slate-600"></div>
                )}
                {isEnd && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-purple-600"></div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Range Display */}
      <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200/60">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-700 mb-1">Service Period</p>
            <p className="text-lg font-bold text-purple-900">
              {getDisplayValue()}
            </p>
          </div>
          {endDate && (
            <div className="text-right">
              <p className="text-sm font-medium text-purple-700 mb-1">Duration</p>
              <p className="text-lg font-bold text-purple-900">
                {(() => {
                  const start = parseDate(startDate)
                  const end = parseDate(endDate)
                  const diffTime = Math.abs(end.getTime() - start.getTime())
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`
                })()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 