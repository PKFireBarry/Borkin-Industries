import { doc, updateDoc } from 'firebase/firestore'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/firebase'
import { getAllBookings } from '@/lib/firebase/bookings'
import { sendBookingCompletionReminder } from '@/lib/notifications/completion-reminders'
import { captureBookingPayment } from '@/lib/stripe/capture-booking-payment'
import { getBaseAppUrl } from '@/lib/utils'

const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000
const AUTO_RELEASE_INTERVAL_MS = 48 * 60 * 60 * 1000

function isAuthorizedCronRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expected = process.env.CRON_SECRET

  if (!expected) {
    return process.env.NODE_ENV !== 'production'
  }

  return authHeader === `Bearer ${expected}`
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const summary = {
    scanned: 0,
    remindersSent: 0,
    autoReleased: 0,
    skipped: 0,
    failures: [] as Array<{ bookingId: string; reason: string }>,
  }

  try {
    const bookings = await getAllBookings()
    const eligibleBookings = bookings.filter((booking) => (
      booking.status === 'approved' &&
      booking.paymentStatus === 'pending' &&
      booking.contractorCompleted === true &&
      booking.clientCompleted !== true
    ))

    summary.scanned = eligibleBookings.length

    for (const booking of eligibleBookings) {
      const referenceTimestamp = booking.contractorCompletedAt || booking.updatedAt
      const completedAt = new Date(referenceTimestamp).getTime()

      if (Number.isNaN(completedAt)) {
        summary.failures.push({ bookingId: booking.id, reason: 'invalid-completion-timestamp' })
        continue
      }

      const elapsedMs = now - completedAt

      try {
        if (elapsedMs >= AUTO_RELEASE_INTERVAL_MS) {
          await captureBookingPayment(booking.paymentIntentId, booking.id)
          await updateDoc(doc(db, 'bookings', booking.id), {
            autoReleased: true,
            updatedAt: new Date().toISOString(),
          })
          summary.autoReleased += 1
          continue
        }

        const remindersSent = booking.completionRemindersSent || 0
        if (elapsedMs >= REMINDER_INTERVAL_MS && remindersSent < 2) {
          const reminderResult = await sendBookingCompletionReminder({
            bookingId: booking.id,
            reminderNumber: remindersSent + 1,
          })

          if (reminderResult.ok) {
            summary.remindersSent += 1
          } else {
            summary.failures.push({ bookingId: booking.id, reason: reminderResult.reason })
          }
          continue
        }

        summary.skipped += 1
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown-error'
        summary.failures.push({ bookingId: booking.id, reason })

        try {
          await fetch(`${getBaseAppUrl()}/api/notifications/payment-failure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking, failureReason: reason }),
          })
        } catch (notificationError) {
          console.error('Failed to send payment failure notification during auto-release:', notificationError)
        }
      }
    }

    return NextResponse.json({ success: true, summary })
  } catch (error) {
    console.error('Auto-release cron failed:', error)
    return NextResponse.json({ error: 'Auto-release cron failed', summary }, { status: 500 })
  }
}
