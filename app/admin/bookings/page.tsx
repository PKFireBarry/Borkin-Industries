import { getAllBookings } from '@/lib/firebase/bookings'
import AdminBookingsClient from './AdminBookingsClient'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'
import BookingsSummary from './BookingsSummary'

// Ideally, this Booking interface would be imported from a shared types file
interface BookingPageItem {
  id: string;
  date?: string | Date | { seconds: number, nanoseconds: number }; // Made date optional
  // Add other properties as needed from your actual booking structure if used in this page directly
  [key: string]: any;
}

function robustGetTime(dateValue: any): number {
  if (!dateValue) return 0;
  if (dateValue instanceof Date) return dateValue.getTime();
  if (typeof dateValue === 'string') return new Date(dateValue).getTime();
  if (typeof dateValue === 'number') return dateValue; // Assuming it's already a timestamp
  if (typeof dateValue === 'object' && typeof dateValue.seconds === 'number' && typeof dateValue.nanoseconds === 'number') {
    return dateValue.seconds * 1000 + dateValue.nanoseconds / 1000000;
  }
  const parsed = Date.parse(dateValue as string); // Fallback for other string representations
  return isNaN(parsed) ? 0 : parsed;
}

export default async function AdminBookingsPage() {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    redirect('/not-authorized')
  }

  // Fetch all bookings, sorted by date descending
  const bookingsData = await getAllBookings();
  const bookings = (bookingsData as BookingPageItem[]).sort((a, b) => {
    return robustGetTime(b.date) - robustGetTime(a.date);
  });

  return (
    <main className="max-w-7xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Bookings Management</h1>
      <div className="space-y-10">
        {/* Pass the correctly typed and sorted bookings to child components */}
        {/* Child components might need to handle potentially undefined date properties if they expect date to always be present */}
        <BookingsSummary bookings={bookings as any[]} />
        <AdminBookingsClient bookings={bookings as any[]} />
      </div>
    </main>
  )
} 