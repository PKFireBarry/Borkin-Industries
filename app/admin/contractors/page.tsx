import { getAllContractors } from '@/lib/firebase/contractors'
import { getAllBookings } from '@/lib/firebase/bookings'
import AdminContractorsClient from './AdminContractorsClient'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'

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

export default async function AdminContractorsPage() {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    redirect('/not-authorized')
  }

  const [contractors, bookings] = await Promise.all([
    getAllContractors(),
    getAllBookings(),
  ])

  // Serialize timestamps before passing to client components
  const serializedContractors = serializeTimestamps(contractors)
  const serializedBookings = serializeTimestamps(bookings)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contractor Management</h1>
        <p className="text-muted-foreground">
          Manage active and banned contractors on the platform.
        </p>
      </div>
      <AdminContractorsClient contractors={serializedContractors} bookings={serializedBookings} />
    </div>
  )
} 