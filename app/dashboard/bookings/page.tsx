"use client"
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { getBookingsForClient } from '@/lib/firebase/bookings'
import { BookingList } from './booking-list'
import { GenerateTestBookingButton } from './generate-test-booking-button'
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

  if (!isLoaded || !isAuthorized || loading) return null

  return (
    <>
      <GenerateTestBookingButton />
      <BookingList bookings={bookings} />
    </>
  )
} 