"use client"
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { getBookingsForClient } from '@/lib/firebase/bookings'
import { BookingList } from './booking-list'
import { useRequireRole } from '../use-require-role'

export default function BookingsPage() {
  const { isLoaded, isAuthorized } = useRequireRole('client')
  const { user } = useUser()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getBookingsForClient(user.id)
      .then((data) => setBookings(data))
      .finally(() => setLoading(false))
  }, [user])

  if (!isLoaded || !isAuthorized || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-slate-600 font-medium">Loading your bookings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  My Bookings
                </h1>
                <p className="text-slate-600 mt-1">
                  Manage your pet care appointments and services
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-500">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>{bookings.length} total bookings</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BookingList bookings={bookings} />
      </div>
    </div>
  )
} 