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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
        <p className="text-muted-foreground">
          Manage active and banned clients on the platform.
        </p>
      </div>
      <AdminClientsClient />
    </div>
  )
} 