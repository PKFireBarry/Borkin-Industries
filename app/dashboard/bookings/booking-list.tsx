'use client'

import type { Booking } from '@/types/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { removeBooking } from '@/lib/firebase/bookings'

interface BookingListProps {
  bookings: Booking[]
}

export function BookingList({ bookings: initialBookings }: BookingListProps) {
  const [bookings, setBookings] = useState(initialBookings)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  if (!bookings.length) {
    return <div className="text-muted-foreground">No bookings found.</div>
  }

  return (
    <section className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Your Bookings</h1>
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
                <td className="px-4 py-2 capitalize">{b.status}</td>
                <td className="px-4 py-2">{b.contractorId}</td>
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
                  <Button variant="destructive" size="sm" onClick={() => setCancelId(b.id)} disabled={isPending}>
                    Cancel
                  </Button>
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
    </section>
  )
} 