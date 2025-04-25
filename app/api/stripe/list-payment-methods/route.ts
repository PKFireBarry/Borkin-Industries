import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(req: NextRequest) {
  const { customerId } = await req.json()
  console.log('[stripe] list-payment-methods: customerId', customerId)
  if (!customerId) {
    return NextResponse.json({ error: 'Missing customerId' }, { status: 400 })
  }
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })
    console.log('[stripe] paymentMethods:', paymentMethods.data)
    const customer = await stripe.customers.retrieve(customerId)
    let defaultId: string | undefined = undefined
    if (typeof customer === 'object' && !('deleted' in customer)) {
      defaultId = customer.invoice_settings?.default_payment_method as string | undefined
    }
    console.log('[stripe] default payment method id:', defaultId)
    let methods = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isDefault: pm.id === defaultId,
    }))
    // Fallback: if no methods but defaultId exists, fetch it directly
    if (methods.length === 0 && defaultId) {
      try {
        const pm = await stripe.paymentMethods.retrieve(defaultId)
        if (pm && pm.object === 'payment_method' && pm.card) {
          methods = [{
            id: pm.id,
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
            isDefault: true,
          }]
        }
      } catch (err) {
        console.error('[stripe] Could not fetch default payment method:', err)
      }
    }
    return NextResponse.json({ paymentMethods: methods })
  } catch (err) {
    console.error('Failed to list payment methods:', err)
    return NextResponse.json({ error: 'Stripe error' }, { status: 500 })
  }
} 