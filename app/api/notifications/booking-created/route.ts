import { NextRequest, NextResponse } from 'next/server'
import { sendBookingCreatedNotifications } from '@/lib/email/notifications'
import { getBookingById } from '@/lib/firebase/bookings'
import { getClientProfile } from '@/lib/firebase/client'
import { getContractorProfile } from '@/lib/firebase/contractors'
import { getAllPlatformServices } from '@/lib/firebase/services'

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json()
    
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Fetch the booking data
    const booking = await getBookingById(bookingId)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Fetch required data for email templates
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

    if (!client.email) {
      return NextResponse.json({ error: 'Client email not found' }, { status: 400 })
    }

    // Send the email notifications
    await sendBookingCreatedNotifications(booking, client, contractor, services)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to send booking creation notification:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
} 