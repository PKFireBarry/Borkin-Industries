import { getAllPlatformServices } from '@/lib/firebase/services'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'
import AdminServicesClient from './AdminServicesClient'

function serializeTimestamps(service: any) {
  return {
    ...service,
    createdAt: service.createdAt && typeof service.createdAt.toDate === 'function' ? service.createdAt.toDate().toISOString() : null,
    updatedAt: service.updatedAt && typeof service.updatedAt.toDate === 'function' ? service.updatedAt.toDate().toISOString() : null,
  }
}

export default async function AdminServicesPage() {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    redirect('/not-authorized')
  }

  const platformServices = (await getAllPlatformServices()).map(serializeTimestamps)

  return <AdminServicesClient initialServices={platformServices} />
} 