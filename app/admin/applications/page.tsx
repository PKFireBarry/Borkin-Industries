import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'
import { getAllContractorApplications, updateContractorApplicationStatus, updateContractorProfile } from '@/lib/firebase/contractors'
import AdminApplicationsClient, { type Application } from './AdminApplicationsClient'

async function approveContractor(id: string) {
  'use server'
  await updateContractorApplicationStatus(id, 'approved')
  
  const applicationsData = await getAllContractorApplications()
  const application = applicationsData.find((app: any) => app.id === id) as any
  
  if (application && application.userId) {
    await updateContractorProfile(application.userId, {
      id: application.userId,
      name: application.name || `${application.firstName || ''} ${application.lastName || ''}`.trim(),
      email: application.email || '',
      phone: application.phone || '',
      address: application.address || '',
      application: {
        status: 'approved',
        submittedAt: application.createdAt ? 
          (application.createdAt instanceof Date ? application.createdAt.toISOString() :
           typeof application.createdAt === 'string' ? application.createdAt :
           new Date(application.createdAt.seconds * 1000).toISOString()) : 
          new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        experience: Array.isArray(application.experience) ? 
          application.experience.map((exp: any) => exp.description || '').join('; ') : '',
        education: Array.isArray(application.education) ? 
          application.education.map((edu: any) => `${edu.degree || ''} in ${edu.fieldOfStudy || ''}`).join('; ') : '',
        address: application.address || '',
        drivingRange: application.drivingRange?.maxDistance || '',
        certifications: Array.isArray(application.certifications) ? 
          application.certifications.map((cert: any) => typeof cert === 'string' ? cert : cert.name || '').filter(Boolean) : [],
        references: Array.isArray(application.references) ? 
          application.references.map((ref: any) => `${ref.name || ''} (${ref.relationship || ''})`).filter(Boolean) : []
      }
    })
  }
}

async function rejectContractor(id: string) {
  'use server'
  await updateContractorApplicationStatus(id, 'rejected')
  
  const applicationsData = await getAllContractorApplications()
  const application = applicationsData.find((app: any) => app.id === id) as any
  
  if (application && application.userId) {
    await updateContractorProfile(application.userId, {
      id: application.userId,
      name: application.name || `${application.firstName || ''} ${application.lastName || ''}`.trim(),
      email: application.email || '',
      phone: application.phone || '',
      address: application.address || '',
      application: {
        status: 'rejected',
        submittedAt: application.createdAt ? 
          (application.createdAt instanceof Date ? application.createdAt.toISOString() :
           typeof application.createdAt === 'string' ? application.createdAt :
           new Date(application.createdAt.seconds * 1000).toISOString()) : 
          new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        experience: Array.isArray(application.experience) ? 
          application.experience.map((exp: any) => exp.description || '').join('; ') : '',
        education: Array.isArray(application.education) ? 
          application.education.map((edu: any) => `${edu.degree || ''} in ${edu.fieldOfStudy || ''}`).join('; ') : '',
        address: application.address || '',
        drivingRange: application.drivingRange?.maxDistance || '',
        certifications: Array.isArray(application.certifications) ? 
          application.certifications.map((cert: any) => typeof cert === 'string' ? cert : cert.name || '').filter(Boolean) : [],
        references: Array.isArray(application.references) ? 
          application.references.map((ref: any) => `${ref.name || ''} (${ref.relationship || ''})`).filter(Boolean) : []
      }
    })
  }
}

async function reinstateContractor(id: string) {
  'use server'
  await updateContractorApplicationStatus(id, 'pending')
  
  const applicationsData = await getAllContractorApplications()
  const application = applicationsData.find((app: any) => app.id === id) as any
  
  if (application && application.userId) {
    await updateContractorProfile(application.userId, {
      id: application.userId,
      name: application.name || `${application.firstName || ''} ${application.lastName || ''}`.trim(),
      email: application.email || '',
      phone: application.phone || '',
      address: application.address || '',
      application: {
        status: 'pending',
        submittedAt: application.createdAt ? 
          (application.createdAt instanceof Date ? application.createdAt.toISOString() :
           typeof application.createdAt === 'string' ? application.createdAt :
           new Date(application.createdAt.seconds * 1000).toISOString()) : 
          new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        experience: Array.isArray(application.experience) ? 
          application.experience.map((exp: any) => exp.description || '').join('; ') : '',
        education: Array.isArray(application.education) ? 
          application.education.map((edu: any) => `${edu.degree || ''} in ${edu.fieldOfStudy || ''}`).join('; ') : '',
        address: application.address || '',
        drivingRange: application.drivingRange?.maxDistance || '',
        certifications: Array.isArray(application.certifications) ? 
          application.certifications.map((cert: any) => typeof cert === 'string' ? cert : cert.name || '').filter(Boolean) : [],
        references: Array.isArray(application.references) ? 
          application.references.map((ref: any) => `${ref.name || ''} (${ref.relationship || ''})`).filter(Boolean) : []
      }
    })
  }
}

export default async function AdminApplicationsPage() {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    redirect('/not-authorized')
  }

  // Fetch all contractor applications, sorted by createdAt descending
  const applicationsData = await getAllContractorApplications();
  // Ensure applicationsData is treated as an array of Application
  const applications = (applicationsData as Application[]).sort((a, b) => {
    let timeA = 0;
    if (a.createdAt) {
      if (typeof a.createdAt === 'number') timeA = a.createdAt;
      else if (typeof a.createdAt === 'string') timeA = new Date(a.createdAt).getTime();
      else if (a.createdAt instanceof Date) timeA = a.createdAt.getTime();
      else if (typeof a.createdAt === 'object' && 'seconds' in a.createdAt && 
               typeof a.createdAt.seconds === 'number' && 
               typeof a.createdAt.nanoseconds === 'number') { // Firestore Timestamp like object
        timeA = a.createdAt.seconds * 1000 + a.createdAt.nanoseconds / 1000000;
      }
    }

    let timeB = 0;
    if (b.createdAt) {
      if (typeof b.createdAt === 'number') timeB = b.createdAt;
      else if (typeof b.createdAt === 'string') timeB = new Date(b.createdAt).getTime();
      else if (b.createdAt instanceof Date) timeB = b.createdAt.getTime();
      else if (typeof b.createdAt === 'object' && 'seconds' in b.createdAt && 
               typeof b.createdAt.seconds === 'number' && 
               typeof b.createdAt.nanoseconds === 'number') { // Firestore Timestamp like object
        timeB = b.createdAt.seconds * 1000 + b.createdAt.nanoseconds / 1000000;
      }
    }
    return timeB - timeA; // Sort descending
  });

  return <AdminApplicationsClient
    applications={applications} // No longer need 'as any'
    onApprove={approveContractor}
    onReject={rejectContractor}
    onReinstate={reinstateContractor}
  />
} 