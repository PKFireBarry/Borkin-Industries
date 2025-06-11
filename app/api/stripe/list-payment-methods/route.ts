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
      const externalAccounts = account.external_accounts?.data || []
      const hasPayoutMethod = externalAccounts.length > 0
      let payoutMethod = null
      if (hasPayoutMethod) {
        const bankAccount = externalAccounts.find(acc => acc.object === 'bank_account') as Stripe.BankAccount | undefined;
        const cardAccount = externalAccounts.find(acc => acc.object === 'card') as Stripe.Card | undefined;

        if (bankAccount) {
          payoutMethod = {
            brand: bankAccount.bank_name,
            last4: bankAccount.last4,
            type: 'bank_account',
          }
        } else if (cardAccount) {
          payoutMethod = {
            brand: cardAccount.brand,
            last4: cardAccount.last4,
            type: 'card',
          }
        }
      }
      return NextResponse.json({ hasPayoutMethod, payoutMethod })
    } catch (err: any) {
      console.error('Failed to check payout method:', err)
      
      // Handle test/live mode mismatch
      if (err.message?.includes('test') || err.message?.includes('live mode')) {
        console.log(`Mode mismatch detected for account ${stripeAccountId}`)
        return NextResponse.json({ 
          hasPayoutMethod: false, 
          payoutMethod: null,
          modeMismatch: true,
          error: 'Account was created in a different mode. Please reconnect your Stripe account.'
        })
      }
      
      return NextResponse.json({ error: 'Stripe error' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Missing customerId or stripeAccountId' }, { status: 400 })
} 