import { getAllBookings } from '@/lib/firebase/bookings'
import { getAllClients } from '@/lib/firebase/clients'
import { getAllContractors } from '@/lib/firebase/contractors'
import { getAllPlatformServices } from '@/lib/firebase/services'
import AdminBookingsClient from './AdminBookingsClient'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'
import BookingsSummary from './BookingsSummary'

// Helper function to serialize Firestore timestamps
function serializeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  
  if (obj.toDate && typeof obj.toDate === 'function') {
    // This is a Firestore Timestamp
    return obj.toDate().toISOString()
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeTimestamps)
  }
  
  const serialized: any = {}
  for (const [key, value] of Object.entries(obj)) {
    serialized[key] = serializeTimestamps(value)
  }
  return serialized
}

// Use the same interface as in AdminBookingsClient and BookingsSummary
interface Booking {
  id: string;
  clientId?: string;
  contractorId?: string;
  serviceType?: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  date?: string | Date | { seconds: number, nanoseconds: number }; // Legacy field for backward compatibility
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

  // Fetch all data concurrently
  const [bookingsData, clients, contractors, services] = await Promise.all([
    getAllBookings(),
    getAllClients(),
    getAllContractors(),
    getAllPlatformServices()
  ]);

  // Serialize timestamps in all data
  const serializedBookingsData = serializeTimestamps(bookingsData)
  const serializedClients = serializeTimestamps(clients)
  const serializedContractors = serializeTimestamps(contractors)
  const serializedServices = serializeTimestamps(services)

  // Create lookup maps for efficient name resolution
  const clientMap = new Map(serializedClients.map((client: any) => [client.id, client.name]));
  const contractorMap = new Map(serializedContractors.map((contractor: any) => [contractor.id, contractor.name]));
  const serviceMap = new Map(serializedServices.map((service: any) => [service.id, service.name]));

  // Cast to Booking[] and use the correct date fields
  const bookings = (serializedBookingsData as unknown as Booking[]).map(booking => ({
    ...booking,
    // Use startDate as the primary date field, fallback to legacy date field
    date: booking.startDate || booking.date || (typeof booking.createdAt === 'string' ? booking.createdAt : new Date().toISOString()),
    // Add resolved names for display
    clientName: (booking.clientId ? clientMap.get(booking.clientId) || 'Unknown Client' : 'Unknown Client') as string,
    contractorName: (booking.contractorId ? contractorMap.get(booking.contractorId) || 'Unknown Contractor' : 'Unknown Contractor') as string,
    serviceName: (booking.serviceType ? serviceMap.get(booking.serviceType) || booking.serviceType : 'Unknown Service') as string,
    // Fix payment amount display (amount is already in dollars)
    displayAmount: booking.paymentAmount ? booking.paymentAmount.toFixed(2) : '0.00'
  })).sort((a, b) => {
    return robustGetTime(b.date) - robustGetTime(a.date);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bookings Management</h1>
        <p className="text-muted-foreground">
          View and manage all booking activities on the platform.
        </p>
      </div>
      <div className="space-y-10">
        {/* Pass the correctly typed bookings to child components */}
        <BookingsSummary bookings={bookings} />
        <AdminBookingsClient bookings={bookings} />
      </div>
    </div>
  )
} 