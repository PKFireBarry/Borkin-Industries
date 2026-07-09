import { currentUser } from '@clerk/nextjs/server'
import { isClient } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'

export default async function ClientProtectedTestPage() {
  const user = await currentUser()

  if (!user || !isClient(user)) {
    redirect('/not-authorized')
  }

  return (
    <main className="max-w-xl mx-auto py-16 text-center">
      <h1 className="text-3xl font-bold mb-4">Client Protected Route</h1>
      <p className="text-lg">You are signed in as a <span className="font-semibold">client</span>.</p>
    </main>
  )
} 