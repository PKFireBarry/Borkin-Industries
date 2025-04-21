'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'

export default function PaymentsPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleManagePayments() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' })
        if (!res.ok) throw new Error('Failed to create portal session')
        const { url } = await res.json()
        window.location.href = url
      } catch (err) {
        setError('Failed to redirect to Stripe portal')
      }
    })
  }

  return (
    <section className="max-w-xl mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">Manage Payment Methods</h1>
      <p className="mb-6 text-muted-foreground">You can securely add, update, or remove your payment methods using the Stripe Customer Portal.</p>
      <Button onClick={handleManagePayments} disabled={isPending}>
        {isPending ? 'Redirecting...' : 'Manage Payment Methods'}
      </Button>
      {error && <div className="text-destructive text-sm mt-4">{error}</div>}
    </section>
  )
} 