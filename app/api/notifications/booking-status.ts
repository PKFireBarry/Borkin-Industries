import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { bookingId, status, userEmail } = await req.json()
  // Placeholder: log the notification event
  console.log(`[NOTIFY] Booking ${bookingId} status changed to ${status} for ${userEmail}`)
  // In the future, send an email or push notification here
  return NextResponse.json({ ok: true })
} 