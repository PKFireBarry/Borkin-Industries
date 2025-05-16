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
    <main className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <p className="mb-8 text-muted-foreground">Welcome, admin! Use the links below to manage the platform.</p>
      <div className="space-y-4">
        <Link href="/admin/protected-test" className="block p-4 rounded border hover:bg-muted transition font-medium">Protected Test</Link>
        <Link href="/admin/applications" className="block p-4 rounded border hover:bg-muted transition font-medium">Pending Applications</Link>
        <Link href="/admin/contractors" className="block p-4 rounded border hover:bg-muted transition font-medium">
          Contractor Management
          <span className="text-sm ml-2 text-muted-foreground">(Active & Banned Contractors)</span>
        </Link>
        <Link href="/admin/services" className="block p-4 rounded border hover:bg-muted transition font-medium">
          Platform Services
          <span className="text-sm ml-2 text-muted-foreground">(Add/Edit/Remove Services)</span>
        </Link>
        <Link href="/admin/bookings" className="block p-4 rounded border hover:bg-muted transition font-medium">Booking Logs</Link>
        <Link href="/admin/clients" className="block p-4 rounded border hover:bg-muted transition font-medium">
          Client Management
          <span className="text-sm ml-2 text-muted-foreground">(Active & Banned Clients)</span>
        </Link>
      </div>
    </main>
  )
} 