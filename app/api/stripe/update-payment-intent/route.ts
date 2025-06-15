import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import type { Contractor } from '@/types/contractor'
import { calculatePlatformFee, calculateStripeFee } from '@/lib/utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(req: NextRequest) {
  try {
    const {
      paymentIntentId,
      newAmount,
      currency,
      customerId,
      contractorId,
      paymentMethodId // optional, for immediate confirmation
    } = await req.json()
    if (!paymentIntentId || !newAmount || !currency || !customerId || !contractorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Calculate fees that will be deducted from contractor's payment
    const platformFeeAmount = calculatePlatformFee(newAmount) // 5% platform fee
    const estimatedStripeFee = calculateStripeFee(newAmount) // 2.9% + $0.30 Stripe fee
    
    // Calculate the amount to transfer to contractor (total - platform fee - stripe fee)
    const transferAmount = newAmount - platformFeeAmount - estimatedStripeFee
    
    // Ensure transfer amount is positive
    if (transferAmount <= 0) {
      return NextResponse.json({ error: 'Transfer amount would be negative after fees' }, { status: 400 })
    }
    
    // Fetch the PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    // Allowed statuses for update
    const updatableStatuses = [
      'requires_payment_method',
      'requires_confirmation',
      'requires_action',
    ]
    if (updatableStatuses.includes(paymentIntent.status)) {
      // Update in place
      const updatedIntent = await stripe.paymentIntents.update(paymentIntentId, {
        amount: newAmount,
        metadata: {
          ...paymentIntent.metadata,
          platformFee: platformFeeAmount.toString(),
          estimatedStripeFee: estimatedStripeFee.toString(),
          transferAmount: transferAmount.toString()
        }
      })
      return NextResponse.json({ success: true, paymentIntentId, updatedIntent, clientSecret: updatedIntent.client_secret, status: updatedIntent.status })
    } else {
      // Cancel the old PaymentIntent
      await stripe.paymentIntents.cancel(paymentIntentId)
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
      const transferData = { 
        destination: contractor.stripeAccountId,
        amount: transferAmount
      }
      // Create a new PaymentIntent
      let newIntent
      if (paymentMethodId) {
        newIntent = await stripe.paymentIntents.create({
          amount: newAmount,
          currency,
          customer: customerId,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          capture_method: 'manual',
          transfer_data: transferData,
          metadata: { 
            app: 'boorkin', 
            contractorId,
            platformFee: platformFeeAmount.toString(),
            estimatedStripeFee: estimatedStripeFee.toString(),
            transferAmount: transferAmount.toString()
          },
        })
      } else {
        newIntent = await stripe.paymentIntents.create({
          amount: newAmount,
          currency,
          customer: customerId,
          capture_method: 'manual',
          transfer_data: transferData,
          metadata: { 
            app: 'boorkin', 
            contractorId,
            platformFee: platformFeeAmount.toString(),
            estimatedStripeFee: estimatedStripeFee.toString(),
            transferAmount: transferAmount.toString()
          },
        })
      }
      return NextResponse.json({ success: true, paymentIntentId: newIntent.id, newIntent, clientSecret: newIntent.client_secret, status: newIntent.status })
    }
  } catch (err) {
    console.error('Failed to update PaymentIntent:', err)
    return NextResponse.json({ error: 'Stripe error' }, { status: 500 })
  }
} 