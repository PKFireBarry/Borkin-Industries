import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth/role-helpers'
import { AdminClientsClient } from './AdminClientsClient'

export default async function AdminClientsPage() {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    redirect('/not-authorized')
  }
  
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Clients Administration</h1>
      <AdminClientsClient />
    </main>
  )
} 