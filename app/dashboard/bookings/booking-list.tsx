'use client'

import type { Booking } from '@/types/client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { removeBooking, getBookingsForClient, setClientCompleted, saveBookingReview } from '@/lib/firebase/bookings'
import { BookingRequestForm } from './booking-request-form'
import { useUser } from '@clerk/nextjs'
import { getAllContractors } from '@/lib/firebase/contractors'
import type { Contractor } from '@/types/contractor'
import { getClientProfile } from '@/lib/firebase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface BookingListProps {
  bookings: Booking[]
}

// Local type for payment methods
interface LocalPaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

// Extend Booking type locally to allow 'cancelled' as paymentStatus for UI
interface BookingWithCancelled extends Booking {
  paymentStatus: Booking['paymentStatus'] | 'cancelled'
}

export function BookingList({ bookings: initialBookings }: BookingListProps) {
  const { user } = useUser()
  const [bookings, setBookings] = useState<BookingWithCancelled[]>(initialBookings as BookingWithCancelled[])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRequestOpen, setIsRequestOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null)
  const [petNames, setPetNames] = useState<string[]>([])
  const [reviewModal, setReviewModal] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null })
  const [defaultMethod, setDefaultMethod] = useState<LocalPaymentMethod | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    async function fetchContractors() {
      const all = await getAllContractors()
      setContractors(all)
    }
    fetchContractors()
  }, [])

  useEffect(() => {
    async function fetchPetNames() {
      if (!detailBooking || !user) return
      const profile = await getClientProfile(user.id)
      if (!profile) return
      const names = detailBooking.petIds?.map(pid => profile.pets?.find(p => p.id === pid)?.name || pid) || []
      setPetNames(names)
    }
    fetchPetNames()
  }, [detailBooking, user])

  // Fetch default payment method when showing details
  useEffect(() => {
    async function fetchDefault() {
      if (!detailBooking || !user) return
      const profile = await getClientProfile(user.id)
      if (!profile?.stripeCustomerId) return
      try {
        const res = await fetch('/api/stripe/list-payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: profile.stripeCustomerId }),
        })
        if (res.ok) {
          const { paymentMethods } = await res.json()
          const card = (paymentMethods as LocalPaymentMethod[]).find(pm => pm.isDefault) || paymentMethods[0] || null
          setDefaultMethod(card)
        }
      } catch {
        setDefaultMethod(null)
      }
    }
    fetchDefault()
  }, [detailBooking, user])

  const contractorNameById = (id?: string) => {
    if (!id) return 'Unassigned'
    const c = contractors.find(c => c.id === id)
    return c ? c.name : id
  }

  const handleCancel = async () => {
    if (!cancelId) return
    setIsPending(true)
    setError(null)
    try {
      // Find the booking to cancel
      const booking = bookings.find((b) => b.id === cancelId)
      if (!booking) throw new Error('Booking not found')
      // If booking is pending and has a paymentIntentId, cancel the payment intent first
      if (booking.status === 'pending' && booking.paymentStatus === 'pending' && booking.paymentIntentId) {
        const res = await fetch('/api/stripe/cancel-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: booking.paymentIntentId }),
        })
        const data = await res.json()
        console.log('[handleCancel] cancel-payment-intent response:', data)
        if (!res.ok) {
          throw new Error(data.error || 'Failed to cancel payment')
        }
        if (data.status !== 'canceled') {
          throw new Error(`Stripe PaymentIntent not canceled. Status: ${data.status}`)
        }
      }
      await removeBooking(cancelId)
      setBookings((prev) => prev.filter((b) => b.id !== cancelId))
      setCancelId(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel booking')
    } finally {
      setIsPending(false)
    }
  }

  const handleRequestSuccess = async () => {
    setIsRequestOpen(false)
    if (!user) return
    setIsRefreshing(true)
    try {
      const latest = await getBookingsForClient(user.id)
      setBookings(latest)
    } catch (err) {
      // Optionally handle error
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleConfirmPayment(booking: Booking, setIsPending: (v: boolean) => void, setError: (v: string | null) => void, setBookings: (fn: (prev: Booking[]) => Booking[]) => void) {
    setIsPending(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/capture-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: booking.paymentIntentId, bookingId: booking.id }),
      })
      if (!res.ok) throw new Error('Failed to capture payment')
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, paymentStatus: 'paid', status: 'completed' } : b))
    } catch (err) {
      setError('Failed to confirm payment')
    } finally {
      setIsPending(false)
    }
  }

  async function handleClientComplete(bookingId: string) {
    setIsPending(true)
    setError(null)
    try {
      await setClientCompleted(bookingId, true)
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, clientCompleted: true } : b))
    } catch (err) {
      setError('Failed to mark as completed')
    } finally {
      setIsPending(false)
    }
  }

  // Add a helper for status badge
  function StatusBadge({ status }: { status: string }) {
    let color = 'bg-gray-200 text-gray-700'
    if (status === 'pending') color = 'bg-yellow-100 text-yellow-800'
    if (status === 'approved') color = 'bg-blue-100 text-blue-800'
    if (status === 'completed') color = 'bg-green-100 text-green-800'
    if (status === 'cancelled') color = 'bg-red-100 text-red-800'
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  // Helper to filter bookings by status
  const filterBookings = (status: string) => {
    const getSortDate = (b: Booking) => b.startDate || b.date || '';
    if (status === 'all') return bookings.slice().sort((a, b) => new Date(getSortDate(b)).getTime() - new Date(getSortDate(a)).getTime());
    return bookings.filter(b => b.status === status).sort((a, b) => new Date(getSortDate(b)).getTime() - new Date(getSortDate(a)).getTime());
  }

  // Helper to safely format date
  const safeDateString = (date: string) => {
    const d = date || '';
    if (!d) return '';
    try {
      return new Date(d).toLocaleString();
    } catch {
      return '';
    }
  };

  const getBookingStartDate = (b: typeof detailBooking) => (b?.startDate ?? b?.date ?? '') || '';
  const getBookingEndDate = (b: typeof detailBooking) => (b?.endDate ?? '') || '';

  // Helper to get display date for a booking (for list view)
  const getBookingDisplayDate = (b: Booking) => {
    const start = b.startDate ?? b.date ?? '';
    const end = b.endDate ?? '';
    if (start && end) {
      return `${safeDateString(start ?? '')} — ${safeDateString(end ?? '')}`;
    }
    if (start) return safeDateString(start ?? '');
    return '';
  };

  if (!bookings.length) {
    return (
      <>
        <div className="flex justify-end mb-4">
          <Button onClick={() => setIsRequestOpen(true)}>New Booking</Button>
        </div>
        <div className="text-muted-foreground">No bookings found.</div>
        <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Booking Request</DialogTitle>
            </DialogHeader>
            <BookingRequestForm onSuccess={handleRequestSuccess} />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <section className="w-full px-2 sm:px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsRequestOpen(true)}>New Booking</Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-4">
        <TabsList className="w-full flex flex-wrap gap-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        {['all', 'pending', 'approved', 'completed', 'cancelled'].map(tab => (
          <TabsContent key={tab} value={tab} className="w-full">
            <div className="grid gap-4 w-full">
              {filterBookings(tab).length === 0 ? (
                <div className="text-muted-foreground p-8 text-center">No bookings found.</div>
              ) : (
                filterBookings(tab).map((b) => (
                  <Card key={b.id} className="w-full">
                    <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                      <div>
                        <CardTitle className="text-lg">{b.serviceType}</CardTitle>
                        <div className="text-sm text-gray-500">{getBookingDisplayDate(b)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2 min-w-[120px]">
                        <StatusBadge status={b.status} />
                        <span className={`capitalize text-xs${b.paymentStatus === 'cancelled' ? ' text-red-600' : ''}`}>{b.paymentStatus}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Contractor: <span className="font-medium text-foreground">{contractorNameById(b.contractorId)}</span></span>
                        <span className="text-xs text-muted-foreground">Pets: <span className="font-medium text-foreground">{b.petIds?.length ?? 0}</span></span>
                        {b.review && (
                          <span className="text-xs text-muted-foreground">Review: <span className="font-medium text-foreground">{b.review.rating}★</span> {b.review.comment}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button variant="outline" className="text-sm px-2 py-1" onClick={() => setDetailBooking(b)}>
                          Details
                        </Button>
                        <Button variant="destructive" className="text-sm px-2 py-1" onClick={() => setCancelId(b.id)} disabled={isPending || b.status !== 'pending'}>
                          Cancel
                        </Button>
                        {b.status === 'approved' && b.paymentStatus === 'pending' && !b.clientCompleted && (
                          <Button
                            variant="default"
                            className="text-sm px-2 py-1"
                            onClick={() => handleClientComplete(b.id)}
                            disabled={isPending}
                          >
                            {isPending ? 'Marking...' : 'Mark as Completed'}
                          </Button>
                        )}
                        {b.status === 'approved' && b.paymentStatus === 'pending' && b.clientCompleted && !b.contractorCompleted && (
                          <span className="text-xs text-muted-foreground">Waiting for contractor...</span>
                        )}
                        {b.status === 'approved' && b.paymentStatus === 'pending' && b.clientCompleted && b.contractorCompleted && (
                          <Button
                            variant="default"
                            className="text-sm px-2 py-1"
                            onClick={() => handleConfirmPayment(b, setIsPending, setError, setBookings)}
                            disabled={isPending}
                          >
                            {isPending ? 'Confirming...' : 'Release Payment'}
                          </Button>
                        )}
                        {b.status === 'completed' && b.paymentStatus === 'paid' && !b.review && (
                          <Button
                            variant="default"
                            className="text-sm px-2 py-1"
                            onClick={() => setReviewModal({ open: true, booking: b })}
                          >
                            Leave Review
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to cancel this booking?</div>
          {error && <div className="text-destructive text-sm mt-2">{error}</div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)} disabled={isPending}>Close</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
              {isPending ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Booking Request</DialogTitle>
          </DialogHeader>
          <BookingRequestForm onSuccess={handleRequestSuccess} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!detailBooking} onOpenChange={() => setDetailBooking(null)}>
        <DialogContent className="w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {detailBooking && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">Booking Details</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Service Type</div>
                  <div className="font-medium text-base">{detailBooking?.serviceType ?? ''}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-medium">
                    {detailBooking?.status?.charAt(0).toUpperCase() + detailBooking?.status?.slice(1)}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Date & Time</div>
                  <div className="font-medium text-base">
                    {getBookingDisplayDate(detailBooking)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Payment Status</div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${detailBooking?.paymentStatus === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                    {detailBooking?.paymentStatus?.charAt(0).toUpperCase() + detailBooking?.paymentStatus?.slice(1)}
                  </span>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="text-xs text-muted-foreground mb-1">Contractor</div>
                <div className="font-medium text-base">{contractorNameById(detailBooking?.contractorId)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Pets</div>
                <div className="flex flex-wrap gap-2">
                  {petNames.length > 0 ? petNames.map(name => (
                    <span key={name} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">{name}</span>
                  )) : <span className="text-muted-foreground text-xs">None</span>}
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="text-xs text-muted-foreground mb-2 font-semibold">Payment Information</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Amount</div>
                    <div className="font-semibold text-base">${detailBooking?.paymentAmount?.toFixed(2) ?? '0.00'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Platform Fee (5%)</div>
                    <div className="font-semibold text-base text-red-600">-${detailBooking?.platformFee?.toFixed(2) ?? ((detailBooking?.paymentAmount || 0) * 0.05).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Stripe Fee (2.9% + $0.30)</div>
                    <div className="font-semibold text-base text-red-600">-${((detailBooking?.paymentAmount || 0) * 0.029 + 0.3).toFixed(2)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground mb-1">Net to Contractor</div>
                    <div className="font-semibold text-base text-green-700">${((detailBooking?.paymentAmount || 0) - (detailBooking?.platformFee || (detailBooking?.paymentAmount || 0) * 0.05) - ((detailBooking?.paymentAmount || 0) * 0.029 + 0.3)).toFixed(2)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground mb-1">Payment Method</div>
                    <div className="font-medium text-base">{defaultMethod ? `${defaultMethod.brand?.toUpperCase?.() ?? ''} •••• ${defaultMethod.last4 ?? ''}` : 'Not specified'}</div>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="text-xs text-muted-foreground mb-2 font-semibold">Booking Process</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Client Completed</div>
                    <div className="font-medium text-base">{detailBooking?.clientCompleted ? 'Yes' : 'No'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Contractor Completed</div>
                    <div className="font-medium text-base">{detailBooking?.contractorCompleted ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4 text-xs text-muted-foreground">
                <div className="mb-1">Booking ID</div>
                <div className="font-mono break-all mb-1">{detailBooking?.id ?? ''}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setDetailBooking(null)}>Close</Button>
              {detailBooking?.status === 'pending' && (
                <Button variant="destructive" onClick={() => { setCancelId(detailBooking.id); setDetailBooking(null); }} disabled={isPending}>
                  Cancel Booking
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={reviewModal.open} onOpenChange={open => setReviewModal({ open, booking: open ? reviewModal.booking : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
          </DialogHeader>
          {reviewModal.booking && (
            <ReviewForm
              booking={reviewModal.booking}
              onClose={() => setReviewModal({ open: false, booking: null })}
              onSaved={async (review) => {
                await saveBookingReview(reviewModal.booking!.id, review, reviewModal.booking!.contractorId)
                setBookings(prev => prev.map(b => b.id === reviewModal.booking!.id ? { ...b, review } : b))
                setReviewModal({ open: false, booking: null })
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function ReviewForm({ booking, onClose, onSaved }: { booking: Booking, onClose: () => void, onSaved: (review: { rating: number, comment?: string }) => void }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      onSubmit={async e => {
        e.preventDefault()
        setIsPending(true)
        setError(null)
        try {
          await onSaved({ rating, comment })
        } catch (err) {
          setError('Failed to save review')
        } finally {
          setIsPending(false)
        }
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Rating</label>
        <select value={rating} onChange={e => setRating(Number(e.target.value))} className="w-full border rounded px-2 py-1">
          {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Comment (optional)</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} className="w-full border rounded px-2 py-1" rows={3} />
      </div>
      {error && <div className="text-destructive text-sm">{error}</div>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Submit Review'}</Button>
      </DialogFooter>
    </form>
  )
} 