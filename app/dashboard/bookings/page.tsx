import { getBookingsForClient } from '@/lib/firebase/bookings'
import { currentUser } from '@clerk/nextjs/server'
import { BookingList } from './booking-list'
import { GenerateTestBookingButton } from './generate-test-booking-button'

export default async function BookingsPage() {
  const user = await currentUser()
  const bookings = user ? await getBookingsForClient(user.id) : []

  return (
    <>
      <GenerateTestBookingButton />
      <BookingList bookings={bookings} />
    </>
  )
} 