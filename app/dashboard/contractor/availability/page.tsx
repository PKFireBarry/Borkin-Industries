"use client"
import { useEffect, useState } from 'react'
import { useRequireRole } from '../../use-require-role'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { getContractorProfile, updateContractorProfile } from '@/lib/firebase/contractors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { 
  Trash2, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  CheckCircle,
  AlertCircle,
  CalendarX,
  CalendarCheck,
  Info
} from 'lucide-react'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function isDateInRange(date: string, start: string, end: string) {
  return new Date(date) >= new Date(start) && new Date(date) <= new Date(end)
}

export default function ContractorAvailabilityPage() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const [ranges, setRanges] = useState<Array<{ start: string; end: string }>>([])
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selecting, setSelecting] = useState<{ start: string | null; end: string | null }>({ start: null, end: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getContractorProfile(user.id)
      .then(profile => {
        const availabilityRanges = profile?.availability?.ranges || [];
        setRanges(availabilityRanges.map((r: any) => ({ start: r.start, end: r.end })))
      })
      .catch(() => setError('Failed to load availability'))
      .finally(() => setLoading(false))
  }, [user])

  const daysInMonth = getDaysInMonth(calendarMonth.year, calendarMonth.month)
  const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1).getDay()
  const today = new Date().toISOString().slice(0, 10)

  // Helper: is a day unavailable?
  const isUnavailable = (iso: string) => {
    return ranges.some(r => isDateInRange(iso, r.start, r.end))
  }

  const handleDayClick = (iso: string) => {
    if (!selecting.start) {
      setSelecting({ start: iso, end: null })
    } else if (!selecting.end) {
      if (new Date(iso) < new Date(selecting.start)) {
        setSelecting({ start: iso, end: selecting.start })
      } else {
        setSelecting({ start: selecting.start, end: iso })
      }
    } else {
      setSelecting({ start: iso, end: null })
    }
  }

  const handleAddRange = () => {
    if (!selecting.start || !selecting.end) return
    setRanges(prev => [
      ...prev,
      { start: selecting.start as string, end: selecting.end as string }
    ])
    setSelecting({ start: null, end: null })
  }

  const handleRemoveRange = (idx: number) => {
    setRanges(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      // Flatten all unavailable dates
      const unavailableDates: string[] = []
      for (const r of ranges) {
        const start = new Date(r.start)
        const end = new Date(r.end)
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const isoDate = d.toISOString().slice(0, 10)
          unavailableDates.push(isoDate)
        }
      }
      await updateContractorProfile(user.id, {
        availability: { availableSlots: [], unavailableDates, ranges: ranges as any }
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Failed to save availability')
    } finally {
      setSaving(false)
    }
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

  if (!isLoaded || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Loading availability...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="bg-slate-200 rounded-xl h-96"></div>
          </div>
        </div>
      </div>
    )
  }

  // Build calendar grid
  const days: (string | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(calendarMonth.year, calendarMonth.month, d).toISOString().slice(0, 10)
    days.push(iso)
  }

  // Get day styling based on state
  const getDayClassName = (iso: string) => {
    const baseClasses = "aspect-square w-full rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md relative"
    
    // Check if this is today
    const isToday = iso === today
    
    // Check if this day is unavailable
    const dayIsUnavailable = isUnavailable(iso)
    
    // Check selection states
    const isFirstClick = selecting.start === iso && !selecting.end
    const isSecondClick = selecting.end === iso && selecting.start !== iso
    const isInSelectedRange = selecting.start && selecting.end && 
      isDateInRange(iso, selecting.start, selecting.end) && 
      iso !== selecting.start && iso !== selecting.end
    
    if (dayIsUnavailable) {
      return `${baseClasses} bg-red-100 text-red-700 border-2 border-red-200 line-through cursor-not-allowed hover:scale-100`
    }
    
    if (isFirstClick) {
      return `${baseClasses} bg-blue-500 text-white border-2 border-blue-600 shadow-lg ring-2 ring-blue-200`
    }
    
    if (isSecondClick) {
      return `${baseClasses} bg-purple-500 text-white border-2 border-purple-600 shadow-lg ring-2 ring-purple-200`
    }
    
    if (isInSelectedRange) {
      return `${baseClasses} bg-gradient-to-r from-blue-100 to-purple-100 text-slate-700 border-2 border-blue-200`
    }
    
    if (isToday) {
      return `${baseClasses} bg-white text-slate-900 border-2 border-primary shadow-md ring-2 ring-primary/20`
    }
    
    return `${baseClasses} bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50`
  }

  const totalUnavailableDays = ranges.reduce((total, range) => {
    const start = new Date(range.start)
    const end = new Date(range.end)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return total + diffDays
  }, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                  <AvatarImage src={user?.imageUrl} alt={user?.fullName || 'Contractor'} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {(user?.fullName || 'C')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    Availability Calendar
                  </h1>
                  <p className="text-slate-600 mt-1">
                    Manage your unavailable dates and time periods
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-white/80 text-slate-700 border-slate-300">
                  <CalendarX className="w-4 h-4 mr-1" />
                  {totalUnavailableDays} unavailable days
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                      <div className="w-4 h-4 bg-blue-500 rounded border-2 border-blue-600"></div>
                      <span className="text-slate-600">First Click</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-500 rounded border-2 border-purple-600"></div>
                      <span className="text-slate-600">Second Click</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded border border-blue-200"></div>
                      <span className="text-slate-600">Selected Range</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-100 rounded border-2 border-red-200"></div>
                      <span className="text-slate-600">Unavailable</span>
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
                      disabled={isUnavailable(iso)}
                    >
                      <span className="relative z-10">
                        {parseInt(iso.slice(-2))}
                      </span>
                      {iso === today && (
                        <div className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse"></div>
                      )}
                    </button>
                  ) : <div key={idx} className="aspect-square" />)}
                </div>

                {/* Selection Actions */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex-1">
                    {selecting.start && !selecting.end && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Start date selected: <span className="font-semibold">{new Date(selecting.start).toLocaleDateString()}</span></span>
                      </div>
                    )}
                    {selecting.start && selecting.end && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span>Range selected: <span className="font-semibold">{new Date(selecting.start).toLocaleDateString()} - {new Date(selecting.end).toLocaleDateString()}</span></span>
                      </div>
                    )}
                    {!selecting.start && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Info className="w-4 h-4" />
                        <span>Click a date to start selecting an unavailable period</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handleAddRange} 
                    disabled={!selecting.start || !selecting.end}
                    className="rounded-full px-6 py-2 bg-red-500 hover:bg-red-600 text-white disabled:bg-slate-300"
                  >
                    <CalendarX className="w-4 h-4 mr-2" />
                    Mark Unavailable
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Unavailable Periods */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CalendarX className="w-5 h-5 text-red-500" />
                  Unavailable Periods
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ranges.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                    <CalendarCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium mb-1">All dates available</p>
                    <p className="text-sm text-slate-500">Select dates on the calendar to mark them as unavailable</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {ranges.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl hover:shadow-sm transition-shadow">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-red-800">
                            {new Date(r.start).toLocaleDateString(undefined, { 
                              month: 'short', 
                              day: 'numeric',
                              year: new Date(r.start).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                            })}
                            {r.start !== r.end && (
                              <>
                                {' - '}
                                {new Date(r.end).toLocaleDateString(undefined, { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: new Date(r.end).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                })}
                              </>
                            )}
                          </div>
                          <div className="text-xs text-red-600 mt-1">
                            {(() => {
                              const start = new Date(r.start)
                              const end = new Date(r.end)
                              const diffTime = Math.abs(end.getTime() - start.getTime())
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                              return `${diffDays} day${diffDays !== 1 ? 's' : ''}`
                            })()}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleRemoveRange(idx)}
                          className="h-8 w-8 p-0 border-red-200 hover:bg-red-100 hover:border-red-300"
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Section */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="pt-6">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-4">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-700">Availability saved successfully!</span>
                  </div>
                )}
                <Button 
                  onClick={handleSave} 
                  disabled={saving} 
                  className="w-full rounded-xl py-3 bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Save Availability
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 