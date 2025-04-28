"use client"
import { useEffect, useState } from 'react'
import { useRequireRole } from '../../use-require-role'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getGigsForContractor } from '@/lib/firebase/bookings'
import { getContractorProfile } from '@/lib/firebase/contractors'

interface PaymentGig {
  id: string
  serviceType: string
  clientName: string
  date: string
  amount: number
  status: 'pending' | 'approved' | 'completed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'escrow'
}

export default function ContractorPaymentsPage() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const [gigs, setGigs] = useState<PaymentGig[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [payoutMethod, setPayoutMethod] = useState<{ last4: string; brand: string } | null>(null)
  const [payouts, setPayouts] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    Promise.all([
      getGigsForContractor(user.id),
      getContractorProfile(user.id),
    ])
      .then(async ([bookings, profile]) => {
        setStripeAccountId(profile?.stripeAccountId || null)
        // Fetch payout method details from Stripe if account exists
        if (profile?.stripeAccountId) {
          try {
            const res = await fetch('/api/stripe/list-payment-methods', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ stripeAccountId: profile.stripeAccountId }),
            })
            const data = await res.json()
            if (data.hasPayoutMethod && data.payoutMethod) {
              setPayoutMethod({
                last4: data.payoutMethod.last4,
                brand: data.payoutMethod.brand,
              })
            } else {
              setPayoutMethod(null)
            }
            // Fetch payouts
            const payoutsRes = await fetch('/api/stripe/list-payouts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ stripeAccountId: profile.stripeAccountId }),
            })
            const payoutsData = await payoutsRes.json()
            setPayouts(payoutsData.payouts || [])
          } catch (err) {
            setPayoutMethod(null)
            setPayouts([])
          }
        } else {
          setPayoutMethod(null)
          setPayouts([])
        }
        const mapped = await Promise.all(bookings.map(async (b: any) => {
          let clientName = 'N/A'
          if (b.clientId) {
            const client = await import('@/lib/firebase/client').then(m => m.getClientById(b.clientId))
            clientName = client?.name || 'N/A'
          }
          return {
            id: b.id,
            serviceType: b.serviceType || 'N/A',
            clientName,
            date: b.date || 'N/A',
            amount: b.paymentAmount || 0,
            status: b.status || 'pending',
            paymentStatus: b.paymentStatus || 'pending',
          }
        }))
        setGigs(mapped)
      })
      .catch(() => setError('Failed to load payments'))
      .finally(() => setLoading(false))
  }, [user])

  const handleSetupPayouts = async () => {
    setActionLoading('setup')
    setError(null)
    try {
      const res = await fetch('/api/stripe/connect-onboard', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Failed to get Stripe onboarding link')
      }
    } catch {
      setError('Failed to start payout setup')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReleasePayment = async (gigId: string) => {
    setActionLoading(gigId)
    setSuccess(null)
    setError(null)
    try {
      const res = await fetch('/api/stripe/release-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gigId }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('Payment released!')
        // Optionally refresh gigs
      } else {
        setError('Failed to release payment')
      }
    } catch {
      setError('Failed to release payment')
    } finally {
      setActionLoading(null)
    }
  }

  // Helper to compute payment summary
  const paymentSummary = gigs.reduce(
    (acc, gig) => {
      if (gig.paymentStatus === 'paid') {
        acc.totalEarned += gig.amount
        acc.paidGigs += 1
      } else if (gig.paymentStatus === 'escrow') {
        acc.escrowGigs += 1
        acc.escrowAmount += gig.amount
      } else if (gig.paymentStatus === 'pending') {
        acc.pendingGigs += 1
        acc.pendingAmount += gig.amount
      }
      return acc
    },
    {
      totalEarned: 0,
      paidGigs: 0,
      escrowGigs: 0,
      escrowAmount: 0,
      pendingGigs: 0,
      pendingAmount: 0,
    }
  )

  if (!isLoaded || !isAuthorized) return null
  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading payments...</div>
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>

  return (
    <main className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Payments & Payouts</h1>
      {/* Payment Summary Card */}
      <div className="mb-6 p-4 border rounded bg-blue-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-lg font-bold">${paymentSummary.totalEarned.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Total Earned</div>
          </div>
          <div>
            <div className="text-lg font-bold">{paymentSummary.paidGigs}</div>
            <div className="text-xs text-muted-foreground">Paid Gigs</div>
          </div>
          <div>
            <div className="text-lg font-bold">{paymentSummary.escrowGigs}</div>
            <div className="text-xs text-muted-foreground">In Escrow</div>
          </div>
          <div>
            <div className="text-lg font-bold">{paymentSummary.pendingGigs}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>
      </div>
      {/* Payout Setup UI */}
      {!stripeAccountId ? (
        <div className="mb-6 p-4 border rounded bg-yellow-50 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-medium mb-1">Set up payouts to receive your earnings</div>
            <div className="text-sm text-muted-foreground mb-2">Add a card or bank account to receive payments via Stripe.</div>
          </div>
          <Button variant="default" onClick={handleSetupPayouts} disabled={actionLoading === 'setup'}>
            {actionLoading === 'setup' ? 'Redirecting...' : 'Set Up Payouts'}
          </Button>
        </div>
      ) : !payoutMethod ? (
        <div className="mb-6 p-4 border rounded bg-yellow-50 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-medium mb-1">No payout method on file</div>
            <div className="text-sm text-muted-foreground">Add a card or bank account to receive payments via Stripe.</div>
          </div>
          <Button variant="outline" onClick={handleSetupPayouts}>Add Payout Method</Button>
        </div>
      ) : (
        <div className="mb-6 p-4 border rounded bg-green-50 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-medium mb-1">Payout Method on File</div>
            <div className="text-sm text-muted-foreground">
              {payoutMethod.brand} •••• {payoutMethod.last4}
            </div>
          </div>
          <Button variant="outline" onClick={() => alert('TODO: Stripe Connect update')}>Update Payout Method</Button>
        </div>
      )}
      {success && <div className="text-success mb-4">{success}</div>}
      {gigs.length === 0 ? (
        <div className="text-muted-foreground">No payment history yet.</div>
      ) : (
        <div className="space-y-6">
          {gigs.map(gig => (
            <Card key={gig.id} className="shadow-sm">
              <CardContent className="py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="mb-2">{gig.serviceType}</CardTitle>
                  <div className="text-sm mb-1"><span className="font-medium">Client:</span> {gig.clientName}</div>
                  <div className="text-sm mb-1"><span className="font-medium">Date:</span> {gig.date}</div>
                  <div className="text-sm mb-1"><span className="font-medium">Amount:</span> ${gig.amount.toFixed(2)}</div>
                  <div className="text-sm mb-1"><span className="font-medium">Status:</span> {gig.status}</div>
                  <div className="text-sm"><span className="font-medium">Payment:</span> <span className={gig.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}>{gig.paymentStatus}</span></div>
                </div>
                {/* Release Payment Action */}
                <div className="flex gap-2 mt-4 md:mt-0">
                  {gig.status === 'completed' && gig.paymentStatus !== 'paid' && (
                    <Button
                      variant="default"
                      disabled={actionLoading === gig.id}
                      onClick={() => handleReleasePayment(gig.id)}
                    >
                      {actionLoading === gig.id ? 'Releasing...' : 'Release Payment'}
                    </Button>
                  )}
                  {gig.paymentStatus === 'paid' && (
                    <span className="text-green-700 font-medium">Paid</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Payouts Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Recent Payouts</h2>
        {payouts.length === 0 ? (
          <div className="text-muted-foreground">No payouts found.</div>
        ) : (
          <div className="border rounded bg-background divide-y">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium">${(p.amount / 100).toFixed(2)} {p.currency.toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground">{p.description || 'Payout'}</div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(p.created * 1000).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
} 