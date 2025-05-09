import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(req: NextRequest) {
  const { stripeAccountId, contractorId } = await req.json()
  if (!stripeAccountId || !contractorId) {
    return NextResponse.json({ error: 'Missing stripeAccountId or contractorId' }, { status: 400 })
  }
  try {
    const transfers = await stripe.transfers.list({
      destination: stripeAccountId,
      limit: 20,
    })
    const payouts = transfers.data.map(t => ({
      id: t.id,
      amount: t.amount,
      currency: t.currency,
      created: t.created,
      description: t.description,
    }))

    // Fetch all paid gigs for this contractor
    const bookingsRef = collection(db, 'bookings')
    const q = query(
      bookingsRef,
      where('contractorId', '==', contractorId),
      where('paymentStatus', '==', 'paid')
    )
    const snapshot = await getDocs(q)
    const gigs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    return NextResponse.json({ payouts, gigs })
  } catch (err) {
    console.error('Failed to list payouts or gigs:', err)
    return NextResponse.json({ error: 'Stripe or Firestore error' }, { status: 500 })
  }
} 