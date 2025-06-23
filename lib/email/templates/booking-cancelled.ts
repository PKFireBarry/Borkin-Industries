import type { Booking } from '@/types/booking'
import type { Client } from '@/types/client'
import type { Contractor } from '@/types/contractor'
import type { PlatformService } from '@/types/service'
import { createEmailTemplate, formatBookingDateRange, formatServicesList } from '../utils'

// CLIENT: Booking cancelled by client
export function createClientCancelledBookingEmail(
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
      Your booking with ${contractor.name} has been successfully cancelled. ${contractor.name} has been notified.
    </p>
    
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">⚠️ Booking Cancelled</h3>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #92400e;">Cancelled Booking:</strong><br>
        Contractor: ${contractor.name}<br>
        Date & Time: ${dateRange}<br>
        Services: ${serviceDetails.map(s => s.name).join(', ')}<br>
        Estimated Amount: ${totalAmount}
      </div>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      <strong>Need to book again?</strong> We have many other qualified contractors available to help with your pet care needs.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        Find New Contractor
      </a>
    </div>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
      <p style="color: #0c4a6e; font-size: 14px; line-height: 1.6; margin: 0;">
        <strong>Had a great experience before this cancellation?</strong><br>
        <strong>Call us now at 352-340-3659</strong> and mention this cancellation. Our team will:
        <br>• Help you reschedule with the same contractor if possible
        <br>• Find you a similar contractor with availability
        <br>• Assist with any special requirements or preferences
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
      If you have any questions about this cancellation or need assistance with a new booking, please contact us at 
      <a href="mailto:${process.env.SMTP_FROM}" style="color: #667eea;">${process.env.SMTP_FROM}</a> 
      or call us at 352-340-3659.
    </p>
  `

  const textContent = `
Hi ${client.name},

Your booking with ${contractor.name} has been successfully cancelled. ${contractor.name} has been notified.

BOOKING CANCELLED:
Cancelled Booking:
Contractor: ${contractor.name}
Date & Time: ${dateRange}
Services: ${serviceDetails.map(s => s.name).join(', ')}
Estimated Amount: ${totalAmount}

NEED TO BOOK AGAIN? We have many other qualified contractors available to help with your pet care needs.

Find new contractor: ${process.env.NEXT_PUBLIC_APP_URL}

HAD A GREAT EXPERIENCE BEFORE THIS CANCELLATION?
Call us now at 352-340-3659 and mention this cancellation. Our team will:
• Help you reschedule with the same contractor if possible
• Find you a similar contractor with availability
• Assist with any special requirements or preferences

If you have any questions about this cancellation or need assistance with a new booking, please contact us at ${process.env.SMTP_FROM} or call us at 352-340-3659.

Best regards,
The Boorkin Industries Team
  `

  return {
    subject: `Booking Cancelled - ${contractor.name}`,
    html: createEmailTemplate(content, 'Booking Cancelled'),
    text: textContent
  }
}

// CONTRACTOR: Gig cancelled by client or admin
export function createGigCancelledContractorEmail(
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
  // Calculate contractor earnings (base service amount)
  const baseServiceAmount = booking.baseServiceAmount || booking.services?.reduce((total, service) => total + service.price, 0) || 0
  // baseServiceAmount is already in dollars if it exists, but service prices are in cents
  const potentialEarnings = booking.baseServiceAmount 
    ? `$${baseServiceAmount.toFixed(2)}` 
    : `$${(baseServiceAmount / 100).toFixed(2)}`

  const content = `
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hi ${contractor.name},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Unfortunately, the gig with ${client.name} has been cancelled. You won't need to provide the scheduled services.
    </p>
    
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <h3 style="color: #991b1b; margin: 0 0 15px 0; font-size: 18px;">❌ Gig Cancelled</h3>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #991b1b;">Cancelled Gig:</strong><br>
        Client: ${client.name}<br>
        Date & Time: ${dateRange}<br>
        Services: ${serviceDetails.map(s => s.name).join(', ')}<br>
        Your Potential Earnings: ${potentialEarnings}
      </div>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      <strong>Don't worry!</strong> This cancellation won't affect your ratings or standing on the platform. Cancellations happen and are part of the business.
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      <strong>What's next?</strong> This time slot is now available in your calendar for new bookings.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
         style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        View Available Gigs
      </a>
    </div>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p style="color: #065f46; font-size: 14px; line-height: 1.6; margin: 0;">
        <strong>Maximize your bookings:</strong><br>
        • Keep your availability calendar updated
        <br>• Respond quickly to new gig requests
        <br>• Consider expanding your service area or available times
        <br>• Maintain excellent ratings to attract more clients
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
      If you have any questions about this cancellation or need assistance, please contact us at 
      <a href="mailto:${process.env.SMTP_FROM}" style="color: #667eea;">${process.env.SMTP_FROM}</a> 
      or call us at 352-340-3659.
    </p>
  `

  const textContent = `
Hi ${contractor.name},

Unfortunately, the gig with ${client.name} has been cancelled. You won't need to provide the scheduled services.

GIG CANCELLED:
Cancelled Gig:
Client: ${client.name}
Date & Time: ${dateRange}
Services: ${serviceDetails.map(s => s.name).join(', ')}
Your Potential Earnings: ${potentialEarnings}

DON'T WORRY! This cancellation won't affect your ratings or standing on the platform. Cancellations happen and are part of the business.

WHAT'S NEXT? This time slot is now available in your calendar for new bookings.

View available gigs: ${process.env.NEXT_PUBLIC_APP_URL}

MAXIMIZE YOUR BOOKINGS:
• Keep your availability calendar updated
• Respond quickly to new gig requests
• Consider expanding your service area or available times
• Maintain excellent ratings to attract more clients

If you have any questions about this cancellation or need assistance, please contact us at ${process.env.SMTP_FROM} or call us at 352-340-3659.

Best regards,
The Boorkin Industries Team
  `

  return {
    subject: `Gig Cancelled - ${client.name} (${dateRange.split(' from ')[0] || dateRange.split(' to ')[0]})`,
    html: createEmailTemplate(content, 'Gig Cancelled'),
    text: textContent
  }
} 