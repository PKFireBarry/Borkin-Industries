import type { Booking } from '@/types/booking'
import type { Client } from '@/types/client'
import type { Contractor } from '@/types/contractor'
import type { PlatformService } from '@/types/service'
import { createEmailTemplate, formatBookingDateRange, formatServicesList } from '../utils'

// CLIENT: Booking request created (pending contractor approval)
export function createBookingRequestClientEmail(
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
      Thank you for creating a booking request with Boorkin Industries! We've received your request and it has been sent to your selected contractor for approval.
    </p>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Booking Details</h3>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #374151;">Contractor:</strong> ${contractor.name}<br>
        <strong style="color: #374151;">Phone:</strong> ${contractor.phone || 'Not provided'}<br>
        <strong style="color: #374151;">Email:</strong> ${contractor.email}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #374151;">Date & Time:</strong><br>
        ${dateRange}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #374151;">Services Requested:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${formatServicesList(serviceDetails)}
        </ul>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #374151;">Total Amount:</strong> ${totalAmount}
        <br><small style="color: #6b7280;">*Includes 5% platform fee</small>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #374151;">Status:</strong> 
        <span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 14px;">
          Pending Contractor Approval
        </span>
      </div>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      <strong>What happens next?</strong>
    </p>
    
    <ul style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px; padding-left: 20px;">
      <li>Your contractor will review your request and respond within 24 hours</li>
      <li>If approved, your payment method will be charged and the booking will be confirmed</li>
      <li>You'll receive another email with confirmation details and next steps</li>
      <li>You can track your booking status by logging into your account</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        Login to Your Account
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
      If you need to make changes to your booking or have any questions, please contact us at 
      <a href="mailto:${process.env.SMTP_FROM}" style="color: #667eea;">${process.env.SMTP_FROM}</a> 
      or call us at 352-340-3659.
    </p>
  `

  const textContent = `
Hi ${client.name},

Thank you for creating a booking request with Boorkin Industries! We've received your request and it has been sent to your selected contractor for approval.

BOOKING DETAILS:
Contractor: ${contractor.name}
Phone: ${contractor.phone || 'Not provided'}
Email: ${contractor.email}

Date & Time: ${dateRange}

Services Requested:
${serviceDetails.map(s => `- ${s.name} - $${(s.price / 100).toFixed(2)}${s.paymentType === 'daily' ? '/day' : ''}`).join('\n')}

Total Amount: ${totalAmount}
*Includes 5% platform fee

Status: Pending Contractor Approval

WHAT HAPPENS NEXT:
- Your contractor will review your request and respond within 24 hours
- If approved, your payment method will be charged and the booking will be confirmed
- You'll receive another email with confirmation details and next steps
- You can track your booking status by logging into your account

Login to your account: ${process.env.NEXT_PUBLIC_APP_URL}

If you need to make changes to your booking or have any questions, please contact us at ${process.env.SMTP_FROM} or call us at 352-340-3659.

Best regards,
The Boorkin Industries Team
  `

  return {
    subject: `Booking Request Submitted - Pending Approval`,
    html: createEmailTemplate(content, 'Booking Request Submitted'),
    text: textContent
  }
}

// CONTRACTOR: New gig request that matches availability
export function createNewGigRequestContractorEmail(
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
      Hi ${contractor.name},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      You have a new gig request that matches your availability! A client has requested your services and is waiting for your response.
    </p>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Gig Request Details</h3>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #374151;">Client:</strong> ${client.name}<br>
        <strong style="color: #374151;">Phone:</strong> ${client.phone || 'Not provided'}<br>
        <strong style="color: #374151;">Email:</strong> ${client.email}<br>
        <strong style="color: #374151;">Location:</strong> ${[client.address, client.city, client.state].filter(Boolean).join(', ') || 'Not provided'}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #374151;">Date & Time:</strong><br>
        ${dateRange}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #374151;">Services Requested:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${formatServicesList(serviceDetails)}
        </ul>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #374151;">Total Payment:</strong> ${totalAmount}
        <br><small style="color: #6b7280;">*After platform fees, you'll receive approximately $${((booking.paymentAmount * 0.9) - (booking.paymentAmount * 0.029)).toFixed(2)}</small>
      </div>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      <strong>Please respond within 24 hours</strong> to accept or decline this gig request. The client is waiting for your confirmation.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
         style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        Login to Respond
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
      If you have any questions about this gig request, please contact us at 
      <a href="mailto:${process.env.SMTP_FROM}" style="color: #667eea;">${process.env.SMTP_FROM}</a> 
      or call us at 352-340-3659.
    </p>
  `

  const textContent = `
Hi ${contractor.name},

You have a new gig request that matches your availability! A client has requested your services and is waiting for your response.

GIG REQUEST DETAILS:
Client: ${client.name}
Phone: ${client.phone || 'Not provided'}
Email: ${client.email}
Location: ${[client.address, client.city, client.state].filter(Boolean).join(', ') || 'Not provided'}

Date & Time: ${dateRange}

Services Requested:
${serviceDetails.map(s => `- ${s.name} - $${(s.price / 100).toFixed(2)}${s.paymentType === 'daily' ? '/day' : ''}`).join('\n')}

Total Payment: ${totalAmount}
*After platform fees, you'll receive approximately $${((booking.paymentAmount * 0.9) - (booking.paymentAmount * 0.029)).toFixed(2)}

Please respond within 24 hours to accept or decline this gig request. The client is waiting for your confirmation.

Login to respond: ${process.env.NEXT_PUBLIC_APP_URL}

If you have any questions about this gig request, please contact us at ${process.env.SMTP_FROM} or call us at 352-340-3659.

Best regards,
The Boorkin Industries Team
  `

  return {
    subject: `New Gig Request - ${client.name} needs your services!`,
    html: createEmailTemplate(content, 'New Gig Request'),
    text: textContent
  }
} 