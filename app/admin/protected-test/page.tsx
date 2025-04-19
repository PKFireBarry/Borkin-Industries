import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'

export default async function AdminProtectedTestPage() {
  const user = await currentUser()

  if (!user || !isAdmin(user)) {
    // Optionally, you could render a custom error message instead of redirecting
    redirect('/not-authorized')
  }

  return (
    <main className="max-w-xl mx-auto py-16 text-center">
      <h1 className="text-3xl font-bold mb-4">Admin Protected Route</h1>
      <p className="text-lg">You are signed in as an <span className="font-semibold">admin</span>.</p>
    </main>
  )
} 