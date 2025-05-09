"use client"
import { useEffect, useState } from 'react'
import { useRequireRole } from '../../use-require-role'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface PaymentGig {
  id: string
  serviceType: string
  clientName: string
  date: string
  amount: number
  status: 'pending' | 'approved' | 'completed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'escrow' | 'cancelled'
  platformFee?: number
  stripeFee?: number
  netPayout?: number
  petNames?: string
  review?: { rating: number; comment?: string }
}

export default function ContractorPaymentsPage() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gigs, setGigs] = useState<PaymentGig[]>([])
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [payoutMethod, setPayoutMethod] = useState<{ last4: string; brand: string } | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [detailGig, setDetailGig] = useState<PaymentGig | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    fetch(`/api/contractors/${user.id}`)
      .then(res => res.json())
      .then(async (profile) => {
        setStripeAccountId(profile?.stripeAccountId || null)
        if (profile?.stripeAccountId) {
          // Fetch payout method
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
          } catch {
            setPayoutMethod(null)
          }
          // Fetch gigs
          try {
            const res = await fetch('/api/stripe/list-payouts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ stripeAccountId: profile.stripeAccountId, contractorId: user.id }),
            })
            const data = await res.json()
            const mappedGigs = await Promise.all((data.gigs || []).map(async (b: any) => {
              let clientName = 'N/A'
              let petNames = ''
              try {
                const client = await import('@/lib/firebase/client').then(m => m.getClientById(b.clientId))
                clientName = client?.name || 'N/A'
                if (b.petIds && Array.isArray(b.petIds) && client?.pets) {
                  petNames = b.petIds.map((pid: string) => client.pets.find((p: any) => p.id === pid)?.name).filter(Boolean).join(', ')
                }
              } catch {}
              return {
                id: b.id,
                serviceType: b.serviceType || 'N/A',
                clientName,
                date: b.date || b.startDate || 'N/A',
                amount: b.paymentAmount || 0,
                status: b.status || 'pending',
                paymentStatus: b.paymentStatus || 'pending',
                platformFee: b.platformFee || undefined,
                stripeFee: b.stripeFee || undefined,
                netPayout: b.netPayout || undefined,
                petNames,
                review: b.review,
              }
            }))
            setGigs(mappedGigs.filter(g => g.paymentStatus === 'paid'))
          } catch {
            setGigs([])
          }
        } else {
          setPayoutMethod(null)
          setGigs([])
        }
      })
      .catch(() => setError('Failed to load payments'))
      .finally(() => setLoading(false))
  }, [user])

  // Payment summary
  const totalNetPayout = gigs.reduce((acc, gig) => acc + (gig.netPayout ?? (gig.amount - (gig.platformFee ?? gig.amount * 0.05) - (gig.stripeFee ?? (gig.amount * 0.029 + 0.3)))), 0)
  const paidGigsCount = gigs.length

  // Helper to format date(s) like booking-list
  const safeDateString = (date: string) => {
    if (!date) return ''
    try { return new Date(date).toLocaleString() } catch { return '' }
  }
  const getGigDisplayDate = (g: PaymentGig) => {
    // If you add endDate to PaymentGig, use it here
    const start = g.date ?? ''
    return start ? safeDateString(start) : ''
  }

  // Helper for status badge
  function StatusBadge({ status }: { status: string }) {
    let color = 'bg-gray-200 text-gray-700'
    if (status === 'pending') color = 'bg-yellow-100 text-yellow-800'
    if (status === 'approved') color = 'bg-blue-100 text-blue-800'
    if (status === 'completed') color = 'bg-green-100 text-green-800'
    if (status === 'cancelled') color = 'bg-red-100 text-red-800'
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  if (!isLoaded || !isAuthorized) return null
  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading payments...</div>
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>

  return (
    <main className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Paid Gigs</h1>
      {/* Payment Summary Card */}
      <div className="mb-6 p-4 border rounded bg-blue-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div>
            <div className="text-lg font-bold">${totalNetPayout.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Total Net Payout</div>
          </div>
          <div>
            <div className="text-lg font-bold">{paidGigsCount}</div>
            <div className="text-xs text-muted-foreground">Paid Gigs</div>
          </div>
        </div>
      </div>
      {/* Payout Method UI */}
      {!stripeAccountId ? (
        <div className="mb-6 p-4 border rounded bg-yellow-50 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-medium mb-1">Set up payouts to receive your earnings</div>
            <div className="text-sm text-muted-foreground mb-2">Add a card or bank account to receive payments via Stripe.</div>
          </div>
          <Button variant="default" onClick={() => window.location.href = '/dashboard/contractor/profile'}>Set Up Payouts</Button>
        </div>
      ) : !payoutMethod ? (
        <div className="mb-6 p-4 border rounded bg-yellow-50 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-medium mb-1">No payout method on file</div>
            <div className="text-sm text-muted-foreground">Add a card or bank account to receive payments via Stripe.</div>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard/contractor/profile'}>Add Payout Method</Button>
        </div>
      ) : (
        <div className="mb-6 p-4 border rounded bg-green-50 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-medium mb-1">Payout Method on File</div>
            <div className="text-sm text-muted-foreground">
              {payoutMethod.brand} •••• {payoutMethod.last4}
            </div>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard/contractor/profile'}>Update Payout Method</Button>
        </div>
      )}
      {/* Paid Gigs List */}
      {gigs.length === 0 ? (
        <div className="text-muted-foreground">No paid gigs found.</div>
      ) : (
        <div className="space-y-6">
          {gigs.map(gig => (
            <Card key={gig.id} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg">{gig.serviceType}</CardTitle>
                  <div className="text-sm text-gray-500">{getGigDisplayDate(gig)}</div>
                </div>
                <div className="flex flex-col items-end gap-2 min-w-[120px]">
                  <StatusBadge status={gig.status} />
                  <span className={`capitalize text-xs${gig.paymentStatus === 'cancelled' ? ' text-red-600' : ''}`}>{gig.paymentStatus}</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Client: <span className="font-medium text-foreground">{gig.clientName}</span></span>
                  <span className="text-xs text-muted-foreground">Animals: <span className="font-medium text-foreground">{gig.petNames || 'None'}</span></span>
                  {gig.review && (
                    <span className="text-xs text-muted-foreground">Review: <span className="font-medium text-foreground">{gig.review.rating}★</span> {gig.review.comment}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="outline" className="text-sm px-2 py-1" onClick={() => setDetailGig(gig)}>
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Gig Details Modal */}
      <Dialog open={!!detailGig} onOpenChange={() => setDetailGig(null)}>
        <DialogContent className="w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gig Details</DialogTitle>
          </DialogHeader>
          {detailGig && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">Gig Details</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Service Type</div>
                  <div className="font-medium text-base">{detailGig?.serviceType ?? ''}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-medium">
                    {detailGig?.status?.charAt(0).toUpperCase() + detailGig?.status?.slice(1)}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Date & Time</div>
                  <div className="font-medium text-base">{getGigDisplayDate(detailGig)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Payment Status</div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${detailGig?.paymentStatus === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                    {detailGig?.paymentStatus?.charAt(0).toUpperCase() + detailGig?.paymentStatus?.slice(1)}
                  </span>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="text-xs text-muted-foreground mb-1">Client</div>
                <div className="font-medium text-base">{detailGig?.clientName}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Animals</div>
                <div className="flex flex-wrap gap-2">
                  {detailGig.petNames ? detailGig.petNames.split(',').map(name => (
                    <span key={name} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">{name}</span>
                  )) : <span className="text-muted-foreground text-xs">None</span>}
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="text-xs text-muted-foreground mb-2 font-semibold">Payment Information</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Amount</div>
                    <div className="font-semibold text-base">${detailGig?.amount?.toFixed(2) ?? '0.00'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Platform Fee (5%)</div>
                    <div className="font-semibold text-base text-red-600">-${detailGig?.platformFee?.toFixed(2) ?? ((detailGig?.amount || 0) * 0.05).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Stripe Fee</div>
                    <div className="font-semibold text-base text-red-600">-${detailGig?.stripeFee?.toFixed(2) ?? (((detailGig?.amount || 0) * 0.029 + 0.3).toFixed(2))}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground mb-1">Net to Contractor</div>
                    <div className="font-semibold text-base text-green-700">${detailGig?.netPayout?.toFixed(2) ?? (((detailGig?.amount || 0) - (detailGig?.platformFee || (detailGig?.amount || 0) * 0.05) - ((detailGig?.amount || 0) * 0.029 + 0.3)).toFixed(2))}</div>
                  </div>
                </div>
              </div>
              {detailGig.review && (
                <div className="border-t pt-4">
                  <div className="text-xs text-muted-foreground mb-2 font-semibold">Review</div>
                  <div className="text-sm">Rating: <span className="font-bold">{detailGig.review.rating}</span></div>
                  {detailGig.review.comment && <div className="text-sm mt-1">"{detailGig.review.comment}"</div>}
                </div>
              )}
              <div className="border-t pt-4 text-xs text-muted-foreground">
                <div className="mb-1">Booking ID</div>
                <div className="font-mono break-all mb-1">{detailGig?.id ?? ''}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setDetailGig(null)}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
} 