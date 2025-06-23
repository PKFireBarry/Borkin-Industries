import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import type { Contractor } from '@/types/contractor'
import { calculatePlatformFee, calculateStripeFee } from '@/lib/utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(req: NextRequest) {
  const body = await req.json()
  console.log('[stripe] create-payment-intent request body:', body)
  const { amount, currency, customerId, paymentMethodId, contractorId, baseServiceAmount } = body
  if (!amount || !currency || !customerId || !contractorId) {
    console.error('[stripe] Missing required fields:', { amount, currency, customerId, contractorId })
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
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
  try {
    // New fee structure: client pays fees, contractor receives full service amount
    let transferAmount: number;
    let platformFeeAmount: number;
    let estimatedStripeFee: number;
    
    if (baseServiceAmount) {
      // New fee structure: contractor receives the full base service amount
      transferAmount = baseServiceAmount;
      platformFeeAmount = calculatePlatformFee(baseServiceAmount);
      estimatedStripeFee = calculateStripeFee(baseServiceAmount);
    } else {
      // Legacy fee structure: deduct fees from total amount
      platformFeeAmount = calculatePlatformFee(amount);
      estimatedStripeFee = calculateStripeFee(amount);
      transferAmount = amount - platformFeeAmount - estimatedStripeFee;
    }
    
    // Ensure transfer amount is positive
    if (transferAmount <= 0) {
      return NextResponse.json({ error: 'Transfer amount would be negative after fees' }, { status: 400 })
    }

    const transferData = { 
      destination: contractor.stripeAccountId,
      amount: transferAmount
    }
    
    // Create PaymentIntent without confirming - only authorize when booking is completed
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method: paymentMethodId || undefined,
      capture_method: 'manual',
      transfer_data: transferData,
      metadata: { 
        app: 'boorkin', 
        contractorId,
        platformFee: platformFeeAmount.toString(),
        estimatedStripeFee: estimatedStripeFee.toString(),
        transferAmount: transferAmount.toString(),
        ...body.metadata
      },
    })
    return NextResponse.json({ id: paymentIntent.id, clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('Failed to create PaymentIntent:', err)
    return NextResponse.json({ error: 'Stripe error' }, { status: 500 })
  }
} 