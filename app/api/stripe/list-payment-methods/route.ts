import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function POST(req: NextRequest) {
  const { customerId, stripeAccountId } = await req.json()

  // Client payment methods
  if (customerId) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      })
      // Optionally get default payment method
      const customer = await stripe.customers.retrieve(customerId)
      let defaultId: string | undefined = undefined
      if (typeof customer === 'object' && !('deleted' in customer)) {
        defaultId = customer.invoice_settings?.default_payment_method as string | undefined
      }
      const methods = paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === defaultId,
      }))
      return NextResponse.json({ paymentMethods: methods })
    } catch (err) {
      console.error('Failed to list client payment methods:', err)
      return NextResponse.json({ error: 'Stripe error' }, { status: 500 })
    }
  }

  // Contractor payout methods
  if (stripeAccountId) {
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId, {
        expand: ['external_accounts'],
      })
      const externalAccounts = (account as any).external_accounts?.data || []
      const hasPayoutMethod = externalAccounts.length > 0
      let payoutMethod = null
      if (hasPayoutMethod) {
        const bank = externalAccounts.find((acc: any) => acc.object === 'bank_account')
        const card = externalAccounts.find((acc: any) => acc.object === 'card')
        if (bank) {
          payoutMethod = {
            brand: bank.bank_name,
            last4: bank.last4,
            type: 'bank_account',
          }
        } else if (card) {
          payoutMethod = {
            brand: card.brand,
            last4: card.last4,
            type: 'card',
          }
        }
      }
      return NextResponse.json({ hasPayoutMethod, payoutMethod })
    } catch (err) {
      console.error('Failed to check payout method:', err)
      return NextResponse.json({ error: 'Stripe error' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Missing customerId or stripeAccountId' }, { status: 400 })
} 