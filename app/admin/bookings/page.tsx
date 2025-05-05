import { getAllBookings } from '@/lib/firebase/bookings'
import AdminBookingsClient from './AdminBookingsClient'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'
import BookingsSummary from './BookingsSummary'

export default async function AdminBookingsPage() {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    redirect('/not-authorized')
  }

  // Fetch all bookings, sorted by date descending
  const bookings = (await getAllBookings()).sort((a: any, b: any) => {
    if (!a.date || !b.date) return 0
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <main className="max-w-7xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Bookings Management</h1>
      <div className="space-y-10">
        <BookingsSummary bookings={bookings} />
        <AdminBookingsClient bookings={bookings} />
      </div>
    </main>
  )
} 