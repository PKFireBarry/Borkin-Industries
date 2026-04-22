import Stripe from 'stripe'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const projectId = getRequiredEnv('FIREBASE_ADMIN_PROJECT_ID')
  const clientEmail = getRequiredEnv('FIREBASE_ADMIN_CLIENT_EMAIL')
  const privateKey = getRequiredEnv('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n')

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

async function main() {
  const bookingId = process.argv[2]
  if (!bookingId) {
    throw new Error('Usage: npx tsx scripts/cleanup-duplicate-booking.ts <bookingId>')
  }

  initAdmin()

  const db = getFirestore()
  const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'), {
    apiVersion: '2025-03-31.basil',
  })

  const bookingRef = db.collection('bookings').doc(bookingId)
  const bookingSnap = await bookingRef.get()

  if (!bookingSnap.exists) {
    throw new Error(`Booking not found: ${bookingId}`)
  }

  const booking = bookingSnap.data() as {
    status?: string
    paymentIntentId?: string
  }

  if (booking.status !== 'pending') {
    throw new Error(`Refusing to delete booking ${bookingId}: status is ${booking.status ?? 'unknown'}, expected pending`)
  }

  if (booking.paymentIntentId) {
    try {
      await stripe.paymentIntents.cancel(booking.paymentIntentId)
    } catch (error) {
      const stripeError = error as { code?: string; raw?: { code?: string } }
      const code = stripeError.code || stripeError.raw?.code
      if (code !== 'payment_intent_unexpected_state') {
        throw error
      }
    }
  }

  await bookingRef.delete()

  console.log(`Deleted duplicate pending booking ${bookingId}${booking.paymentIntentId ? ` and attempted to cancel PaymentIntent ${booking.paymentIntentId}` : ''}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
