import { doc, updateDoc } from 'firebase/firestore'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/firebase'
import { verifyCompletionToken } from '@/lib/auth/completion-tokens'
import { getBookingById } from '@/lib/firebase/bookings'
import { captureBookingPayment, BookingPaymentCaptureError } from '@/lib/stripe/capture-booking-payment'
import { getBaseAppUrl } from '@/lib/utils'

function buildCompletionUrl(status: string, bookingId: string) {
  const url = new URL('/booking-completion', getBaseAppUrl())
  url.searchParams.set('status', status)
  url.searchParams.set('bookingId', bookingId)
  return url
}

export async function GET(request: NextRequest) {
  const bookingId = request.nextUrl.searchParams.get('bookingId')
  const clientId = request.nextUrl.searchParams.get('clientId')
  const token = request.nextUrl.searchParams.get('token')

  if (!bookingId || !clientId || !token) {
    return NextResponse.redirect(buildCompletionUrl('invalid-link', bookingId || 'unknown'))
  }

  if (!verifyCompletionToken(bookingId, clientId, token)) {
    return NextResponse.redirect(buildCompletionUrl('invalid-link', bookingId))
  }

  const booking = await getBookingById(bookingId)
  if (!booking || booking.clientId !== clientId) {
    return NextResponse.redirect(buildCompletionUrl('booking-not-found', bookingId))
  }

  if (booking.paymentStatus === 'paid' || booking.status === 'completed') {
    return NextResponse.redirect(buildCompletionUrl('already-completed', bookingId))
  }

  if (booking.status !== 'approved' || booking.paymentStatus !== 'pending' || booking.contractorCompleted !== true) {
    return NextResponse.redirect(buildCompletionUrl('not-ready', bookingId))
  }

  try {
    await updateDoc(doc(db, 'bookings', bookingId), {
      clientCompleted: true,
      updatedAt: new Date().toISOString(),
    })

    await captureBookingPayment(booking.paymentIntentId, bookingId)

    return NextResponse.redirect(buildCompletionUrl('payment-released', bookingId))
  } catch (error) {
    const completionUrl = buildCompletionUrl(
      error instanceof BookingPaymentCaptureError && error.needsReauth ? 'payment-reauth-required' : 'payment-release-failed',
      bookingId
    )

    return NextResponse.redirect(completionUrl)
  }
}
