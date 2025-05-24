import { getAllPlatformServices } from '@/lib/firebase/services'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'
import AdminServicesClient from './AdminServicesClient'
import type { PlatformService } from '@/types/service' // Assuming PlatformService is defined here or in a shared types file

interface FirebaseTimestamp {
  toDate: () => Date;
}

interface ServiceWithTimestamps extends Omit<PlatformService, 'createdAt' | 'updatedAt'> {
  createdAt?: FirebaseTimestamp | string | null | Date;
  updatedAt?: FirebaseTimestamp | string | null | Date;
}

function serializeTimestamps(service: ServiceWithTimestamps): PlatformService {
  let createdAtISO: string | undefined = undefined;
  if (service.createdAt) {
    if (typeof (service.createdAt as FirebaseTimestamp).toDate === 'function') {
      createdAtISO = (service.createdAt as FirebaseTimestamp).toDate().toISOString();
    } else if (service.createdAt instanceof Date) {
      createdAtISO = service.createdAt.toISOString();
    } else if (typeof service.createdAt === 'string') {
      createdAtISO = service.createdAt; // Assume already ISO string
    }
  }

  let updatedAtISO: string | undefined = undefined;
  if (service.updatedAt) {
    if (typeof (service.updatedAt as FirebaseTimestamp).toDate === 'function') {
      updatedAtISO = (service.updatedAt as FirebaseTimestamp).toDate().toISOString();
    } else if (service.updatedAt instanceof Date) {
      updatedAtISO = service.updatedAt.toISOString();
    } else if (typeof service.updatedAt === 'string') {
      updatedAtISO = service.updatedAt; // Assume already ISO string
    }
  }

  return {
    ...service,
    id: service.id || '', // Ensure id is present, default to empty string if not (should always be)
    name: service.name || '', // Ensure name is present
    createdAt: createdAtISO,
    updatedAt: updatedAtISO,
  } as PlatformService;
}

export default async function AdminServicesPage() {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    redirect('/not-authorized')
  }

  const rawServices = await getAllPlatformServices();
  const platformServices = (rawServices as ServiceWithTimestamps[]).map(serializeTimestamps)

  return <AdminServicesClient initialServices={platformServices} />
} 