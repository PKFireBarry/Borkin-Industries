'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useUser } from '@clerk/nextjs'
import { addTestBooking, removeTestBooking, getBookingsForClient } from '@/lib/firebase/bookings'
import type { Booking } from '@/types/client'

const TEST_BOOKING_ID = 'test_booking_001'

function getSampleBooking(userId: string, petIds: string[]): Booking {
  return {
    id: TEST_BOOKING_ID,
    clientId: userId,
    contractorId: 'contractor_123',
    petIds: petIds.length ? petIds : ['pet_abc123'],
    serviceType: 'Dog Walking',
    date: new Date().toISOString(),
    status: 'pending',
    paymentStatus: 'pending',
    paymentAmount: 50
    // review field omitted if not present
  } as Booking;
}

export function GenerateTestBookingButton() {
  const { user } = useUser()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [hasTestBooking, setHasTestBooking] = useState(false)

  async function checkTestBooking() {
    if (!user) return
    const bookings = await getBookingsForClient(user.id)
    setHasTestBooking(bookings.some((b) => b.id === TEST_BOOKING_ID))
  }

  async function handleGenerate() {
    setError(null)
    console.log('user:', user)
    console.log('user.id:', user?.id)
    if (!user) return
    try {
      // For demo, just use a fake petId
      const newBooking = getSampleBooking(user.id, ['pet_abc123'])
      console.log('Booking to add:', newBooking)
      await addTestBooking(newBooking)
      setHasTestBooking(true)
      window.location.reload()
    } catch (err) {
      console.error('Failed to generate test booking:', err)
      setError('Failed to generate test booking')
    }
  }

  async function handleRemove() {
    setError(null)
    if (!user) return
    try {
      await removeTestBooking(TEST_BOOKING_ID)
      setHasTestBooking(false)
      window.location.reload()
    } catch (err) {
      console.error('Failed to remove test booking:', err)
      setError('Failed to remove test booking')
    }
  }

  // Check for test booking on mount
  useEffect(() => { checkTestBooking() }, [])

  return (
    <div className="mb-4 flex gap-2 items-center">
      <Button onClick={() => startTransition(handleGenerate)} disabled={isPending || hasTestBooking}>
        {isPending ? 'Generating...' : hasTestBooking ? 'Test Booking Exists' : 'Generate Test Booking'}
      </Button>
      <Button variant="destructive" onClick={() => startTransition(handleRemove)} disabled={isPending || !hasTestBooking}>
        Remove Test Booking
      </Button>
      {error && <span className="text-destructive text-sm ml-2">{error}</span>}
    </div>
  )
} 