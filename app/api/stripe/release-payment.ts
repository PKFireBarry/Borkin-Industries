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
  const gig = gigSnap.data()

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
  const contractor = contractorSnap.data()
  const stripeAccountId = contractor.stripeAccountId
  if (!stripeAccountId) return NextResponse.json({ error: 'Contractor has no Stripe account' }, { status: 400 })

  // 4. Capture the PaymentIntent to release funds
  try {
    // Capture the PaymentIntent (release funds to contractor and pay platform fee)
    const paymentIntentId = gig.paymentIntentId
    if (!paymentIntentId) return NextResponse.json({ error: 'No PaymentIntent ID' }, { status: 400 })
    const capturedIntent: Stripe.PaymentIntent = await stripe.paymentIntents.capture(paymentIntentId)
    
    let charge: Stripe.Charge | null = null;
    if (typeof capturedIntent.latest_charge === 'string') {
      charge = await stripe.charges.retrieve(capturedIntent.latest_charge);
    } else if (capturedIntent.latest_charge) {
      charge = capturedIntent.latest_charge;
    }

    const chargeId = charge ? charge.id : null;
    let stripeFee = null
    let netPayout = null

    if (charge && chargeId && typeof charge.balance_transaction === 'string') {
      const balanceTx = await stripe.balanceTransactions.retrieve(charge.balance_transaction, { 
        stripeAccount: contractor.stripeAccountId 
      });
      stripeFee = balanceTx.fee / 100;
      netPayout = balanceTx.net / 100;
    } else if (charge && chargeId && charge.balance_transaction && typeof charge.balance_transaction === 'object' && charge.balance_transaction.id) {
      // If balance_transaction is an object (expanded)
      stripeFee = charge.balance_transaction.fee / 100;
      netPayout = charge.balance_transaction.net / 100;
    }

    // 5. Update gig paymentStatus to 'paid' and status to 'completed'
    await setDoc(gigRef, { paymentStatus: 'paid', status: 'completed', stripeFee, netPayout }, { merge: true })
    return NextResponse.json({ success: true, paymentIntentId, stripeFee, netPayout })
  } catch (err: unknown) {
    console.error('Failed to release payment:', err)
    const errorMessage = err instanceof Error ? err.message : 'Stripe capture failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
} 