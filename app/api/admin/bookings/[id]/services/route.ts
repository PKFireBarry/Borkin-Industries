import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { db } from '@/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import Stripe from 'stripe'
import { calculateClientFeeBreakdown, calculatePlatformFee, calculateStripeFee } from '@/lib/utils'
import { sendAdminPriceUpdatedNotifications } from '@/lib/email/notifications'
import type { Booking } from '@/types/booking'
import type { Client } from '@/types/client'
import type { Contractor } from '@/types/contractor'
import type { PlatformService } from '@/types/service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-03-31.basil' })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await currentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { services } = await request.json() as {
      services: Array<{
        serviceId: string
        paymentType: 'one_time' | 'daily'
        price: number
        name?: string
      }>
    }

    if (!services || !Array.isArray(services) || services.length === 0) {
      return NextResponse.json({ error: 'Services array is required' }, { status: 400 })
    }

    // Fetch the booking
    const bookingRef = doc(db, 'bookings', id)
    const bookingSnap = await getDoc(bookingRef)

    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const booking = { id: bookingSnap.id, ...bookingSnap.data() } as Booking

    if (booking.status !== 'pending' && booking.status !== 'approved') {
      return NextResponse.json({ error: 'Can only edit pending or approved bookings' }, { status: 400 })
    }

    // Save previous services for email diff
    const previousServices = booking.services || []

    // Recalculate fees: service prices are in cents, convert to dollars for fee calc
    const baseServiceAmountCents = services.reduce((sum, s) => sum + s.price, 0)
    const baseServiceAmountDollars = baseServiceAmountCents / 100
    const fees = calculateClientFeeBreakdown(baseServiceAmountDollars)

    // Update Firestore
    await updateDoc(bookingRef, {
      services,
      paymentAmount: fees.totalAmount,
      baseServiceAmount: fees.baseAmount,
      platformFee: fees.platformFee,
      stripeFee: fees.stripeFee,
      updatedAt: new Date().toISOString()
    })

    // Update Stripe PaymentIntent
    if (booking.paymentIntentId) {
      const newAmountCents = Math.round(fees.totalAmount * 100)
      const paymentIntent = await stripe.paymentIntents.retrieve(booking.paymentIntentId)

      const updatableStatuses = ['requires_payment_method', 'requires_confirmation', 'requires_action']
      const platformFeeCents = calculatePlatformFee(baseServiceAmountCents)
      const stripeFeeCents = calculateStripeFee(baseServiceAmountCents)

      if (updatableStatuses.includes(paymentIntent.status)) {
        await stripe.paymentIntents.update(booking.paymentIntentId, {
          amount: newAmountCents,
          metadata: {
            ...paymentIntent.metadata,
            platformFee: platformFeeCents.toString(),
            estimatedStripeFee: stripeFeeCents.toString(),
            transferAmount: baseServiceAmountCents.toString()
          }
        })
      } else if (paymentIntent.status !== 'canceled' && paymentIntent.status !== 'succeeded') {
        // Cancel old and create new
        await stripe.paymentIntents.cancel(booking.paymentIntentId)

        const contractorRef = doc(db, 'contractors', booking.contractorId)
        const contractorSnap = await getDoc(contractorRef)
        const contractorData = contractorSnap.exists() ? contractorSnap.data() as Contractor : null

        if (contractorData?.stripeAccountId) {
          const newIntent = await stripe.paymentIntents.create({
            amount: newAmountCents,
            currency: 'usd',
            customer: booking.stripeCustomerId || undefined,
            capture_method: 'manual',
            transfer_data: {
              destination: contractorData.stripeAccountId,
              amount: baseServiceAmountCents
            },
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: 'never'
            },
            metadata: {
              app: 'boorkin',
              contractorId: booking.contractorId,
              platformFee: platformFeeCents.toString(),
              estimatedStripeFee: stripeFeeCents.toString(),
              transferAmount: baseServiceAmountCents.toString()
            }
          })

          // Update booking with new PI
          await updateDoc(bookingRef, {
            paymentIntentId: newIntent.id,
            paymentClientSecret: newIntent.client_secret
          })
        }
      }
    }

    // Fetch client, contractor, and platform services for email
    const [clientSnap, contractorSnap, servicesSnap] = await Promise.all([
      getDoc(doc(db, 'clients', booking.clientId)),
      getDoc(doc(db, 'contractors', booking.contractorId)),
      // Fetch all platform services
      (async () => {
        const { getAllPlatformServices } = await import('@/lib/firebase/services')
        return getAllPlatformServices()
      })()
    ])

    const clientData = clientSnap.exists() ? { id: clientSnap.id, ...clientSnap.data() } as Client : null
    const contractorData = contractorSnap.exists() ? { id: contractorSnap.id, ...contractorSnap.data() } as Contractor : null

    // Build updated booking for email
    const updatedBooking: Booking = {
      ...booking,
      services,
      paymentAmount: fees.totalAmount,
      baseServiceAmount: fees.baseAmount,
      platformFee: fees.platformFee,
      stripeFee: fees.stripeFee
    }

    if (clientData && contractorData) {
      await sendAdminPriceUpdatedNotifications(
        updatedBooking,
        clientData,
        contractorData,
        servicesSnap as PlatformService[],
        previousServices
      )
    }

    return NextResponse.json({
      success: true,
      booking: {
        id,
        services,
        paymentAmount: fees.totalAmount,
        baseServiceAmount: fees.baseAmount,
        platformFee: fees.platformFee,
        stripeFee: fees.stripeFee
      }
    })
  } catch (error) {
    console.error('Error updating booking services:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
