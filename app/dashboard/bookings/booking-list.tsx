'use client'

import type { Booking } from '@/types/client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { removeBooking, getBookingsForClient, setClientCompleted } from '@/lib/firebase/bookings'
import { BookingRequestForm } from './booking-request-form'
import { useUser } from '@clerk/nextjs'
import { getAllContractors } from '@/lib/firebase/contractors'
import type { Contractor } from '@/types/contractor'
import { getClientProfile } from '@/lib/firebase/client'

interface BookingListProps {
  bookings: Booking[]
}

export function BookingList({ bookings: initialBookings }: BookingListProps) {
  const { user } = useUser()
  const [bookings, setBookings] = useState(initialBookings)
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRequestOpen, setIsRequestOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null)
  const [petNames, setPetNames] = useState<string[]>([])

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
      await removeBooking(cancelId)
      setBookings((prev) => prev.filter((b) => b.id !== cancelId))
      setCancelId(null)
    } catch (err) {
      setError('Failed to cancel booking')
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
    <section className="max-w-3xl mx-auto">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsRequestOpen(true)}>New Booking</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border rounded-lg bg-background">
          <thead>
            <tr className="bg-muted">
              <th className="px-4 py-2 text-left">Service</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Contractor</th>
              <th className="px-4 py-2 text-left">Pets</th>
              <th className="px-4 py-2 text-left">Payment</th>
              <th className="px-4 py-2 text-left">Review</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-4 py-2">{b.serviceType}</td>
                <td className="px-4 py-2">{new Date(b.date).toLocaleString()}</td>
                <td className="px-4 py-2 capitalize"><StatusBadge status={b.status} /></td>
                <td className="px-4 py-2">{contractorNameById(b.contractorId)}</td>
                <td className="px-4 py-2">{b.petIds?.length ?? 0}</td>
                <td className="px-4 py-2 capitalize">{b.paymentStatus}</td>
                <td className="px-4 py-2">
                  {b.review ? (
                    <span>
                      {b.review.rating}★
                      {b.review.comment && <span className="ml-1 text-xs text-muted-foreground">{b.review.comment}</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <Button variant="outline" className="text-sm px-2 py-1 mr-2" onClick={() => setDetailBooking(b)}>
                    View Details
                  </Button>
                  <Button variant="destructive" className="text-sm px-2 py-1 mr-2" onClick={() => setCancelId(b.id)} disabled={isPending || b.status !== 'pending'}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {detailBooking && (
            <div className="space-y-2">
              <div><span className="font-medium">Service:</span> {detailBooking.serviceType}</div>
              <div><span className="font-medium">Date:</span> {new Date(detailBooking.date).toLocaleString()}</div>
              <div><span className="font-medium">Status:</span> <StatusBadge status={detailBooking.status} /></div>
              <div><span className="font-medium">Contractor:</span> {contractorNameById(detailBooking.contractorId)}</div>
              <div><span className="font-medium">Pets:</span> {petNames.join(', ')}</div>
              <div><span className="font-medium">Payment Status:</span> {detailBooking.paymentStatus}</div>
              <div><span className="font-medium">Payment Amount:</span> ${detailBooking.paymentAmount}</div>
              {detailBooking.review && (
                <div><span className="font-medium">Review:</span> {detailBooking.review.rating}★ {detailBooking.review.comment}</div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailBooking(null)}>Close</Button>
            {detailBooking?.status === 'pending' && (
              <Button variant="destructive" onClick={() => { setCancelId(detailBooking.id); setDetailBooking(null); }} disabled={isPending}>
                Cancel Booking
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
} 