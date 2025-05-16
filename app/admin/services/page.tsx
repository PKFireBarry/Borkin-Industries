import { getAllPlatformServices } from '@/lib/firebase/services'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'
import AdminServicesClient from './AdminServicesClient'

export default async function AdminServicesPage() {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    redirect('/not-authorized')
  }

  const platformServices = await getAllPlatformServices()

  return <AdminServicesClient initialServices={platformServices} />
} 