"use client"
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
  CalendarX,
  CalendarCheck,
  Info,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DayAvailability, TimeSlot } from '@/types/contractor'
import type { Booking } from '@/types/booking'

interface TimeBasedAvailabilityCalendarProps {
  dailyAvailability: DayAvailability[]
  onAvailabilityChange: (availability: DayAvailability[]) => void
  existingBookings?: AvailabilityCalendarBooking[]
}

export type AvailabilityCalendarBooking = Booking & {
  clientName?: string
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

function isTimeSlotOverlapping(slot1: TimeSlot, slot2: TimeSlot): boolean {
  const start1 = slot1.startTime
  const end1 = slot1.endTime
  const start2 = slot2.startTime
  const end2 = slot2.endTime

  return (start1 < end2 && end1 > start2)
}

export function TimeBasedAvailabilityCalendar({
  dailyAvailability,
  onAvailabilityChange,
  existingBookings = []
}: TimeBasedAvailabilityCalendarProps) {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>('single')

  // Range selection state
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [rangeEnd, setRangeEnd] = useState<string | null>(null)

  const daysInMonth = getDaysInMonth(calendarMonth.year, calendarMonth.month)
  const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1).getDay()
  const today = new Date().toISOString().slice(0, 10)

  // Get availability for a specific date
  const getDayAvailability = (date: string): DayAvailability | null => {
    return dailyAvailability.find(day => day.date === date) || null
  }

  // Get bookings for a specific date
  const getDayBookings = (date: string): AvailabilityCalendarBooking[] => {
    return existingBookings.filter(booking => {
      const bookingStart = new Date(booking.startDate)
      const bookingEnd = new Date(booking.endDate)
      const checkDate = new Date(date)

      bookingStart.setUTCHours(0, 0, 0, 0)
      bookingEnd.setUTCHours(0, 0, 0, 0)
      checkDate.setUTCHours(0, 0, 0, 0)

      return checkDate >= bookingStart && checkDate <= bookingEnd
    })
  }

  // Update availability for a specific date
  // Update availability for a specific date
  const updateDayAvailability = (date: string, dayAvail: Partial<DayAvailability>) => {
    const updated = dailyAvailability.filter(day => day.date !== date)

    // Find existing data for this day to merge with
    const current = dailyAvailability.find(day => day.date === date)

    // Merge existing data with updates
    // If no existing data, start with basic object
    const merged: DayAvailability = {
      ...(current || { date }),
      ...dayAvail,
      date // Ensure date is correct
    }

    // Only keep the day in the array if it has some relevant data
    // (is blocked, has unavailable slots, or has available slots)
    if (merged.isFullyUnavailable ||
      (merged.unavailableSlots && merged.unavailableSlots.length > 0) ||
      (merged.availableSlots && merged.availableSlots.length > 0)) {
      updated.push(merged)
    }

    onAvailabilityChange(updated)
  }

  // Toggle full day availability
  const toggleFullDayAvailability = (date: string) => {
    const current = getDayAvailability(date)
    if (current?.isFullyUnavailable) {
      // Remove full day block
      updateDayAvailability(date, { isFullyUnavailable: false, unavailableSlots: [] })
    } else {
      // Block full day
      updateDayAvailability(date, { isFullyUnavailable: true, unavailableSlots: [], availableSlots: [] })
    }
  }

  // Add unavailable time slot
  const addUnavailableSlot = (date: string, slot: TimeSlot) => {
    const current = getDayAvailability(date) || { date }
    const unavailableSlots = [...(current.unavailableSlots || [])]

    // Check for overlaps
    const hasOverlap = unavailableSlots.some(existing => isTimeSlotOverlapping(slot, existing))
    if (hasOverlap) {
      alert('This time slot overlaps with an existing unavailable period.')
      return
    }

    unavailableSlots.push(slot)
    unavailableSlots.sort((a, b) => a.startTime.localeCompare(b.startTime))

    updateDayAvailability(date, {
      ...current,
      unavailableSlots,
      isFullyUnavailable: false
    })
  }

  // Remove unavailable time slot
  const removeUnavailableSlot = (date: string, index: number) => {
    const current = getDayAvailability(date)
    if (!current?.unavailableSlots) return

    const unavailableSlots = current.unavailableSlots.filter((_, i) => i !== index)
    updateDayAvailability(date, { ...current, unavailableSlots })
  }

  const handleDayClick = (iso: string) => {
    if (selectionMode === 'single') {
      setSelectedDate(iso)
      setRangeStart(null)
      setRangeEnd(null)
      return
    }

    if (!rangeStart || rangeEnd) {
      setRangeStart(iso)
      setRangeEnd(null)
      setSelectedDate(null)
      return
    }

    const start = new Date(rangeStart)
    const end = new Date(iso)

    if (start > end) {
      setRangeStart(iso)
      setRangeEnd(rangeStart)
    } else {
      setRangeEnd(iso)
    }
  }

  // Block range of days
  const blockDateRange = () => {
    if (!rangeStart || !rangeEnd) return

    const dates = getRangePreviewDates()
    const updated = [...dailyAvailability]

    dates.forEach(date => {
      // Remove existing availability for this date
      const index = updated.findIndex(day => day.date === date)
      if (index >= 0) {
        updated[index] = { date, isFullyUnavailable: true, unavailableSlots: [], availableSlots: [] }
      } else {
        updated.push({ date, isFullyUnavailable: true, unavailableSlots: [], availableSlots: [] })
      }
    })

    onAvailabilityChange(updated)

    // Clear range selection
    setRangeStart(null)
    setRangeEnd(null)
  }

  // Clear range selection
  const clearRangeSelection = () => {
    setRangeStart(null)
    setRangeEnd(null)
  }

  const activateSingleDayMode = () => {
    setSelectionMode('single')
    setRangeStart(null)
    setRangeEnd(null)
  }

  const activateRangeMode = () => {
    setSelectionMode('range')
    setSelectedDate(null)
    setRangeStart(null)
    setRangeEnd(null)
  }

  // Get range preview dates
  const getRangePreviewDates = (): string[] => {
    if (!rangeStart || !rangeEnd) return []

    const start = new Date(rangeStart)
    const end = new Date(rangeEnd)
    const dates: string[] = []

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10))
    }

    return dates
  }

  const rangePreviewDates = getRangePreviewDates()

  // Get day styling
  const getDayClassName = (iso: string) => {
    const baseClasses = "aspect-square w-full rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md relative cursor-pointer"

    const isToday = iso === today
    const isSelected = selectedDate === iso
    const isInRangePreview = rangePreviewDates.includes(iso)
    const isRangeStart = rangeStart === iso
    const isRangeEnd = rangeEnd === iso
    const dayAvail = getDayAvailability(iso)
    const dayBookings = getDayBookings(iso)

    // Range preview styling (highest priority after selection)
    if (isInRangePreview) {
      if (isRangeStart || isRangeEnd) {
        return `${baseClasses} bg-blue-500 text-white border-2 border-blue-600 shadow-lg ring-2 ring-blue-200`
      }
      return `${baseClasses} bg-blue-200 text-blue-800 border-2 border-blue-300 shadow-md`
    }

    if (isSelected) {
      return `${baseClasses} bg-blue-500 text-white border-2 border-blue-600 shadow-lg ring-2 ring-blue-200`
    }

    if (dayAvail?.isFullyUnavailable) {
      return `${baseClasses} bg-red-100 text-red-700 border-2 border-red-200`
    }

    // Show bookings with higher priority than availability blocks
    if (dayBookings.length > 0) {
      const hasFullDayBooking = dayBookings.some(b => !b.time)
      if (hasFullDayBooking) {
        return `${baseClasses} bg-purple-100 text-purple-700 border-2 border-purple-200`
      } else {
        return `${baseClasses} bg-purple-50 text-purple-600 border-2 border-purple-200`
      }
    }

    if (dayAvail?.unavailableSlots?.length) {
      return `${baseClasses} bg-orange-100 text-orange-700 border-2 border-orange-200`
    }

    if (isToday) {
      return `${baseClasses} bg-white text-slate-900 border-2 border-primary shadow-md ring-2 ring-primary/20`
    }

    return `${baseClasses} bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50`
  }

  // Build calendar grid
  const days: (string | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(calendarMonth.year, calendarMonth.month, d).toISOString().slice(0, 10)
    days.push(iso)
  }

  const goToPreviousMonth = () => {
    setCalendarMonth(m => ({
      year: m.month === 0 ? m.year - 1 : m.year,
      month: m.month === 0 ? 11 : m.month - 1
    }))
  }

  const goToNextMonth = () => {
    setCalendarMonth(m => ({
      year: m.month === 11 ? m.year + 1 : m.year,
      month: m.month === 11 ? 0 : m.month + 1
    }))
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(18rem,1fr)] lg:gap-4 xl:grid-cols-[minmax(0,1.95fr)_minmax(19rem,1fr)]">
      {/* Calendar Section */}
      <div>
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-3 lg:pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 lg:text-xl">
                <Calendar className="w-5 h-5 text-primary" />
                {new Date(calendarMonth.year, calendarMonth.month).toLocaleString('default', {
                  month: 'long',
                  year: 'numeric'
                })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={goToPreviousMonth}
                  className="h-8 w-8 rounded-full p-0 hover:bg-slate-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={goToNextMonth}
                  className="h-8 w-8 rounded-full p-0 hover:bg-slate-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 lg:space-y-3">
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-3 lg:flex-row lg:items-center lg:justify-between lg:p-2.5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Interaction mode</p>
                <p className="mt-1 text-xs text-slate-600 lg:text-[11px]">
                  {selectionMode === 'single'
                    ? 'Click any day once to edit or unblock it.'
                    : 'Pick a start day and an end day to block a full range.'}
                </p>
              </div>
              <div className="grid h-11 w-full grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100/80 p-1 lg:w-[16rem]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={activateSingleDayMode}
                  className={cn(
                    'h-full rounded-xl text-xs font-medium',
                    selectionMode === 'single' ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-slate-600 hover:bg-white'
                  )}
                >
                  Single day
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={activateRangeMode}
                  className={cn(
                    'h-full rounded-xl text-xs font-medium',
                    selectionMode === 'range' ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-slate-600 hover:bg-white'
                  )}
                >
                  Block range
                </Button>
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="rounded-xl bg-slate-50 p-3 lg:p-2.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs lg:gap-x-3 lg:text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white rounded border border-slate-200"></div>
                  <span className="text-slate-600">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-100 rounded border-2 border-orange-200"></div>
                  <span className="text-slate-600">Partially Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 rounded border-2 border-red-200"></div>
                  <span className="text-slate-600">Fully Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-100 rounded border-2 border-purple-200"></div>
                  <span className="text-slate-600">Has Bookings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded border-2 border-blue-600"></div>
                  <span className="text-slate-600">Selected</span>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 lg:gap-1.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 lg:py-1">
                  {d}
                </div>
              ))}
              {days.map((iso, idx) => iso ? (
                <button
                  key={iso}
                  className={getDayClassName(iso)}
                  onClick={() => handleDayClick(iso)}
                  type="button"
                >
                  <span className="relative z-10">
                    {parseInt(iso.slice(-2))}
                  </span>
                  {iso === today && (
                    <div className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse"></div>
                  )}
                  {/* Show indicators */}
                  {(() => {
                    const dayBookings = getDayBookings(iso)
                    const dayAvail = getDayAvailability(iso)

                    if (dayBookings.length > 0) {
                      return (
                        <div className="absolute bottom-1 right-1 flex gap-1">
                          {dayBookings.slice(0, 3).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                          ))}
                          {dayBookings.length > 3 && (
                            <div className="text-xs font-bold text-purple-600">+</div>
                          )}
                        </div>
                      )
                    }

                    if (dayAvail?.unavailableSlots?.length && !dayAvail?.isFullyUnavailable) {
                      return <div className="absolute bottom-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                    }

                    return null
                  })()}
                </button>
              ) : <div key={idx} className="aspect-square" />)}
            </div>

            {/* Instructions */}
            <div className="rounded-xl bg-slate-50 p-3 lg:p-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-600 lg:text-[11px]">
                <Info className="w-4 h-4" />
                <span>
                  {selectionMode === 'single'
                    ? 'Click a date once to manage that day and block or unblock specific times.'
                    : 'Choose a start and end date, then confirm the range block from the sidebar.'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-4 lg:space-y-3">
        {selectionMode === 'range' && rangeStart && rangeEnd ? (
          <RangeBlockingManager
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            rangePreviewDates={rangePreviewDates}
            onBlockRange={blockDateRange}
            onClearRange={activateRangeMode}
          />
        ) : selectedDate ? (
          <DayAvailabilityManager
            date={selectedDate}
            dayAvailability={getDayAvailability(selectedDate)}
            dayBookings={getDayBookings(selectedDate)}
            onToggleFullDay={() => toggleFullDayAvailability(selectedDate)}
            onAddUnavailableSlot={(slot) => addUnavailableSlot(selectedDate, slot)}
            onRemoveUnavailableSlot={(index) => removeUnavailableSlot(selectedDate, index)}
          />
        ) : (
          <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="py-6 text-center lg:py-4">
                <Calendar className="mx-auto mb-3 h-10 w-10 text-slate-400 lg:mb-2 lg:h-8 lg:w-8" />
                <p className="mb-1 font-medium text-slate-600">
                  {selectionMode === 'range' ? 'Select a date range' : 'Select a date'}
                </p>
                <p className="text-sm text-slate-500">
                  {selectionMode === 'range'
                    ? 'Choose a start date and an end date to block a full range.'
                    : 'Click on a date once to manage its availability and unblock it immediately if needed.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

interface DayAvailabilityManagerProps {
  date: string
  dayAvailability: DayAvailability | null
  dayBookings: AvailabilityCalendarBooking[]
  onToggleFullDay: () => void
  onAddUnavailableSlot: (slot: TimeSlot) => void
  onRemoveUnavailableSlot: (index: number) => void
}

interface RangeBlockingManagerProps {
  rangeStart: string
  rangeEnd: string
  rangePreviewDates: string[]
  onBlockRange: () => void
  onClearRange: () => void
}

function RangeBlockingManager({
  rangeStart,
  rangeEnd,
  rangePreviewDates,
  onBlockRange,
  onClearRange
}: RangeBlockingManagerProps) {
  const startDate = new Date(rangeStart + 'T00:00:00')
  const endDate = new Date(rangeEnd + 'T00:00:00')

  const formatDateRange = () => {
    const startFormatted = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
    const endFormatted = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })

    if (rangeStart === rangeEnd) {
      return startFormatted
    }

    return `${startFormatted} - ${endFormatted}`
  }

  return (
    <>
      {/* Range Preview */}
      <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
        <CardHeader className="pb-3 lg:pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 lg:text-lg">
            <Calendar className="w-5 h-5 text-blue-500" />
            Range Selected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 lg:space-y-2.5">
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-3 lg:p-2.5">
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold text-blue-800">
                {formatDateRange()}
              </div>
              <div className="text-sm text-blue-600">
                {rangePreviewDates.length} day{rangePreviewDates.length !== 1 ? 's' : ''} selected
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              onClick={onBlockRange}
              className="rounded-xl bg-red-500 py-2.5 font-semibold text-white hover:bg-red-600"
            >
              <CalendarX className="w-4 h-4 mr-2" />
              Block {rangePreviewDates.length} Day{rangePreviewDates.length !== 1 ? 's' : ''}
            </Button>
            <Button
              onClick={onClearRange}
              variant="outline"
              className="rounded-xl py-2.5 hover:bg-slate-50"
            >
              Clear
            </Button>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 lg:p-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-600 lg:text-[11px]">
              <Info className="w-4 h-4" />
              <span>This will block the entire selected range. Click "Clear" to select individual days instead.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function DayAvailabilityManager({
  date,
  dayAvailability,
  dayBookings,
  onToggleFullDay,
  onAddUnavailableSlot,
  onRemoveUnavailableSlot
}: DayAvailabilityManagerProps) {
  const [newSlot, setNewSlot] = useState<TimeSlot>({ startTime: '09:00', endTime: '17:00' })

  const handleAddSlot = () => {
    if (newSlot.startTime >= newSlot.endTime) {
      alert('End time must be after start time.')
      return
    }
    onAddUnavailableSlot(newSlot)
    setNewSlot({ startTime: '09:00', endTime: '17:00' })
  }

  const dateObj = new Date(date + 'T00:00:00')
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })

  return (
    <>
      {/* Date Header */}
      <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
        <CardHeader className="pb-3 lg:pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 lg:text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            {formattedDate}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onToggleFullDay}
            variant={dayAvailability?.isFullyUnavailable ? "default" : "outline"}
            className={cn(
              "w-full rounded-xl py-2.5 font-semibold transition-all duration-200",
              dayAvailability?.isFullyUnavailable
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "hover:bg-red-50 hover:border-red-300 hover:text-red-700"
            )}
          >
            <CalendarX className="w-4 h-4 mr-2" />
            {dayAvailability?.isFullyUnavailable ? 'Unblock Full Day' : 'Block Full Day'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Bookings */}
      {dayBookings.length > 0 && (
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
          <CardHeader className="pb-3 lg:pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 lg:text-lg">
              <Calendar className="w-5 h-5 text-purple-500" />
              Existing Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {dayBookings.map((booking) => (
              <div key={booking.id} className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <div className="text-sm font-semibold text-purple-800">
                      {booking.time ?
                        `${formatTime(booking.time.startTime)} - ${formatTime(booking.time.endTime)}` :
                        'Full Day'
                      }
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {booking.status}
                  </Badge>
                </div>
                <div className="text-xs text-purple-600 space-y-1">
                  {booking.clientName ? <div>Client: {booking.clientName}</div> : null}
                  <div>Services: {booking.services?.map(s => s.name).join(', ') || booking.serviceType}</div>
                  {booking.numberOfDays > 1 && (
                    <div>Multi-day booking ({booking.numberOfDays} days)</div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Time Slots Management */}
      {!dayAvailability?.isFullyUnavailable && (
        <>
          {/* Add New Time Slot */}
          <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
            <CardHeader className="pb-3 lg:pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 lg:text-lg">
                <Plus className="w-5 h-5 text-green-500" />
                Block Time Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Start Time</label>
                  <Input
                    type="time"
                    value={newSlot.startTime}
                    onChange={(e) => setNewSlot(prev => ({ ...prev, startTime: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">End Time</label>
                  <Input
                    type="time"
                    value={newSlot.endTime}
                    onChange={(e) => setNewSlot(prev => ({ ...prev, endTime: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddSlot}
                className="w-full rounded-xl bg-green-500 py-2.5 font-semibold text-white hover:bg-green-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Unavailable Period
              </Button>
            </CardContent>
          </Card>

          {/* Existing Unavailable Slots */}
          <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
            <CardHeader className="pb-3 lg:pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 lg:text-lg">
                <Clock className="w-5 h-5 text-orange-500" />
                Unavailable Periods
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!dayAvailability?.unavailableSlots?.length ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                  <CalendarCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium mb-1">Fully Available</p>
                  <p className="text-sm text-slate-500">No blocked time periods for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayAvailability.unavailableSlots.map((slot, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <div>
                          <div className="text-sm font-semibold text-orange-800">
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </div>
                          <div className="text-xs text-orange-600">
                            {(() => {
                              const start = new Date(`2000-01-01T${slot.startTime}:00`)
                              const end = new Date(`2000-01-01T${slot.endTime}:00`)
                              const diffMs = end.getTime() - start.getTime()
                              const hours = Math.floor(diffMs / (1000 * 60 * 60))
                              const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                              return `${hours}h ${minutes}m`
                            })()}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => onRemoveUnavailableSlot(index)}
                        className="h-8 w-8 p-0 border-orange-200 hover:bg-orange-100 hover:border-orange-300"
                      >
                        <Trash2 className="h-3 w-3 text-orange-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
