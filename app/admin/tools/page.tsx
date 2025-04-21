import { currentUser } from '@clerk/nextjs/server'
import { getUserRole } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'
import { GenerateTestDataButton } from '@/app/generate-test-data-button'

export default async function AdminToolsPage() {
  const user = await currentUser()
  const role = getUserRole(user)
  if (!user || role !== 'admin') {
    redirect('/not-authorized')
  }

  return (
    <main className="max-w-xl mx-auto py-16 text-center">
      <h1 className="text-3xl font-bold mb-6">Admin Tools</h1>
      <GenerateTestDataButton />
    </main>
  )
} 