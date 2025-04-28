"use client"
import { useEffect, useState } from 'react'
import { useRequireRole } from '../../use-require-role'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { getContractorProfile, updateContractorProfile } from '@/lib/firebase/contractors'

interface Range {
  start: string // ISO date
  end: string   // ISO date
  type: 'available' | 'unavailable'
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function isDateInRange(date: string, start: string, end: string) {
  return new Date(date) >= new Date(start) && new Date(date) <= new Date(end)
}

export default function ContractorAvailabilityPage() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const [ranges, setRanges] = useState<Range[]>([])
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selecting, setSelecting] = useState<{ start: string | null; end: string | null }>({ start: null, end: null })
  const [mode, setMode] = useState<'available' | 'unavailable'>('available')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getContractorProfile(user.id)
      .then(profile => {
        setRanges(profile?.availability?.ranges || [])
      })
      .catch(() => setError('Failed to load availability'))
      .finally(() => setLoading(false))
  }, [user])

  const daysInMonth = getDaysInMonth(calendarMonth.year, calendarMonth.month)
  const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1).getDay()
  const today = new Date().toISOString().slice(0, 10)

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
      { start: selecting.start as string, end: selecting.end as string, type: mode }
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
      // Convert ranges to availableSlots and unavailableDates
      const availableSlots: string[] = []
      const unavailableDates: string[] = []
      for (const r of ranges) {
        const start = new Date(r.start)
        const end = new Date(r.end)
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const isoDate = d.toISOString().slice(0, 10)
          if (r.type === 'available') {
            // Use the start time of the range for the first day, end time for the last day, and 09:00 for others
            if (isoDate === r.start.slice(0, 10)) {
              availableSlots.push(r.start)
            } else if (isoDate === r.end.slice(0, 10)) {
              availableSlots.push(r.end)
            } else {
              availableSlots.push(isoDate + 'T09:00:00Z')
            }
          } else if (r.type === 'unavailable') {
            unavailableDates.push(isoDate)
          }
        }
      }
      await updateContractorProfile(user.id, {
        availability: { availableSlots, unavailableDates, ranges }
      })
      setSuccess(true)
    } catch {
      setError('Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || !isAuthorized || loading) return <div className="p-8 text-center text-muted-foreground">Loading availability...</div>

  // Build calendar grid
  const days: (string | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(calendarMonth.year, calendarMonth.month, d).toISOString().slice(0, 10)
    days.push(iso)
  }

  return (
    <section className="max-w-xl mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">Set Your Availability</h1>
      <div className="mb-4 flex gap-2 items-center">
        <Button type="button" variant={mode === 'available' ? 'default' : 'outline'} onClick={() => setMode('available')}>Available</Button>
        <Button type="button" variant={mode === 'unavailable' ? 'default' : 'outline'} onClick={() => setMode('unavailable')}>Unavailable</Button>
        <span className="ml-4 text-sm text-muted-foreground">Select a range on the calendar</span>
      </div>
      <div className="mb-6 flex items-center gap-4">
        <Button type="button" variant="outline" onClick={() => setCalendarMonth(m => ({ year: m.month === 0 ? m.year - 1 : m.year, month: m.month === 0 ? 11 : m.month - 1 }))}>&lt;</Button>
        <span className="font-medium">{new Date(calendarMonth.year, calendarMonth.month).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
        <Button type="button" variant="outline" onClick={() => setCalendarMonth(m => ({ year: m.month === 11 ? m.year + 1 : m.year, month: m.month === 11 ? 0 : m.month + 1 }))}>&gt;</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="text-xs text-center font-medium text-muted-foreground">{d}</div>
        ))}
        {days.map((iso, idx) => iso ? (
          <button
            key={iso}
            className={[
              "aspect-square w-8 rounded text-sm",
              iso === today ? "border border-primary" : "border border-transparent",
              selecting.start && !selecting.end && iso === selecting.start ? "bg-primary text-primary-foreground" : "",
              selecting.start && selecting.end && isDateInRange(iso, selecting.start, selecting.end) ? (mode === 'available' ? "bg-green-200" : "bg-red-200") : "",
              "hover:bg-accent"
            ].join(' ')}
            onClick={() => handleDayClick(iso)}
          >
            {parseInt(iso.slice(-2))}
          </button>
        ) : <div key={idx} />)}
      </div>
      <div className="mb-6 flex gap-2 items-center">
        <Button type="button" onClick={handleAddRange} disabled={!selecting.start || !selecting.end}>Add Range</Button>
        {selecting.start && selecting.end && (
          <span className="text-sm text-muted-foreground">Selected: {selecting.start} to {selecting.end}</span>
        )}
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Current Ranges</label>
        {ranges.length === 0 ? (
          <div className="text-muted-foreground">No ranges set.</div>
        ) : (
          <ul className="space-y-2">
            {ranges.map((r, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className={r.type === 'available' ? 'text-green-700' : 'text-red-700'}>
                  {r.type.charAt(0).toUpperCase() + r.type.slice(1)}: {r.start} to {r.end}
                </span>
                <Button type="button" variant="destructive" onClick={() => handleRemoveRange(idx)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <div className="text-destructive text-sm mb-2">{error}</div>}
      {success && <div className="text-success text-sm mb-2">Availability saved!</div>}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Availability'}
      </Button>
    </section>
  )
} 