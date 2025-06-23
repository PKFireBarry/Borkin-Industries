import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/firebase'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { calculateStripeFeeInDollars } from '@/lib/utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(req: NextRequest) {
  const { paymentIntentId, bookingId } = await req.json()
  if (!paymentIntentId || !bookingId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  try {
    // Fetch the PaymentIntent first
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    let paymentIntent: Stripe.PaymentIntent;
    
    if (pi.status === 'requires_payment_method') {
      // Payment method was declined or needs re-authorization
      console.log(`[capture-payment-intent] PaymentIntent ${paymentIntentId} requires payment method, attempting to re-confirm...`)
      
      // Check if PaymentIntent has a payment method attached
      if (!pi.payment_method) {
        console.log(`[capture-payment-intent] PaymentIntent ${paymentIntentId} has no payment method attached`)
        
        // Try to get customer's default payment method
        try {
          const customer = await stripe.customers.retrieve(pi.customer as string)
          if (customer.deleted) {
            throw new Error('Customer not found')
          }
          
          const paymentMethods = await stripe.paymentMethods.list({
            customer: pi.customer as string,
            type: 'card',
            limit: 1
          })
          
          if (paymentMethods.data.length === 0) {
            return NextResponse.json({
              error: `No payment method available. Please add a payment method and try again.`,
              needsReauth: true,
              clientSecret: pi.client_secret
            }, { status: 400 })
          }
          
          // Update PaymentIntent with the customer's payment method
          const defaultPaymentMethod = paymentMethods.data[0]
          console.log(`[capture-payment-intent] Updating PaymentIntent ${paymentIntentId} with payment method ${defaultPaymentMethod.id}`)
          
          paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
            payment_method: defaultPaymentMethod.id
          })
        } catch (error: any) {
          console.log(`[capture-payment-intent] Failed to retrieve/attach payment method:`, error.message)
          return NextResponse.json({
            error: `Payment method unavailable. Please update your payment method and try again.`,
            needsReauth: true,
            clientSecret: pi.client_secret
          }, { status: 400 })
        }
      }
      
      // Try to confirm with the payment method
      try {
        paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings?payment_status=completed`,
          use_stripe_sdk: false
        })
        
        if (paymentIntent.status === 'requires_capture') {
          console.log(`[capture-payment-intent] PaymentIntent ${paymentIntentId} re-confirmed successfully, capturing now...`)
          paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)
        } else {
          return NextResponse.json({
            error: `Payment method requires client-side re-authorization. Please update your payment method and try again.`,
            needsReauth: true,
            clientSecret: paymentIntent.client_secret
          }, { status: 400 })
        }
      } catch (confirmError: any) {
        console.log(`[capture-payment-intent] Re-confirmation failed:`, confirmError.message)
        return NextResponse.json({
          error: `Payment method requires client-side re-authorization. Please update your payment method and try again.`,
          needsReauth: true,
          clientSecret: pi.client_secret
        }, { status: 400 })
      }
    } else if (pi.status === 'requires_confirmation') {
      // If payment needs confirmation, confirm it first with return URL
      console.log(`[capture-payment-intent] PaymentIntent ${paymentIntentId} requires confirmation, confirming now...`)
      paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings?payment_status=completed`,
        use_stripe_sdk: false // This ensures server-side confirmation
      })
      
      // After confirmation, check if it's ready for capture
      if (paymentIntent.status !== 'requires_capture') {
        return NextResponse.json({
          error: `PaymentIntent could not be confirmed for capture. Status after confirmation: ${paymentIntent.status}. Please check payment method or authorization.`
        }, { status: 400 })
      }
      
      // Now capture it
      console.log(`[capture-payment-intent] PaymentIntent ${paymentIntentId} confirmed, capturing now...`)
      paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)
    } else if (pi.status === 'requires_capture') {
      // If already authorized, capture directly
      console.log(`[capture-payment-intent] PaymentIntent ${paymentIntentId} ready for capture, capturing now...`)
      paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)
    } else {
      return NextResponse.json({
        error: `PaymentIntent is not ready to be captured. Current status: ${pi.status}. Expected 'requires_capture', 'requires_confirmation', or 'requires_payment_method'.`
      }, { status: 400 })
    }
    
    // Get the actual Stripe fee from the charge
    let actualStripeFee = null
    let netPayout = null
    
    if (paymentIntent.latest_charge) {
      let charge: Stripe.Charge | null = null;
      if (typeof paymentIntent.latest_charge === 'string') {
        charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
      } else {
        charge = paymentIntent.latest_charge;
      }

      if (charge && charge.balance_transaction) {
        let balanceTx: Stripe.BalanceTransaction | null = null;
        if (typeof charge.balance_transaction === 'string') {
          balanceTx = await stripe.balanceTransactions.retrieve(charge.balance_transaction);
        } else {
          balanceTx = charge.balance_transaction;
        }
        
        if (balanceTx) {
          actualStripeFee = balanceTx.fee / 100; // Convert from cents to dollars
        }
      }
    }
    
    // Get booking data to calculate net payout
    const bookingRef = doc(db, 'bookings', bookingId)
    const bookingSnap = await getDoc(bookingRef)
    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    
    const booking = bookingSnap.data()
    const totalAmount = booking.paymentAmount || 0
    const platformFee = booking.platformFee || (totalAmount * 0.05)
    const stripeFee = actualStripeFee || calculateStripeFeeInDollars(totalAmount) // Use actual fee or fallback to estimate
    
    // New fee structure: contractor receives full base service amount
    // Check if booking has baseServiceAmount (new structure) or use legacy calculation
    if (booking.baseServiceAmount) {
      // New fee structure: contractor gets the full base service amount
      netPayout = booking.baseServiceAmount
    } else {
      // Legacy fee structure: deduct fees from total amount
      netPayout = totalAmount - platformFee - stripeFee
    }
    
    // Update Firestore booking status with actual fees
    await updateDoc(bookingRef, { 
      paymentStatus: 'paid', 
      status: 'completed',
      stripeFee,
      netPayout
    })
    
    // Send booking completion email notification
    try {
      const updatedBooking = {
        ...booking,
        id: bookingId,
        paymentStatus: 'paid',
        status: 'completed',
        stripeFee,
        netPayout,
        platformFee
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/booking-completed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking: updatedBooking })
      })
      
      if (!response.ok) {
        console.error('Failed to send booking completion notification')
      } else {
        console.log('Booking completion notification sent successfully')
      }
    } catch (emailError) {
      console.error('Error sending booking completion notification:', emailError)
      // Don't throw - we don't want email failures to break the payment capture
    }
    
    return NextResponse.json({ 
      ok: true, 
      paymentIntent,
      stripeFee,
      netPayout,
      platformFee,
      totalAmount
    })
  } catch (err: unknown) {
    console.error('Failed to capture PaymentIntent:', err)
    const errorMessage = err instanceof Error ? err.message : 'Stripe error';
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
} 