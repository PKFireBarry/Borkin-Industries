import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(req: NextRequest) {
  const body = await req.json()
  console.log('[stripe] create-payment-intent request body:', body)
  const { amount, currency, customerId, paymentMethodId } = body
  if (!amount || !currency || !customerId) {
    console.error('[stripe] Missing required fields:', { amount, currency, customerId })
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  try {
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
        metadata: { app: 'boorkin' },
      })
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        capture_method: 'manual',
        metadata: { app: 'boorkin' },
      })
    }
    return NextResponse.json({ id: paymentIntent.id, clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('Failed to create PaymentIntent:', err)
    return NextResponse.json({ error: 'Stripe error' }, { status: 500 })
  }
} 