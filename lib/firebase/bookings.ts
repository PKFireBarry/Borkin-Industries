import { db } from '../../firebase'
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore'
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

export async function addBooking(data: Omit<Booking, 'id'>): Promise<string> {
  const bookingsRef = collection(db, 'bookings')
  const newDoc = doc(bookingsRef)
  const booking: Booking = { ...data, id: newDoc.id }
  await setDoc(newDoc, booking)
  return newDoc.id
}

export async function removeBooking(bookingId: string): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId)
  await deleteDoc(bookingRef)
} 