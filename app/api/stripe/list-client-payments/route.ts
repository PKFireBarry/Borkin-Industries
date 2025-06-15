import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(req: NextRequest) {
  const { customerId, clientId } = await req.json()
  if (!customerId || !clientId) {
    return NextResponse.json({ error: 'Missing customerId or clientId' }, { status: 400 })
  }

  try {
    // Fetch recent payment intents for this customer
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 20,
    })

    // Fetch completed bookings for this client
    const bookingsRef = collection(db, 'bookings')
    const q = query(
      bookingsRef,
      where('clientId', '==', clientId),
      where('paymentStatus', '==', 'paid')
    )
    const snapshot = await getDocs(q)
    const completedBookings = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        // Sort by date in descending order (newest first)
        const dateA = new Date(a.startDate || a.date || 0).getTime()
        const dateB = new Date(b.startDate || b.date || 0).getTime()
        return dateB - dateA
      })

    // Map payment intents to a cleaner format
    const payments = paymentIntents.data.map(pi => ({
      id: pi.id,
      amount: pi.amount / 100, // Convert from cents to dollars
      currency: pi.currency,
      status: pi.status,
      created: pi.created,
      description: pi.description,
      metadata: pi.metadata,
    }))

    return NextResponse.json({ 
      payments, 
      completedBookings,
      totalSpent: completedBookings.reduce((sum, booking: any) => sum + (booking.paymentAmount || 0), 0),
      totalBookings: completedBookings.length
    })
  } catch (err) {
    console.error('Failed to list client payments:', err)
    return NextResponse.json({ error: 'Stripe or Firestore error' }, { status: 500 })
  }
} 