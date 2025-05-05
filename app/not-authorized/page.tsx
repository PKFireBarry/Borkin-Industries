'use client'
import { useSearchParams } from 'next/navigation'

export default function NotAuthorizedPage() {
  const searchParams = useSearchParams()
  const isBanned = searchParams?.get('banned') === '1'
  return (
    <main className="max-w-xl mx-auto py-16 text-center">
      <h1 className="text-3xl font-bold mb-4 text-red-600">Not Authorized</h1>
      {isBanned ? (
        <p className="text-lg">Your account has been restricted and you cannot log in at this time. If you believe this is a mistake or wish to reapply, please contact support or try again later. Thank you for your interest in working with us.</p>
      ) : (
        <p className="text-lg">You do not have permission to view this page.</p>
      )}
    </main>
  )
} 