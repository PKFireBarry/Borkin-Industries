import { NextRequest, NextResponse } from 'next/server'
import { sendServicesUpdatedNotification } from '@/lib/email/notifications'
import { getBookingById } from '@/lib/firebase/bookings'
import { getClientProfile } from '@/lib/firebase/client'
import { getContractorProfile } from '@/lib/firebase/contractors'
import { getAllPlatformServices } from '@/lib/firebase/services'

export async function POST(req: NextRequest) {
  try {
    const { bookingId, previousServices, previousBookingData } = await req.json()
    
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

    if (!contractor.email) {
      return NextResponse.json({ error: 'Contractor email not found' }, { status: 400 })
    }

    // Debug logging for dates
    console.log('=== BOOKING UPDATE NOTIFICATION DEBUG ===')
    console.log('Current booking dates from DB:', {
      startDate: booking.startDate,
      endDate: booking.endDate,
      endTime: booking.time?.endTime
    })
    console.log('Previous booking data from UI:', previousBookingData)
    console.log('==========================================')

    // Send the email notification
    await sendServicesUpdatedNotification(booking, client, contractor, services, previousServices, previousBookingData)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to send services updated notification:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
} 