import { NextRequest, NextResponse } from 'next/server'
import { BookingPaymentCaptureError, captureBookingPayment } from '@/lib/stripe/capture-booking-payment'

export async function POST(req: NextRequest) {
  const { paymentIntentId, bookingId } = await req.json()

  try {
    const result = await captureBookingPayment(paymentIntentId, bookingId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to capture PaymentIntent:', error)

    if (error instanceof BookingPaymentCaptureError) {
      return NextResponse.json(
        {
          error: error.message,
          needsReauth: error.needsReauth,
          clientSecret: error.clientSecret,
        },
        { status: error.statusCode }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Stripe error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
