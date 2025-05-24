import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { getClientProfile, updateClientProfile } from '@/lib/firebase/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(_req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const profile = await getClientProfile(user.id)
    let customerId = profile?.stripeCustomerId

    // If no Stripe customer, create one and save to Firestore
    if (!customerId) {
      const email = user.emailAddresses?.[0]?.emailAddress
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
      if (!email) return NextResponse.json({ error: 'No email for user' }, { status: 400 })

      const customer = await stripe.customers.create({
        email,
        name,
        metadata: { clerkUserId: user.id }
      })
      customerId = customer.id
      await updateClientProfile(user.id, { stripeCustomerId: customerId })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/dashboard/payments',
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Failed to create Stripe portal session:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}