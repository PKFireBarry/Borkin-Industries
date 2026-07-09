import type { Booking } from '@/types/booking'
import type { Client } from '@/types/client'
import type { Contractor } from '@/types/contractor'
import type { PlatformService } from '@/types/service'
import { createEmailTemplate, formatBookingDateRange, formatServicesList } from '../utils'

// CLIENT: Booking declined by contractor
export function createBookingDeclinedClientEmail(
  booking: Booking,
  client: Client,
  contractor: Contractor,
  services: PlatformService[]
): { subject: string; html: string; text: string } {
  const serviceDetails = booking.services?.map(bookingService => {
    const platformService = services.find(s => s.id === bookingService.serviceId)
    return {
      name: platformService?.name || bookingService.name || bookingService.serviceId,
      price: bookingService.price,
      paymentType: bookingService.paymentType
    }
  }) || []

  const totalAmount = `$${booking.paymentAmount.toFixed(2)}`
  const dateRange = formatBookingDateRange(booking.startDate, booking.endDate)

  const content = `
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hi ${client.name},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      We're sorry to inform you that ${contractor.name} is unable to accept your booking request for the dates you requested.
    </p>
    
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <h3 style="color: #991b1b; margin: 0 0 15px 0; font-size: 18px;">❌ Booking Declined</h3>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #991b1b;">Original Request:</strong><br>
        Contractor: ${contractor.name}<br>
        Date & Time: ${dateRange}<br>
        Services: ${serviceDetails.map(s => s.name).join(', ')}<br>
        Amount: ${totalAmount}
      </div>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      <strong>Don't worry!</strong> We have other qualified contractors who may be available for your dates.
    </p>
    
    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Your next steps:</h4>
      <ul style="color: #92400e; margin: 10px 0; padding-left: 20px;">
        <li>Browse other available contractors for your dates</li>
        <li>Consider adjusting your dates for more availability</li>
        <li>Contact us for personalized recommendations</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        Find Another Contractor
      </a>
    </div>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">
        <strong>Need help finding the right contractor?</strong><br>
        Call us at <strong>352-340-3659</strong> or email us at 
        <a href="mailto:${process.env.SMTP_FROM}" style="color: #667eea;">${process.env.SMTP_FROM}</a>
        <br>Our team can help match you with available contractors who meet your specific needs.
      </p>
    </div>
  `

  const textContent = `
Hi ${client.name},

We're sorry to inform you that ${contractor.name} is unable to accept your booking request for the dates you requested.

BOOKING DECLINED:
Original Request:
Contractor: ${contractor.name}
Date & Time: ${dateRange}
Services: ${serviceDetails.map(s => s.name).join(', ')}
Amount: ${totalAmount}

DON'T WORRY! We have other qualified contractors who may be available for your dates.

YOUR NEXT STEPS:
- Browse other available contractors for your dates
- Consider adjusting your dates for more availability
- Contact us for personalized recommendations

Find another contractor: ${process.env.NEXT_PUBLIC_APP_URL}

NEED HELP?
Call us at 352-340-3659 or email us at ${process.env.SMTP_FROM}
Our team can help match you with available contractors who meet your specific needs.

Best regards,
The Boorkin Industries Team
  `

  return {
    subject: `Booking Update - ${contractor.name} is unavailable`,
    html: createEmailTemplate(content, 'Booking Update'),
    text: textContent
  }
} 