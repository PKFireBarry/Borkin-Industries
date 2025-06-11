import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAuth } from '@clerk/nextjs/server'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { getBaseAppUrl, isStripeTestMode } from '@/lib/utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Check if contractor already has a Stripe account
  const contractorRef = doc(db, 'contractors', userId)
  const contractorSnap = await getDoc(contractorRef)
  let stripeAccountId = contractorSnap.data()?.stripeAccountId
  const currentIsTestMode = isStripeTestMode()

  // 2. Check for mode mismatch and create new account if needed
  if (stripeAccountId) {
    try {
      // Try to retrieve the account to check if it exists and is accessible
      await stripe.accounts.retrieve(stripeAccountId)
    } catch (error: any) {
      // If we get a test/live mode error, clear the account ID to create a new one
      if (error.message?.includes('test') || error.message?.includes('live mode')) {
        console.log(`Mode mismatch detected for account ${stripeAccountId}, creating new account`)
        stripeAccountId = undefined
      } else {
        throw error
      }
    }
  }

  // 3. Create a new Stripe Connect account if needed
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: contractorSnap.data()?.email,
    })
    stripeAccountId = account.id
    
    // Update Firestore with new account ID
    await setDoc(contractorRef, { 
      stripeAccountId,
      stripeAccountMode: currentIsTestMode ? 'test' : 'live',
      stripeAccountCreatedAt: new Date().toISOString()
    }, { merge: true })
    
    console.log(`Created new Stripe account ${stripeAccountId} in ${currentIsTestMode ? 'test' : 'live'} mode`)
  }

  // 4. Construct URLs with proper scheme
  const paymentsUrl = getBaseAppUrl() + '/dashboard/contractor/payments'

  // 5. Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: paymentsUrl,
    return_url: paymentsUrl,
    type: 'account_onboarding',
  })

  // 6. Return onboarding/update link
  return NextResponse.json({ url: accountLink.url })
} 