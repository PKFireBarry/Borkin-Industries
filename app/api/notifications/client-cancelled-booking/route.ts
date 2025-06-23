import { NextRequest, NextResponse } from 'next/server'
import { sendClientCancelledBookingNotification } from '@/lib/email/notifications'
import { getClientProfile } from '@/lib/firebase/client'
import { getContractorProfile } from '@/lib/firebase/contractors'
import { getAllPlatformServices } from '@/lib/firebase/services'
import type { Booking } from '@/types/booking'

export async function POST(request: NextRequest) {
  console.log('[DEBUG] Client cancelled booking notification API called')
  try {
    const { booking }: { booking: Booking } = await request.json()
    console.log('[DEBUG] Booking data received:', { id: booking?.id, clientId: booking?.clientId, contractorId: booking?.contractorId })

    if (!booking) {
      console.log('[DEBUG] No booking data provided')
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
    console.log('[DEBUG] About to send notification to contractor:', contractor.email)
    await sendClientCancelledBookingNotification(booking, client, contractor, services)
    console.log('[DEBUG] Notification sent successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending client cancelled booking notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
} 