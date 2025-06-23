import type { Booking } from '@/types/booking'
import type { Client } from '@/types/client'
import type { Contractor } from '@/types/contractor'
import type { PlatformService } from '@/types/service'
import { createEmailTemplate, formatBookingDateRange, formatServicesList } from '../utils'

// CLIENT: Booking approved by contractor
export function createBookingApprovedClientEmail(
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
      Great news! Your booking request has been <strong>approved</strong> by ${contractor.name}. Your payment method has been authorized and your booking is now confirmed.
    </p>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">✅ Booking Confirmed</h3>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #065f46;">Contractor:</strong> ${contractor.name}<br>
        <strong style="color: #065f46;">Phone:</strong> ${contractor.phone || 'Not provided'}<br>
        <strong style="color: #065f46;">Email:</strong> ${contractor.email}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #065f46;">Date & Time:</strong><br>
        ${dateRange}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #065f46;">Services:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${formatServicesList(serviceDetails)}
        </ul>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #065f46;">Total Amount:</strong> ${totalAmount}
        <br><small style="color: #6b7280;">*Payment authorized - will be charged upon service completion</small>
      </div>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      <strong>What happens next?</strong>
    </p>
    
    <ul style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px; padding-left: 20px;">
      <li>Your contractor will arrive at the scheduled time</li>
      <li>You can message your contractor directly through the platform</li>
      <li>After service completion, you'll be asked to leave a review</li>
      <li>Payment will be charged and released to the contractor once service is marked complete</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
         style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        Login to Your Account
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
      If you need to make any changes or have questions, please contact us at 
      <a href="mailto:${process.env.SMTP_FROM}" style="color: #667eea;">${process.env.SMTP_FROM}</a> 
      or call us at 352-340-3659.
    </p>
  `

  const textContent = `
Hi ${client.name},

Great news! Your booking request has been APPROVED by ${contractor.name}. Your payment method has been authorized and your booking is now confirmed.

BOOKING CONFIRMED:
Contractor: ${contractor.name}
Phone: ${contractor.phone || 'Not provided'}
Email: ${contractor.email}

Date & Time: ${dateRange}

Services:
${serviceDetails.map(s => `- ${s.name} - $${(s.price / 100).toFixed(2)}${s.paymentType === 'daily' ? '/day' : ''}`).join('\n')}

Total Amount: ${totalAmount}
*Payment authorized - will be charged upon service completion

WHAT HAPPENS NEXT:
- Your contractor will arrive at the scheduled time
- You can message your contractor directly through the platform
- After service completion, you'll be asked to leave a review
- Payment will be charged and released to the contractor once service is marked complete

Login to your account: ${process.env.NEXT_PUBLIC_APP_URL}

If you need to make any changes or have questions, please contact us at ${process.env.SMTP_FROM} or call us at 352-340-3659.

Best regards,
The Boorkin Industries Team
  `

  return {
    subject: `Booking Confirmed! ${contractor.name} has approved your request`,
    html: createEmailTemplate(content, 'Booking Confirmed!'),
    text: textContent
  }
} 