import type { Booking } from '@/types/booking'
import type { Client } from '@/types/client'
import type { Contractor } from '@/types/contractor'
import type { PlatformService } from '@/types/service'
import { createEmailTemplate, formatBookingDateRange, formatServicesList } from '../utils'

// CLIENT: Payment failure (card decline / expired)
export function createPaymentFailureEmail(
  booking: Booking,
  client: Client,
  contractor: Contractor,
  services: PlatformService[],
  failureReason?: string
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
  
  // Common failure reasons and their user-friendly messages
  const getFailureMessage = (reason?: string) => {
    if (!reason) return 'Your payment could not be processed.'
    
    const lowerReason = reason.toLowerCase()
    if (lowerReason.includes('insufficient_funds')) {
      return 'Your card was declined due to insufficient funds.'
    } else if (lowerReason.includes('expired')) {
      return 'Your card has expired and needs to be updated.'
    } else if (lowerReason.includes('declined')) {
      return 'Your card was declined by your bank.'
    } else if (lowerReason.includes('invalid')) {
      return 'The card information appears to be invalid.'
    } else {
      return 'Your payment could not be processed.'
    }
  }

  const failureMessage = getFailureMessage(failureReason)

  const content = `
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hi ${client.name},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      We encountered an issue processing your payment for the booking with ${contractor.name}. ${failureMessage}
    </p>
    
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <h3 style="color: #991b1b; margin: 0 0 15px 0; font-size: 18px;">⚠️ Payment Failed</h3>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #991b1b;">Booking Details:</strong><br>
        Contractor: ${contractor.name}<br>
        Date & Time: ${dateRange}<br>
        Amount: ${totalAmount}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #991b1b;">Services:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${formatServicesList(serviceDetails)}
        </ul>
      </div>
      
      <div style="background: #fee2e2; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="color: #991b1b; margin: 0; font-weight: 500;">
          <strong>Issue:</strong> ${failureMessage}
        </p>
      </div>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      <strong>Don't worry - your booking is still pending!</strong>
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      We've temporarily held your booking with ${contractor.name}. You have <strong>24 hours</strong> to update your payment method before the booking is automatically cancelled.
    </p>
    
    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">How to fix this:</h4>
      <ul style="color: #92400e; margin: 10px 0; padding-left: 20px;">
        <li>Check that your card has sufficient funds</li>
        <li>Verify your card hasn't expired</li>
        <li>Try a different payment method</li>
        <li>Contact your bank if the issue persists</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
         style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        Login to Update Payment
      </a>
    </div>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">
        <strong>Need help?</strong><br>
        If you're having trouble updating your payment method, our support team is here to help. 
        Call us at <strong>352-340-3659</strong> or email us at 
        <a href="mailto:${process.env.SMTP_FROM}" style="color: #667eea;">${process.env.SMTP_FROM}</a>
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin-top: 20px;">
      <strong>Important:</strong> If payment is not updated within 24 hours, this booking will be automatically cancelled and ${contractor.name} will be notified.
    </p>
  `

  const textContent = `
Hi ${client.name},

We encountered an issue processing your payment for the booking with ${contractor.name}. ${failureMessage}

PAYMENT FAILED:
Booking Details:
Contractor: ${contractor.name}
Date & Time: ${dateRange}
Amount: ${totalAmount}

Services:
${serviceDetails.map(s => `- ${s.name} - $${(s.price / 100).toFixed(2)}${s.paymentType === 'daily' ? '/day' : ''}`).join('\n')}

Issue: ${failureMessage}

DON'T WORRY - YOUR BOOKING IS STILL PENDING!
We've temporarily held your booking with ${contractor.name}. You have 24 HOURS to update your payment method before the booking is automatically cancelled.

HOW TO FIX THIS:
- Check that your card has sufficient funds
- Verify your card hasn't expired
- Try a different payment method
- Contact your bank if the issue persists

Login to update payment: ${process.env.NEXT_PUBLIC_APP_URL}

NEED HELP?
If you're having trouble updating your payment method, our support team is here to help. 
Call us at 352-340-3659 or email us at ${process.env.SMTP_FROM}

IMPORTANT: If payment is not updated within 24 hours, this booking will be automatically cancelled and ${contractor.name} will be notified.

Best regards,
The Boorkin Industries Team
  `

  return {
    subject: `Payment Issue - Action Required for ${contractor.name} booking`,
    html: createEmailTemplate(content, 'Payment Issue'),
    text: textContent
  }
} 