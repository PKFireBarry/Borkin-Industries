import { currentUser } from '@clerk/nextjs/server'
import { isContractor } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'

export default async function ContractorProtectedTestPage() {
  const user = await currentUser()

  if (!user || !isContractor(user)) {
    redirect('/not-authorized')
  }

  return (
    <main className="max-w-xl mx-auto py-16 text-center">
      <h1 className="text-3xl font-bold mb-4">Contractor Protected Route</h1>
      <p className="text-lg">You are signed in as a <span className="font-semibold">contractor</span>.</p>
    </main>
  )
} 