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
  defaultDaySchedule?: { [dayOfWeek: number]: TimeSlot[] }
  onDefaultScheduleChange?: (schedule: { [dayOfWeek: number]: TimeSlot[] }) => void
  existingBookings?: Booking[]
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
  defaultDaySchedule = {},
  onDefaultScheduleChange,
  existingBookings = []
}: TimeBasedAvailabilityCalendarProps) {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showDefaultSchedule, setShowDefaultSchedule] = useState(false)

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
  const getDayBookings = (date: string): Booking[] => {
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
  const updateDayAvailability = (date: string, dayAvail: Partial<DayAvailability>) => {
    const updated = dailyAvailability.filter(day => day.date !== date)
    if (dayAvail.isFullyUnavailable || dayAvail.unavailableSlots?.length || dayAvail.availableSlots?.length) {
      updated.push({ date, ...dayAvail } as DayAvailability)
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

  // Range selection logic
  const handleDayClick = (iso: string) => {
    if (!rangeStart) {
      // First click - start range selection
      setRangeStart(iso)
      setRangeEnd(null)
      setSelectedDate(null) // Clear single selection when starting range
    } else if (!rangeEnd) {
      // Second click - complete range selection
      const start = new Date(rangeStart)
      const end = new Date(iso)

      if (start > end) {
        // Swap if end is before start
        setRangeStart(iso)
        setRangeEnd(rangeStart)
      } else {
        setRangeEnd(iso)
      }
    } else {
      // Range already selected - check if clicking on range to clear or start new range
      if (rangePreviewDates.includes(iso)) {
        // Clicking within existing range - clear it
        setRangeStart(null)
        setRangeEnd(null)
        setSelectedDate(iso) // Set single selection
      } else {
        // Start new range
        setRangeStart(iso)
        setRangeEnd(null)
        setSelectedDate(null)
      }
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Calendar Section */}
      <div className="lg:col-span-2">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {new Date(calendarMonth.year, calendarMonth.month).toLocaleString('default', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDefaultSchedule(!showDefaultSchedule)}
                  className="h-8 px-3 rounded-full hover:bg-slate-100"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Default Schedule
                </Button>
                <Button 
                  variant="outline" 
                  onClick={goToPreviousMonth}
                  className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={goToNextMonth}
                  className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Legend */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <div className="flex flex-wrap items-center gap-4 text-sm">
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
            <div className="grid grid-cols-7 gap-2 mb-6">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2 uppercase tracking-wide">
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
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Info className="w-4 h-4" />
                <span>Click on a date to manage its availability. Use the sidebar to set specific time periods.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {rangeStart && rangeEnd ? (
          <RangeBlockingManager
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            rangePreviewDates={rangePreviewDates}
            onBlockRange={blockDateRange}
            onClearRange={clearRangeSelection}
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
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium mb-1">Select a Date or Range</p>
                <p className="text-sm text-slate-500">Click on a date to manage its availability, or click two dates to select a range for blocking</p>
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
  dayBookings: Booking[]
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
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Range Selected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold text-blue-800">
                {formatDateRange()}
              </div>
              <div className="text-sm text-blue-600">
                {rangePreviewDates.length} day{rangePreviewDates.length !== 1 ? 's' : ''} selected
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onBlockRange}
              className="rounded-xl py-3 bg-red-500 hover:bg-red-600 text-white font-semibold"
            >
              <CalendarX className="w-4 h-4 mr-2" />
              Block {rangePreviewDates.length} Day{rangePreviewDates.length !== 1 ? 's' : ''}
            </Button>
            <Button
              onClick={onClearRange}
              variant="outline"
              className="rounded-xl py-3 hover:bg-slate-50"
            >
              Clear
            </Button>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-slate-600">
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
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {formattedDate}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onToggleFullDay}
            variant={dayAvailability?.isFullyUnavailable ? "default" : "outline"}
            className={cn(
              "w-full rounded-xl py-3 font-semibold transition-all duration-200",
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
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              Existing Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-500" />
                Block Time Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
                className="w-full rounded-xl py-3 bg-green-500 hover:bg-green-600 text-white font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Unavailable Period
              </Button>
            </CardContent>
          </Card>

          {/* Existing Unavailable Slots */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
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