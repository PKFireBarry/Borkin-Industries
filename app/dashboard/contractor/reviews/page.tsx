"use client"
import { useRequireRole } from '../../use-require-role'

export default function ContractorReviewsPage() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  if (!isLoaded || !isAuthorized) return null
  return (
    <main className="max-w-xl mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">Reviews</h1>
      <p className="text-muted-foreground">Your reviews and ratings will appear here (coming soon).</p>
    </main>
  )
} 