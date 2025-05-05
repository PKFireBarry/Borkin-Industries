import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'
import { getAllContractorApplications, updateContractorApplicationStatus } from '@/lib/firebase/contractors'
import AdminApplicationsClient from './AdminApplicationsClient'

async function approveContractor(id: string) {
  'use server'
  await updateContractorApplicationStatus(id, 'approved')
}

async function rejectContractor(id: string) {
  'use server'
  await updateContractorApplicationStatus(id, 'rejected')
}

async function reinstateContractor(id: string) {
  'use server'
  await updateContractorApplicationStatus(id, 'pending')
}

function formatDate(date: Date | string | null) {
  if (!date) return '-'
  if (typeof date === 'string') return new Date(date).toLocaleString()
  return date.toLocaleString()
}

export default async function AdminApplicationsPage() {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    redirect('/not-authorized')
  }

  // Fetch all contractor applications, sorted by createdAt descending
  const applications = (await getAllContractorApplications()).sort((a: any, b: any) => {
    if (!a.createdAt || !b.createdAt) return 0
    return b.createdAt - a.createdAt
  })

  return <AdminApplicationsClient
    applications={applications}
    onApprove={approveContractor}
    onReject={rejectContractor}
    onReinstate={reinstateContractor}
  />
} 