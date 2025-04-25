import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/firebase'
import { doc, updateDoc } from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(req: NextRequest) {
  const { paymentIntentId, bookingId } = await req.json()
  if (!paymentIntentId || !bookingId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)
    // Update Firestore booking status
    const bookingRef = doc(db, 'bookings', bookingId)
    await updateDoc(bookingRef, { paymentStatus: 'paid', status: 'completed' })
    return NextResponse.json({ ok: true, paymentIntent })
  } catch (err) {
    console.error('Failed to capture PaymentIntent:', err)
    return NextResponse.json({ error: 'Stripe error' }, { status: 500 })
  }
} 