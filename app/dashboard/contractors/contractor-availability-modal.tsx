"use client"

import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Contractor } from '@/types/contractor'

interface ContractorAvailabilityModalProps {
  contractor: Contractor
  open: boolean
  onClose: () => void
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days = []
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function ContractorAvailabilityModal({ contractor, open, onClose }: ContractorAvailabilityModalProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const days = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth])

  // Parse available slots as date strings (YYYY-MM-DD)
  const availableDays = useMemo(() =>
    (contractor.availability?.availableSlots || [])
      .map((slot: string) => new Date(slot).toISOString().slice(0, 10)),
    [contractor]
  )
  const unavailableDays = useMemo(() =>
    (contractor.availability?.unavailableDates || []),
    [contractor]
  )

  const handlePrevMonth = () => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1)
        return 11
      }
      return prev - 1
    })
  }
  const handleNextMonth = () => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1)
        return 0
      }
      return prev + 1
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Availability for {contractor.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="px-2 py-1 rounded hover:bg-muted"
              aria-label="Previous month"
            >
              &lt;
            </button>
            <span className="font-semibold text-base">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="px-2 py-1 rounded hover:bg-muted"
              aria-label="Next month"
            >
              &gt;
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
            {/* Blank days for first day of month */}
            {Array(days[0].getDay()).fill(null).map((_, i) => (
              <div key={i}></div>
            ))}
            {days.map((date) => {
              const dateStr = date.toISOString().slice(0, 10)
              const isToday = dateStr === today.toISOString().slice(0, 10)
              const isAvailable = availableDays.includes(dateStr)
              const isUnavailable = unavailableDays.includes(dateStr)
              let color = 'bg-gray-100 text-gray-400'
              if (isAvailable) color = 'bg-green-200 text-green-900'
              if (isUnavailable) color = 'bg-red-200 text-red-900 line-through'
              if (isToday && viewMonth === today.getMonth() && viewYear === today.getFullYear()) color += ' border-2 border-blue-500'
              return (
                <div
                  key={dateStr}
                  className={`rounded-md p-2 ${color}`}
                  title={date.toLocaleDateString()}
                >
                  {date.getDate()}
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 text-xs mt-2">
            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-200 rounded inline-block"></span> Available</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-200 rounded inline-block"></span> Unavailable</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-blue-500 rounded inline-block"></span> Today</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 