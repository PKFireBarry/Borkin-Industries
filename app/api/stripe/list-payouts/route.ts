import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(req: NextRequest) {
  const { stripeAccountId } = await req.json()
  if (!stripeAccountId) {
    return NextResponse.json({ error: 'Missing stripeAccountId' }, { status: 400 })
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
    return NextResponse.json({ payouts })
  } catch (err) {
    console.error('Failed to list payouts:', err)
    return NextResponse.json({ error: 'Stripe error' }, { status: 500 })
  }
} 