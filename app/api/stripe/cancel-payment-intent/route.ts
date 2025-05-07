import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId } = await req.json()
    console.log('[cancel-payment-intent] Received paymentIntentId:', paymentIntentId)
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 })
    }
    const intent = await stripe.paymentIntents.cancel(paymentIntentId)
    console.log('[cancel-payment-intent] Stripe response:', intent.status)
    return NextResponse.json({ success: true, status: intent.status, intent })
  } catch (err: any) {
    console.error('[cancel-payment-intent] Failed to cancel PaymentIntent:', err)
    return NextResponse.json({ error: err?.message || 'Stripe error', details: err }, { status: 500 })
  }
} 