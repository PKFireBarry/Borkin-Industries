import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    redirect('/not-authorized')
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <p className="mb-8 text-muted-foreground">Welcome, admin! Use the links below to manage the platform.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/protected-test" className="p-6 rounded-lg border bg-card shadow-sm hover:shadow-md transition">
          <h2 className="font-semibold mb-2">Protected Test</h2>
          <p className="text-sm text-muted-foreground">Test admin-only functionality</p>
        </Link>
        
        <Link href="/admin/applications" className="p-6 rounded-lg border bg-card shadow-sm hover:shadow-md transition">
          <h2 className="font-semibold mb-2">Pending Applications</h2>
          <p className="text-sm text-muted-foreground">Review and approve contractor applications</p>
        </Link>
        
        <Link href="/admin/contractors" className="p-6 rounded-lg border bg-card shadow-sm hover:shadow-md transition">
          <h2 className="font-semibold mb-2">Contractor Management</h2>
          <p className="text-sm text-muted-foreground">Manage active and banned contractors</p>
        </Link>
        
        <Link href="/admin/services" className="p-6 rounded-lg border bg-card shadow-sm hover:shadow-md transition">
          <h2 className="font-semibold mb-2">Platform Services</h2>
          <p className="text-sm text-muted-foreground">Add, edit, or remove available services</p>
        </Link>
        
        <Link href="/admin/bookings" className="p-6 rounded-lg border bg-card shadow-sm hover:shadow-md transition">
          <h2 className="font-semibold mb-2">Booking Logs</h2>
          <p className="text-sm text-muted-foreground">View and manage all booking activities</p>
        </Link>
        
        <Link href="/admin/clients" className="p-6 rounded-lg border bg-card shadow-sm hover:shadow-md transition">
          <h2 className="font-semibold mb-2">Client Management</h2>
          <p className="text-sm text-muted-foreground">Manage active and banned clients</p>
        </Link>
      </div>
    </div>
  )
} 