import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { generateCompletionToken } from '@/lib/auth/completion-tokens'
import { sendCompletionReminderEmail } from '@/lib/email/notifications'
import { getBookingById } from '@/lib/firebase/bookings'
import { getClientProfile } from '@/lib/firebase/client'
import { getContractorProfile } from '@/lib/firebase/contractors'
import { getAllPlatformServices } from '@/lib/firebase/services'
import { getBaseAppUrl } from '@/lib/utils'

interface SendCompletionReminderOptions {
  bookingId: string
  reminderNumber: number
}

export async function sendBookingCompletionReminder({ bookingId, reminderNumber }: SendCompletionReminderOptions) {
  const booking = await getBookingById(bookingId)

  if (!booking) {
    return { ok: false as const, reason: 'booking-not-found' }
  }

  if (booking.status !== 'approved' || booking.paymentStatus !== 'pending' || booking.contractorCompleted !== true) {
    return { ok: false as const, reason: 'booking-not-eligible' }
  }

  const [client, contractor, services] = await Promise.all([
    getClientProfile(booking.clientId),
    getContractorProfile(booking.contractorId),
    getAllPlatformServices(),
  ])

  if (!client?.email) {
    return { ok: false as const, reason: 'client-email-missing' }
  }

  if (!contractor) {
    return { ok: false as const, reason: 'contractor-not-found' }
  }

  const completionUrl = new URL('/api/bookings/complete-from-email', getBaseAppUrl())
  completionUrl.searchParams.set('bookingId', booking.id)
  completionUrl.searchParams.set('clientId', booking.clientId)
  completionUrl.searchParams.set('token', generateCompletionToken(booking.id, booking.clientId))

  await sendCompletionReminderEmail(booking, client, contractor, services, completionUrl.toString(), reminderNumber)

  const sentAt = new Date().toISOString()
  await updateDoc(doc(db, 'bookings', booking.id), {
    completionRemindersSent: Math.max(booking.completionRemindersSent || 0, reminderNumber),
    lastReminderSentAt: sentAt,
    updatedAt: sentAt,
  })

  return {
    ok: true as const,
    reminderNumber,
    completionUrl: completionUrl.toString(),
  }
}
