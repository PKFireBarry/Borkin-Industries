import type { Booking } from '@/types/booking'
import type { Client } from '@/types/client'
import type { Contractor } from '@/types/contractor'
import type { PlatformService } from '@/types/service'
import { createEmailTemplate, formatBookingDateRange, formatServicesList } from '../utils'

// CONTRACTOR: Booking updated by client (services and/or dates)
export function createServicesUpdatedContractorEmail(
  booking: Booking,
  client: Client,
  contractor: Contractor,
  services: PlatformService[],
  previousServices?: {
    serviceId: string
    paymentType: 'one_time' | 'daily'
    price: number
    name?: string
  }[],
  previousBookingData?: {
    startDate: string
    endDate: string
    endTime?: string
  },
  statusReverted?: boolean,
  previousStatus?: string
): { subject: string; html: string; text: string } {
  const currentServiceDetails = booking.services?.map(bookingService => {
    const platformService = services.find(s => s.id === bookingService.serviceId)
    return {
      name: platformService?.name || bookingService.name || bookingService.serviceId,
      price: bookingService.price,
      paymentType: bookingService.paymentType
    }
  }) || []

  const previousServiceDetails = previousServices?.map(bookingService => {
    const platformService = services.find(s => s.id === bookingService.serviceId)
    return {
      name: platformService?.name || bookingService.name || bookingService.serviceId,
      price: bookingService.price,
      paymentType: bookingService.paymentType
    }
  }) || []

  const currentTotalAmount = `$${booking.paymentAmount.toFixed(2)}`
  const currentDateRange = formatBookingDateRange(booking.startDate, booking.endDate)
  const previousDateRange = previousBookingData 
    ? formatBookingDateRange(previousBookingData.startDate, previousBookingData.endDate)
    : null
  
  // Calculate contractor earnings (base service amount)
  const baseServiceAmount = booking.baseServiceAmount || booking.services?.reduce((total, service) => total + service.price, 0) || 0
  const contractorEarnings = booking.baseServiceAmount 
    ? `$${baseServiceAmount.toFixed(2)}` 
    : `$${(baseServiceAmount / 100).toFixed(2)}`

  // Determine what changed
  const servicesChanged = previousServices && JSON.stringify(previousServices) !== JSON.stringify(booking.services)
  const datesChanged = previousBookingData && (
    previousBookingData.startDate !== booking.startDate ||
    previousBookingData.endDate !== booking.endDate ||
    previousBookingData.endTime !== booking.time?.endTime
  )

  const content = `
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hi ${contractor.name},
    </p>

    ${statusReverted ? `
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <h3 style="color: #991b1b; margin: 0 0 15px 0; font-size: 18px;">⚠️ Re-Approval Required</h3>
      <p style="color: #991b1b; font-size: 14px; line-height: 1.6; margin: 0;">
        <strong>${client.name}</strong> has changed the booking dates. This booking has been moved back to <strong>Pending</strong> status and requires your re-approval. Please review the new dates below and approve or decline the updated booking.
      </p>
    </div>
    ` : ''}

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      ${client.name} has updated their upcoming booking with you. Please review the changes below and ${statusReverted ? 'approve or decline' : 'confirm if you can still accommodate'} the updated booking.
    </p>

    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">🔄 Booking Updated</h3>
      
      <div style="margin-bottom: 20px;">
        <strong style="color: #92400e;">Current Booking Information:</strong><br>
        Client: ${client.name}<br>
        Date & Time: ${currentDateRange}<br>
        Location: ${[client.address, client.city, client.state].filter(Boolean).join(', ') || 'Not provided'}
      </div>
    </div>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
      <h4 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 16px;">📋 ${datesChanged && servicesChanged ? 'Changes Made:' : datesChanged ? 'Schedule Updated:' : 'Services Updated:'}</h4>
      
      ${datesChanged && previousDateRange ? `
      <div style="margin-bottom: 15px;">
        <strong style="color: #0c4a6e;">📅 Schedule Changes:</strong><br>
        <span style="color: #991b1b;">Previous: ${previousDateRange}</span><br>
        <span style="color: #065f46;">Updated: ${currentDateRange}</span>
      </div>
      ` : ''}
      
      ${servicesChanged && previousServiceDetails.length > 0 ? `
      <div style="margin-bottom: 15px;">
        <strong style="color: #0c4a6e;">🛠️ Service Changes:</strong><br>
        <div style="margin: 8px 0;">
          <span style="color: #991b1b; font-weight: 500;">Previous Services:</span>
          <ul style="margin: 5px 0; padding-left: 20px; color: #991b1b;">
            ${formatServicesList(previousServiceDetails)}
          </ul>
        </div>
        <div style="margin: 8px 0;">
          <span style="color: #065f46; font-weight: 500;">Updated Services:</span>
          <ul style="margin: 5px 0; padding-left: 20px; color: #065f46;">
            ${formatServicesList(currentServiceDetails)}
          </ul>
        </div>
      </div>
      ` : ''}
      
      ${!datesChanged && !servicesChanged ? `
      <div style="margin-bottom: 15px;">
        <strong style="color: #0c4a6e;">🛠️ Current Services:</strong><br>
        <ul style="margin: 5px 0; padding-left: 20px; color: #0c4a6e;">
          ${formatServicesList(currentServiceDetails)}
        </ul>
      </div>
      ` : ''}
      
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #0ea5e9;">
        <strong style="color: #0c4a6e;">${datesChanged || servicesChanged ? 'Your Updated Earnings:' : 'Your Earnings:'}</strong> ${contractorEarnings}<br>
        <strong style="color: #0c4a6e;">Total Client Payment:</strong> ${currentTotalAmount}
      </div>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      <strong>Action Required:</strong> Please review the updated booking details and confirm if you can accommodate the changes. If you cannot provide the updated services or work the new schedule, please contact the client or decline the booking.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/contractor/gigs" 
         style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin-right: 10px;">
        Review Booking
      </a>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/messages" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        Message Client
      </a>
    </div>
    
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
      <p style="color: #0c4a6e; font-size: 14px; line-height: 1.6; margin: 0;">
        <strong>Need to discuss the changes?</strong><br>
        • Use the messaging system to communicate with ${client.name}
        <br>• If you cannot accommodate the updated booking, please decline promptly
        <br>• Contact support at 352-340-3659 if you have any questions
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
      If you have any questions about these booking changes, please contact us at 
      <a href="mailto:${process.env.SMTP_FROM}" style="color: #667eea;">${process.env.SMTP_FROM}</a> 
      or call us at 352-340-3659.
    </p>
  `

  const textContent = `
Hi ${contractor.name},

${statusReverted ? `
⚠️ RE-APPROVAL REQUIRED

${client.name} has changed the booking dates. This booking has been moved back to Pending status and requires your re-approval. Please review the new dates below and approve or decline the updated booking.

` : ''}${client.name} has updated their upcoming booking with you. Please review the ${datesChanged && servicesChanged ? 'changes' : datesChanged ? 'schedule update' : 'service update'} below and ${statusReverted ? 'approve or decline' : 'confirm if you can still accommodate'} the updated booking.

BOOKING UPDATED:
Current Booking Information:
Client: ${client.name}
Date & Time: ${currentDateRange}
Location: ${[client.address, client.city, client.state].filter(Boolean).join(', ') || 'Not provided'}

${datesChanged && servicesChanged ? 'CHANGES MADE:' : datesChanged ? 'SCHEDULE UPDATED:' : 'SERVICES UPDATED:'}

${datesChanged && previousDateRange ? `
SCHEDULE CHANGES:
Previous: ${previousDateRange}
Updated: ${currentDateRange}
` : ''}

${servicesChanged && previousServiceDetails.length > 0 ? `
SERVICE CHANGES:
Previous Services:
${previousServiceDetails.map(s => `- ${s.name} - $${(s.price / 100).toFixed(2)}${s.paymentType === 'daily' ? '/day' : ''}`).join('\n')}

Updated Services:
${currentServiceDetails.map(s => `- ${s.name} - $${(s.price / 100).toFixed(2)}${s.paymentType === 'daily' ? '/day' : ''}`).join('\n')}
` : ''}

${!datesChanged && !servicesChanged ? `
CURRENT SERVICES:
${currentServiceDetails.map(s => `- ${s.name} - $${(s.price / 100).toFixed(2)}${s.paymentType === 'daily' ? '/day' : ''}`).join('\n')}
` : ''}

${datesChanged || servicesChanged ? 'Your Updated Earnings:' : 'Your Earnings:'} ${contractorEarnings}
Total Client Payment: ${currentTotalAmount}

ACTION REQUIRED: Please review the updated booking details and confirm if you can accommodate the changes. If you cannot provide the updated services or work the new schedule, please contact the client or decline the booking.

Review booking: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/contractor/gigs
Message client: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/messages

NEED TO DISCUSS THE CHANGES?
• Use the messaging system to communicate with ${client.name}
• If you cannot accommodate the updated booking, please decline promptly
• Contact support at 352-340-3659 if you have any questions

If you have any questions about these booking changes, please contact us at ${process.env.SMTP_FROM} or call us at 352-340-3659.

Best regards,
The Boorkin Industries Team
  `

  const emailTitle = statusReverted ? 'Re-Approval Required' : 'Booking Updated'
  const subjectPrefix = statusReverted ? 'Re-Approval Required' : 'Booking Updated'

  return {
    subject: `${subjectPrefix} - ${client.name} (${currentDateRange.split(' from ')[0] || currentDateRange.split(' to ')[0]})`,
    html: createEmailTemplate(content, emailTitle),
    text: textContent
  }
} 