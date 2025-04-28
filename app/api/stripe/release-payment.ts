import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const { gigId } = await req.json()
  if (!gigId) return NextResponse.json({ error: 'Missing gigId' }, { status: 400 })

  // 1. Fetch gig from Firestore
  const gigRef = doc(db, 'bookings', gigId)
  const gigSnap = await getDoc(gigRef)
  if (!gigSnap.exists()) return NextResponse.json({ error: 'Gig not found' }, { status: 404 })
  const gig = gigSnap.data() as any

  // 2. Validate gig is completed and not already paid
  if (!gig.clientCompleted || !gig.contractorCompleted) {
    return NextResponse.json({ error: 'Both client and contractor must mark as completed' }, { status: 400 })
  }
  if (gig.paymentStatus === 'paid') {
    return NextResponse.json({ error: 'Payment already released' }, { status: 400 })
  }

  // 3. Get contractor's Stripe account ID
  const contractorId = gig.contractorId
  if (!contractorId) return NextResponse.json({ error: 'No contractor assigned' }, { status: 400 })
  const contractorRef = doc(db, 'contractors', contractorId)
  const contractorSnap = await getDoc(contractorRef)
  if (!contractorSnap.exists()) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
  const contractor = contractorSnap.data() as any
  const stripeAccountId = contractor.stripeAccountId
  if (!stripeAccountId) return NextResponse.json({ error: 'Contractor has no Stripe account' }, { status: 400 })

  // 4. Create a Stripe transfer to contractor
  try {
    // For a real escrow flow, you may want to capture a PaymentIntent here if using manual capture
    // For now, assume funds are in platform balance and transfer to contractor
    const transfer = await stripe.transfers.create({
      amount: Math.round((gig.paymentAmount || 0) * 100),
      currency: 'usd',
      destination: stripeAccountId,
      transfer_group: gig.paymentIntentId || undefined,
      description: `Payout for gig ${gigId}`,
    })
    // 5. Update gig paymentStatus to 'paid' and status to 'completed'
    await setDoc(gigRef, { paymentStatus: 'paid', status: 'completed' }, { merge: true })
    return NextResponse.json({ success: true, transferId: transfer.id })
  } catch (err) {
    console.error('Failed to release payment:', err)
    return NextResponse.json({ error: 'Stripe transfer failed' }, { status: 500 })
  }
} 