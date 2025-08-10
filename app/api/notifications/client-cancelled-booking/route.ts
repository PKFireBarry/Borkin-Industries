import { NextRequest, NextResponse } from 'next/server'
import { sendClientCancelledBookingNotification } from '@/lib/email/notifications'
import { getClientProfile } from '@/lib/firebase/client'
import { getContractorProfile } from '@/lib/firebase/contractors'
import { getAllPlatformServices } from '@/lib/firebase/services'
import type { Booking } from '@/types/booking'

export async function POST(request: NextRequest) {
  try {
    const { booking }: { booking: Booking } = await request.json()

    if (!booking) {
      return NextResponse.json({ error: 'Booking data is required' }, { status: 400 })
    }

    // Fetch required data
    const [client, contractor, services] = await Promise.all([
      getClientProfile(booking.clientId),
      getContractorProfile(booking.contractorId),
      getAllPlatformServices()
    ])

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    if (!contractor.email) {
      return NextResponse.json({ error: 'Contractor email not found' }, { status: 400 })
    }

    // Send notification to contractor
    await sendClientCancelledBookingNotification(booking, client, contractor, services)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending client cancelled booking notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
} 