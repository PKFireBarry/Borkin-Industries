import { db } from '../../firebase'
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import type { Booking } from '@/types/client'

export async function getBookingsForClient(clientId: string): Promise<Booking[]> {
  const bookingsRef = collection(db, 'bookings')
  const q = query(bookingsRef, where('clientId', '==', clientId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking))
}

export async function addTestBooking(booking: Booking): Promise<void> {
  const bookingRef = doc(db, 'bookings', booking.id)
  await setDoc(bookingRef, booking)
}

export async function addBooking(data: Omit<Booking, 'id'> & { stripeCustomerId: string }): Promise<string> {
  // Fetch default payment method for the customer
  let paymentMethodId: string | undefined = undefined
  try {
    const res = await fetch('/api/stripe/list-payment-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: data.stripeCustomerId }),
    })
    if (res.ok) {
      const { paymentMethods } = await res.json()
      const defaultCard = paymentMethods.find((pm: any) => pm.isDefault) || paymentMethods[0]
      if (defaultCard) paymentMethodId = defaultCard.id
    }
  } catch (err) {
    // ignore, fallback to no payment method
  }
  // Calculate 5% platform fee
  const platformFee = Math.round((data.paymentAmount || 0) * 0.05 * 100) / 100
  // Create PaymentIntent in Stripe
  const res = await fetch('/api/stripe/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Math.round((data.paymentAmount || 0) * 100),
      currency: 'usd',
      customerId: data.stripeCustomerId,
      contractorId: data.contractorId,
      ...(paymentMethodId ? { paymentMethodId } : {}),
      platformFee,
    }),
  })
  if (!res.ok) throw new Error('Failed to create payment intent')
  const { id: paymentIntentId, clientSecret } = await res.json()

  const bookingsRef = collection(db, 'bookings')
  const newDoc = doc(bookingsRef)
  const booking: Booking = {
    ...data,
    id: newDoc.id,
    paymentIntentId,
    paymentClientSecret: clientSecret,
    paymentStatus: 'pending',
    platformFee,
  }
  await setDoc(newDoc, booking)
  return newDoc.id
}

export async function removeBooking(bookingId: string): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId)
  await deleteDoc(bookingRef)
}

export async function getGigsForContractor(contractorId: string): Promise<Booking[]> {
  const bookingsRef = collection(db, 'bookings')
  const q = query(bookingsRef, where('contractorId', '==', contractorId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking))
}

export async function updateBookingStatus(bookingId: string, status: 'pending' | 'approved' | 'completed' | 'cancelled'): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId)
  if (status === 'cancelled') {
    // Fetch booking to get paymentIntentId and paymentStatus
    const snap = await getDoc(bookingRef)
    if (snap.exists()) {
      const booking = snap.data() as Booking
      let paymentStatus: Booking['paymentStatus'] = booking.paymentStatus
      // Cancel Stripe PaymentIntent if pending
      if (booking.paymentIntentId && paymentStatus === 'pending') {
        try {
          const res = await fetch('/api/stripe/cancel-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId: booking.paymentIntentId }),
          })
          const data = await res.json()
          if (res.ok && data.status === 'canceled') {
            paymentStatus = 'cancelled' as any
          } else {
            // If Stripe did not cancel, keep as pending
            paymentStatus = 'pending'
          }
        } catch {
          // If error, keep as pending
          paymentStatus = 'pending'
        }
      } else if (paymentStatus === 'pending') {
        paymentStatus = 'cancelled' as any
      }
      await setDoc(bookingRef, { status, paymentStatus }, { merge: true })
      return
    }
  }
  await setDoc(bookingRef, { status }, { merge: true })
}

export async function setClientCompleted(bookingId: string, completed: boolean): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId)
  await setDoc(bookingRef, { clientCompleted: completed }, { merge: true })
}

export async function setContractorCompleted(bookingId: string, completed: boolean): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId)
  await setDoc(bookingRef, { contractorCompleted: completed }, { merge: true })
}

export async function saveBookingReview(
  bookingId: string,
  review: { rating: number; comment?: string },
  contractorId: string
): Promise<void> {
  // Save review to booking
  const bookingRef = doc(db, 'bookings', bookingId)
  await updateDoc(bookingRef, { review })
  // Append review to contractor's ratings
  const contractorRef = doc(db, 'contractors', contractorId)
  const reviewObj = {
    ...review,
    date: new Date().toISOString(),
    bookingId,
  }
  await updateDoc(contractorRef, { ratings: arrayUnion(reviewObj) })
}

export async function getAllBookings(): Promise<Booking[]> {
  const bookingsRef = collection(db, 'bookings')
  const snapshot = await getDocs(bookingsRef)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking))
} 