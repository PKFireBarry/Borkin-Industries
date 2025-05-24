"use client"
import { useEffect, useState } from 'react'
import { useRequireRole } from '../../use-require-role'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { getContractorProfile, updateContractorProfile } from '@/lib/firebase/contractors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2 } from 'lucide-react'

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
    <Card className="max-w-xl mx-auto mt-10 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold">Set Unavailable Dates</CardTitle>
        <p className="text-muted-foreground text-sm mt-2">Clients can book you on any day not marked unavailable.</p>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex items-center gap-4 justify-center">
          <Button type="button" variant="outline" onClick={() => setCalendarMonth(m => ({ year: m.month === 0 ? m.year - 1 : m.year, month: m.month === 0 ? 11 : m.month - 1 }))}>&lt;</Button>
          <span className="font-medium text-lg">{new Date(calendarMonth.year, calendarMonth.month).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
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
                "aspect-square w-9 rounded-lg text-sm font-medium transition-colors",
                iso === today ? "border-2 border-primary" : "border border-transparent",
                isUnavailable(iso) ? "bg-destructive/20 text-destructive line-through" : "bg-background text-foreground",
                selecting.start && !selecting.end && iso === selecting.start ? "ring-2 ring-primary" : "",
                selecting.start && selecting.end && isDateInRange(iso, selecting.start, selecting.end) ? "bg-primary/10" : "",
                "hover:bg-accent"
              ].join(' ')}
              onClick={() => handleDayClick(iso)}
              type="button"
            >
              {parseInt(iso.slice(-2))}
            </button>
          ) : <div key={idx} />)}
        </div>
        <div className="mb-6 flex gap-2 items-center">
          <Button type="button" onClick={handleAddRange} disabled={!selecting.start || !selecting.end} variant="outline">Mark Unavailable</Button>
          {selecting.start && selecting.end && (
            <span className="text-sm text-muted-foreground">Selected: {selecting.start} to {selecting.end}</span>
          )}
        </div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Unavailable Time Periods</h3>
          {ranges.length === 0 ? (
            <div className="text-center text-muted-foreground py-4 px-3 border border-dashed rounded-lg">
              <p className="text-sm">You currently have no unavailable dates marked.</p>
              <p className="text-xs mt-1">Select a range on the calendar and click "Mark Unavailable" to add one.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {ranges.map((r, idx) => (
                <li key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-md border">
                  <span className="text-sm font-medium text-destructive">
                    {new Date(r.start).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    {' - '}
                    {new Date(r.end).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemoveRange(idx)}
                    aria-label="Remove range"
                    className="p-2"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <div className="text-destructive text-sm mb-2">{error}</div>}
        {success && <div className="text-green-600 text-sm mb-2">Availability saved!</div>}
        <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
          {saving ? 'Saving...' : 'Save Unavailable Dates'}
        </Button>
      </CardContent>
    </Card>
  )
} 