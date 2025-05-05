import { getAllContractors } from '@/lib/firebase/contractors'
import { getAllBookings } from '@/lib/firebase/bookings'
import AdminContractorsClient from './AdminContractorsClient'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'

export default async function AdminContractorsPage() {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    redirect('/not-authorized')
  }

  const [contractors, bookings] = await Promise.all([
    getAllContractors(),
    getAllBookings(),
  ])

  return <AdminContractorsClient contractors={contractors} bookings={bookings} />
} 