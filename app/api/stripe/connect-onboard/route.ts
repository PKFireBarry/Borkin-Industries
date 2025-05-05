import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAuth } from '@clerk/nextjs/server'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Check if contractor already has a Stripe account
  const contractorRef = doc(db, 'contractors', userId)
  const contractorSnap = await getDoc(contractorRef)
  let stripeAccountId = contractorSnap.data()?.stripeAccountId

  // 2. If not, create a new Stripe Connect account
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: contractorSnap.data()?.email,
    })
    stripeAccountId = account.id
    await setDoc(contractorRef, { stripeAccountId }, { merge: true })
  }

  // 3. Always use 'account_onboarding' for Express accounts
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: process.env.NEXT_PUBLIC_BASE_URL + '/dashboard/contractor/payments',
    return_url: process.env.NEXT_PUBLIC_BASE_URL + '/dashboard/contractor/payments',
    type: 'account_onboarding',
  })

  // 4. Return onboarding/update link
  return NextResponse.json({ url: accountLink.url })
} 