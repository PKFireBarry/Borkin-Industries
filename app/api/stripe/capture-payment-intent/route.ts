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
    // Fetch the PaymentIntent first
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (pi.status !== 'requires_capture') {
      return NextResponse.json({
        error: `PaymentIntent is not ready to be captured. Current status: ${pi.status}. Please ensure payment is authorized before releasing funds.`
      }, { status: 400 })
    }
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)
    // Update Firestore booking status
    const bookingRef = doc(db, 'bookings', bookingId)
    await updateDoc(bookingRef, { paymentStatus: 'paid', status: 'completed' })
    return NextResponse.json({ ok: true, paymentIntent })
  } catch (err: any) {
    console.error('Failed to capture PaymentIntent:', err)
    return NextResponse.json({ error: err?.message || 'Stripe error' }, { status: 500 })
  }
} 