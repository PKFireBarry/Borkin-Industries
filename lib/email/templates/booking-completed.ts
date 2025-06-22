import type { Booking } from '@/types/booking'
import type { Client } from '@/types/client'
import type { Contractor } from '@/types/contractor'
import type { PlatformService } from '@/types/service'
import { createEmailTemplate, formatBookingDateRange, formatServicesList } from '../utils'

// CLIENT: Booking completed & payment captured (receipt)
export function createBookingCompletedClientEmail(
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
  
  // Calculate breakdown
  const subtotal = booking.paymentAmount * 0.95 // Remove 5% platform fee
  const platformFee = booking.paymentAmount * 0.05
  const processingFee = booking.paymentAmount * 0.029 // Stripe fee

  const content = `
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hi ${client.name},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Your pet care service with ${contractor.name} has been completed! Thank you for choosing Boorkin Industries.
    </p>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">✅ Service Completed</h3>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #065f46;">Contractor:</strong> ${contractor.name}<br>
        <strong style="color: #065f46;">Service Date:</strong> ${dateRange}<br>
        <strong style="color: #065f46;">Status:</strong> Completed
      </div>
    </div>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">📋 Service Summary</h3>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #374151;">Services Provided:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${formatServicesList(serviceDetails)}
        </ul>
      </div>
    </div>
    
    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #cbd5e1;">
      <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">💳 Payment Receipt</h3>
      
      <div style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="color: #64748b;">Services Subtotal:</span>
          <span style="color: #374151; font-weight: 500;">$${subtotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="color: #64748b;">Platform Fee (5%):</span>
          <span style="color: #374151; font-weight: 500;">$${platformFee.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: #64748b;">Processing Fee:</span>
          <span style="color: #374151; font-weight: 500;">$${processingFee.toFixed(2)}</span>
        </div>
        <div style="border-top: 2px solid #e2e8f0; padding-top: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #374151; font-weight: bold; font-size: 16px;">Total Charged:</span>
            <span style="color: #374151; font-weight: bold; font-size: 16px;">${totalAmount}</span>
          </div>
        </div>
      </div>
      
      <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
        Payment processed successfully. This serves as your receipt.
      </p>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      We hope you and your pets had a wonderful experience! Please consider leaving a review to help other pet parents.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
         style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin-right: 10px;">
        Leave a Review
      </a>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
         style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        Book Again
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
      If you have any questions about this service or need assistance, please contact us at 
      <a href="mailto:${process.env.SMTP_FROM}" style="color: #667eea;">${process.env.SMTP_FROM}</a> 
      or call us at 352-340-3659.
    </p>
  `

  const textContent = `
Hi ${client.name},

Your pet care service with ${contractor.name} has been completed! Thank you for choosing Boorkin Industries.

SERVICE COMPLETED:
Contractor: ${contractor.name}
Service Date: ${dateRange}
Status: Completed

SERVICE SUMMARY:
Services Provided:
${serviceDetails.map(s => `- ${s.name} - $${(s.price / 100).toFixed(2)}${s.paymentType === 'daily' ? '/day' : ''}`).join('\n')}

PAYMENT RECEIPT:
Services Subtotal: $${subtotal.toFixed(2)}
Platform Fee (5%): $${platformFee.toFixed(2)}
Processing Fee: $${processingFee.toFixed(2)}
Total Charged: ${totalAmount}

Payment processed successfully. This serves as your receipt.

We hope you and your pets had a wonderful experience! Please consider leaving a review to help other pet parents.

Leave a review: ${process.env.NEXT_PUBLIC_APP_URL}
Book again: ${process.env.NEXT_PUBLIC_APP_URL}

If you have any questions about this service or need assistance, please contact us at ${process.env.SMTP_FROM} or call us at 352-340-3659.

Best regards,
The Boorkin Industries Team
  `

  return {
    subject: `Service Complete - Thank you for choosing Boorkin Industries!`,
    html: createEmailTemplate(content, 'Service Complete'),
    text: textContent
  }
} 