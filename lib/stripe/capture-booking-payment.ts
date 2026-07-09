import Stripe from 'stripe'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { sendBookingCompletedReceipt } from '@/lib/email/notifications'
import { getClientProfile } from '@/lib/firebase/client'
import { getContractorProfile } from '@/lib/firebase/contractors'
import { getAllPlatformServices } from '@/lib/firebase/services'
import { calculateStripeFeeInDollars, getBaseAppUrl } from '@/lib/utils'
import type { Booking } from '@/types/booking'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export class BookingPaymentCaptureError extends Error {
  needsReauth?: boolean
  clientSecret?: string | null
  statusCode: number

  constructor(message: string, options?: { needsReauth?: boolean; clientSecret?: string | null; statusCode?: number }) {
    super(message)
    this.name = 'BookingPaymentCaptureError'
    this.needsReauth = options?.needsReauth
    this.clientSecret = options?.clientSecret
    this.statusCode = options?.statusCode || 400
  }
}

export async function captureBookingPayment(paymentIntentId: string, bookingId: string) {
  if (!paymentIntentId || !bookingId) {
    throw new BookingPaymentCaptureError('Missing required fields', { statusCode: 400 })
  }

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  let paymentIntent: Stripe.PaymentIntent

  if (pi.status === 'requires_payment_method') {
    if (!pi.payment_method) {
      try {
        const customer = await stripe.customers.retrieve(pi.customer as string)
        if (customer.deleted) {
          throw new Error('Customer not found')
        }

        const paymentMethods = await stripe.paymentMethods.list({
          customer: pi.customer as string,
          type: 'card',
          limit: 1,
        })

        if (paymentMethods.data.length === 0) {
          throw new BookingPaymentCaptureError('No payment method available. Please add a payment method and try again.', {
            needsReauth: true,
            clientSecret: pi.client_secret,
          })
        }

        paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
          payment_method: paymentMethods.data[0].id,
        })
      } catch (error) {
        if (error instanceof BookingPaymentCaptureError) {
          throw error
        }

        throw new BookingPaymentCaptureError('Payment method unavailable. Please update your payment method and try again.', {
          needsReauth: true,
          clientSecret: pi.client_secret,
        })
      }
    } else {
      paymentIntent = pi
    }

    try {
      paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        return_url: `${getBaseAppUrl()}/dashboard/bookings?payment_status=completed`,
        use_stripe_sdk: false,
      })

      if (paymentIntent.status === 'requires_capture') {
        paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)
      } else {
        throw new BookingPaymentCaptureError('Payment method requires client-side re-authorization. Please update your payment method and try again.', {
          needsReauth: true,
          clientSecret: paymentIntent.client_secret,
        })
      }
    } catch (error) {
      if (error instanceof BookingPaymentCaptureError) {
        throw error
      }

      throw new BookingPaymentCaptureError('Payment method requires client-side re-authorization. Please update your payment method and try again.', {
        needsReauth: true,
        clientSecret: pi.client_secret,
      })
    }
  } else if (pi.status === 'requires_confirmation') {
    paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      return_url: `${getBaseAppUrl()}/dashboard/bookings?payment_status=completed`,
      use_stripe_sdk: false,
    })

    if (paymentIntent.status !== 'requires_capture') {
      throw new BookingPaymentCaptureError(
        `PaymentIntent could not be confirmed for capture. Status after confirmation: ${paymentIntent.status}. Please check payment method or authorization.`
      )
    }

    paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)
  } else if (pi.status === 'requires_capture') {
    paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)
  } else {
    throw new BookingPaymentCaptureError(
      `PaymentIntent is not ready to be captured. Current status: ${pi.status}. Expected 'requires_capture', 'requires_confirmation', or 'requires_payment_method'.`
    )
  }

  let actualStripeFee: number | null = null
  let netPayout: number | null = null

  if (paymentIntent.latest_charge) {
    let charge: Stripe.Charge | null = null
    if (typeof paymentIntent.latest_charge === 'string') {
      charge = await stripe.charges.retrieve(paymentIntent.latest_charge)
    } else {
      charge = paymentIntent.latest_charge
    }

    if (charge?.balance_transaction) {
      let balanceTx: Stripe.BalanceTransaction | null = null
      if (typeof charge.balance_transaction === 'string') {
        balanceTx = await stripe.balanceTransactions.retrieve(charge.balance_transaction)
      } else {
        balanceTx = charge.balance_transaction
      }

      if (balanceTx) {
        actualStripeFee = balanceTx.fee / 100
      }
    }
  }

  const bookingRef = doc(db, 'bookings', bookingId)
  const bookingSnap = await getDoc(bookingRef)
  if (!bookingSnap.exists()) {
    throw new BookingPaymentCaptureError('Booking not found', { statusCode: 404 })
  }

  const booking = bookingSnap.data() as Booking
  const totalAmount = booking.paymentAmount || 0
  const platformFee = booking.platformFee || (totalAmount * 0.05)
  const stripeFee = actualStripeFee || calculateStripeFeeInDollars(totalAmount)

  if (booking.baseServiceAmount) {
    netPayout = booking.baseServiceAmount
  } else {
    netPayout = totalAmount - platformFee - stripeFee
  }

  const updatedAt = new Date().toISOString()
  await updateDoc(bookingRef, {
    paymentStatus: 'paid',
    status: 'completed',
    stripeFee,
    netPayout,
    updatedAt,
  })

  try {
    const updatedBooking: Booking = {
      ...booking,
      id: bookingId,
      status: 'completed',
      paymentStatus: 'paid',
      stripeFee,
      netPayout: netPayout ?? undefined,
      platformFee,
      updatedAt,
    }

    const [client, contractor, services] = await Promise.all([
      getClientProfile(updatedBooking.clientId),
      getContractorProfile(updatedBooking.contractorId),
      getAllPlatformServices(),
    ])

    if (client?.email && contractor) {
      await sendBookingCompletedReceipt(updatedBooking, client, contractor, services)
    }
  } catch (emailError) {
    console.error('Error sending booking completion notification:', emailError)
  }

  return {
    ok: true as const,
    paymentIntent,
    stripeFee,
    netPayout,
    platformFee,
    totalAmount,
  }
}
