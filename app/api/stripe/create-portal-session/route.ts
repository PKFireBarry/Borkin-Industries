import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { getClientProfile, updateClientProfile } from '@/lib/firebase/client'
import { getBaseAppUrl, isStripeTestMode } from '@/lib/utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(_req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const profile = await getClientProfile(user.id)
    let customerId = profile?.stripeCustomerId
    const currentIsTestMode = isStripeTestMode()

    // Check for mode mismatch and create new customer if needed
    if (customerId) {
      try {
        // Try to retrieve the customer to check if it exists and is accessible
        await stripe.customers.retrieve(customerId)
      } catch (error: any) {
        // If we get a test/live mode error, clear the customer ID to create a new one
        if (error.message?.includes('test') || error.message?.includes('live mode')) {
          console.log(`Mode mismatch detected for customer ${customerId}, creating new customer`)
          customerId = undefined
        } else {
          throw error
        }
      }
    }

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
      
      // Update with mode tracking
      await updateClientProfile(user.id, { 
        stripeCustomerId: customerId,
        stripeCustomerMode: currentIsTestMode ? 'test' : 'live',
        stripeCustomerCreatedAt: new Date().toISOString()
      })
      
      console.log(`Created new Stripe customer ${customerId} in ${currentIsTestMode ? 'test' : 'live'} mode`)
    }

    // Construct the return URL with proper scheme
    const returnUrl = getBaseAppUrl() + '/dashboard/payments'
    
    // Debug logging
    console.log('Environment NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
    console.log('Base app URL:', getBaseAppUrl())
    console.log('Final return URL:', returnUrl)

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Failed to create Stripe portal session:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}