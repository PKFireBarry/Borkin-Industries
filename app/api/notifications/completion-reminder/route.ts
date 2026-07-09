import { NextRequest, NextResponse } from 'next/server'
import { sendBookingCompletionReminder } from '@/lib/notifications/completion-reminders'

export async function POST(request: NextRequest) {
  try {
    const { bookingId, reminderNumber = 1 } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    const result = await sendBookingCompletionReminder({ bookingId, reminderNumber })

    if (!result.ok) {
      const status = result.reason === 'booking-not-found' ? 404 : 400
      return NextResponse.json({ error: result.reason }, { status })
    }

    return NextResponse.json({ success: true, reminderNumber: result.reminderNumber })
  } catch (error) {
    console.error('Failed to send completion reminder:', error)
    return NextResponse.json({ error: 'Failed to send completion reminder' }, { status: 500 })
  }
}
