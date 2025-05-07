import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import type { Contractor } from '@/types/contractor'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(req: NextRequest) {
  const body = await req.json()
  console.log('[stripe] create-payment-intent request body:', body)
  const { amount, currency, customerId, paymentMethodId, contractorId } = body
  if (!amount || !currency || !customerId || !contractorId) {
    console.error('[stripe] Missing required fields:', { amount, currency, customerId, contractorId })
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  // Fetch contractor's Stripe account ID
  const contractorRef = doc(db, 'contractors', contractorId)
  const contractorSnap = await getDoc(contractorRef)
  if (!contractorSnap.exists()) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
  }
  const contractor = contractorSnap.data() as Contractor
  if (!contractor.stripeAccountId) {
    return NextResponse.json({ error: 'Contractor has no Stripe account' }, { status: 400 })
  }
  try {
    const transferData = { destination: contractor.stripeAccountId }
    // Calculate 5% platform fee in cents
    const applicationFeeAmount = Math.round(amount * 0.05)
    let paymentIntent
    if (paymentMethodId) {
      paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        capture_method: 'manual',
        transfer_data: transferData,
        application_fee_amount: applicationFeeAmount,
        metadata: { app: 'boorkin', contractorId },
      })
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        capture_method: 'manual',
        transfer_data: transferData,
        application_fee_amount: applicationFeeAmount,
        metadata: { app: 'boorkin', contractorId },
      })
    }
    return NextResponse.json({ id: paymentIntent.id, clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('Failed to create PaymentIntent:', err)
    return NextResponse.json({ error: 'Stripe error' }, { status: 500 })
  }
} 