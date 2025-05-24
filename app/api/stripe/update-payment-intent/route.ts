import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import type { Contractor } from '@/types/contractor'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(req: NextRequest) {
  try {
    const {
      paymentIntentId,
      newAmount,
      currency,
      customerId,
      contractorId,
      paymentMethodId // optional, for immediate confirmation
    } = await req.json()
    if (!paymentIntentId || !newAmount || !currency || !customerId || !contractorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    // Calculate 5% platform fee in cents
    const applicationFeeAmount = Math.round(newAmount * 0.05)
    // Fetch the PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    // Allowed statuses for update
    const updatableStatuses = [
      'requires_payment_method',
      'requires_confirmation',
      'requires_action',
    ]
    if (updatableStatuses.includes(paymentIntent.status)) {
      // Update in place
      const updatedIntent = await stripe.paymentIntents.update(paymentIntentId, {
        amount: newAmount,
        application_fee_amount: applicationFeeAmount,
      })
      return NextResponse.json({ success: true, paymentIntentId, updatedIntent, clientSecret: updatedIntent.client_secret, status: updatedIntent.status })
    } else {
      // Cancel the old PaymentIntent
      await stripe.paymentIntents.cancel(paymentIntentId)
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
      const transferData = { destination: contractor.stripeAccountId }
      // Create a new PaymentIntent
      let newIntent
      if (paymentMethodId) {
        newIntent = await stripe.paymentIntents.create({
          amount: newAmount,
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
        newIntent = await stripe.paymentIntents.create({
          amount: newAmount,
          currency,
          customer: customerId,
          capture_method: 'manual',
          transfer_data: transferData,
          application_fee_amount: applicationFeeAmount,
          metadata: { app: 'boorkin', contractorId },
        })
      }
      return NextResponse.json({
        success: true,
        paymentIntentId: newIntent.id,
        clientSecret: newIntent.client_secret,
        newIntent,
        replaced: true,
        status: newIntent.status
      })
    }
  } catch (err: unknown) {
    console.error('[update-payment-intent] Failed to update PaymentIntent:', err)
    const errorMessage = err instanceof Error ? err.message : 'Stripe error';
    return NextResponse.json({ error: errorMessage, details: err }, { status: 500 })
  }
} 