import { getAllBookings } from '@/lib/firebase/bookings'
import AdminBookingsClient from './AdminBookingsClient'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'
import BookingsSummary from './BookingsSummary'

// Use the same interface as in AdminBookingsClient and BookingsSummary
interface Booking {
  id: string;
  clientId?: string;
  contractorId?: string;
  serviceType?: string;
  date: string | Date | { seconds: number, nanoseconds: number }; // Can be string, Date, or Firestore timestamp
  status: string;
  paymentStatus?: string;
  paymentAmount?: number;
  stripeCustomerId?: string;
  paymentIntentId?: string;
  petIds?: string[] | string;
  [key: string]: unknown;
}

function robustGetTime(dateValue: string | Date | { seconds: number, nanoseconds: number } | undefined): number {
  if (!dateValue) return 0;
  if (dateValue instanceof Date) return dateValue.getTime();
  if (typeof dateValue === 'string') return new Date(dateValue).getTime();
  if (typeof dateValue === 'number') return dateValue; // Assuming it's already a timestamp
  if (typeof dateValue === 'object' && 'seconds' in dateValue && typeof dateValue.seconds === 'number' && 
      'nanoseconds' in dateValue && typeof dateValue.nanoseconds === 'number') {
    return dateValue.seconds * 1000 + dateValue.nanoseconds / 1000000;
  }
  const parsed = Date.parse(String(dateValue)); // Fallback for other string representations
  return isNaN(parsed) ? 0 : parsed;
}

export default async function AdminBookingsPage() {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    redirect('/not-authorized')
  }

  // Fetch all bookings, sorted by date descending
  const bookingsData = await getAllBookings();
  // Cast to Booking[] and ensure date is never undefined to match the interface
  const bookings = (bookingsData as unknown as Booking[]).map(booking => ({
    ...booking,
    // Ensure date is never undefined by providing a default
    date: booking.date || new Date().toISOString()
  })).sort((a, b) => {
    return robustGetTime(b.date) - robustGetTime(a.date);
  });

  return (
    <main className="max-w-7xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Bookings Management</h1>
      <div className="space-y-10">
        {/* Pass the correctly typed bookings to child components */}
        <BookingsSummary bookings={bookings} />
        <AdminBookingsClient bookings={bookings} />
      </div>
    </main>
  )
} 