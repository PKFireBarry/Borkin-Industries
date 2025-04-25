"use client"
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { getClientProfile } from '@/lib/firebase/client'

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

export default function PaymentsPage() {
  const { user } = useUser()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMethods() {
      if (!user) return
      setLoading(true)
      setError(null)
      try {
        const profile = await getClientProfile(user.id)
        console.log('[payments] profile:', profile)
        if (!profile?.stripeCustomerId) {
          setError('No Stripe customer ID found.')
          setLoading(false)
          return
        }
        console.log('[payments] stripeCustomerId:', profile.stripeCustomerId)
        const res = await fetch('/api/stripe/list-payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: profile.stripeCustomerId }),
        })
        if (!res.ok) throw new Error('Failed to fetch payment methods')
        const data = await res.json()
        console.log('[payments] paymentMethods API response:', data)
        setMethods(data.paymentMethods)
      } catch (err) {
        setError('Failed to load payment methods')
      } finally {
        setLoading(false)
      }
    }
    fetchMethods()
  }, [user])

  async function handleManagePayments() {
    try {
      const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create portal session')
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      setError('Failed to redirect to Stripe portal')
    }
  }

  return (
    <main className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Your Payment Methods</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-destructive mb-4">{error}</div>}
      {!loading && !error && (
        <div className="space-y-4">
          {methods.length === 0 ? (
            <div className="text-muted-foreground">No payment methods found.</div>
          ) : (
            methods.map((pm) => (
              <div key={pm.id} className={`border rounded p-4 flex items-center gap-4 ${pm.isDefault ? 'border-primary' : ''}`}>
                <div className="font-medium">{pm.brand?.toUpperCase()} **** {pm.last4}</div>
                <div className="text-xs text-muted-foreground">Exp {pm.expMonth}/{pm.expYear}</div>
                {pm.isDefault && <span className="ml-2 px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs">Default</span>}
              </div>
            ))
          )}
        </div>
      )}
      <button
        className="mt-6 px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
        onClick={handleManagePayments}
        type="button"
      >
        Manage Payment Methods
      </button>
    </main>
  )
} 