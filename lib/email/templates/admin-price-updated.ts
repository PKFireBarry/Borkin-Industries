import type { Booking } from '@/types/booking'
import type { Client } from '@/types/client'
import type { Contractor } from '@/types/contractor'
import type { PlatformService } from '@/types/service'
import { createEmailTemplate, formatBookingDateRange, formatServicesList } from '../utils'
import { getBaseAppUrl } from '@/lib/utils'

interface ServiceLineItem {
  serviceId: string
  paymentType: 'one_time' | 'daily'
  price: number
  name?: string
}

// CLIENT: Admin updated booking prices
export function createAdminPriceUpdatedClientEmail(
  booking: Booking,
  client: Client,
  contractor: Contractor,
  services: PlatformService[],
  previousServices: ServiceLineItem[]
): { subject: string; html: string; text: string } {
  const baseUrl = getBaseAppUrl()

  const currentServiceDetails = booking.services?.map(s => {
    const platform = services.find(ps => ps.id === s.serviceId)
    return { name: platform?.name || s.name || s.serviceId, price: s.price, paymentType: s.paymentType }
  }) || []

  const previousServiceDetails = previousServices.map(s => {
    const platform = services.find(ps => ps.id === s.serviceId)
    return { name: platform?.name || s.name || s.serviceId, price: s.price, paymentType: s.paymentType }
  })

  const dateRange = formatBookingDateRange(booking.startDate, booking.endDate)
  const totalAmount = `$${booking.paymentAmount.toFixed(2)}`

  const content = `
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hi ${client.name},
    </p>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Your booking with <strong>${contractor.name}</strong> has been updated by our admin team following an invoice adjustment request.
    </p>

    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
      <h3 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px;">Invoice Adjustment</h3>

      <div style="margin-bottom: 15px;">
        <strong style="color: #0c4a6e;">Booking Details:</strong><br>
        Contractor: ${contractor.name}<br>
        Date: ${dateRange}
      </div>

      ${previousServiceDetails.length > 0 ? `
      <div style="margin-bottom: 15px;">
        <span style="color: #991b1b; font-weight: 500;">Previous Services:</span>
        <ul style="margin: 5px 0; padding-left: 20px; color: #991b1b;">
          ${formatServicesList(previousServiceDetails)}
        </ul>
      </div>
      ` : ''}

      <div style="margin-bottom: 15px;">
        <span style="color: #065f46; font-weight: 500;">Updated Services:</span>
        <ul style="margin: 5px 0; padding-left: 20px; color: #065f46;">
          ${formatServicesList(currentServiceDetails)}
        </ul>
      </div>

      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #0ea5e9;">
        <strong style="color: #0c4a6e;">New Total:</strong> ${totalAmount}
      </div>
    </div>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      This change was made by our admin team on behalf of a contractor request. If you have any questions about this adjustment, please don't hesitate to reach out.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${baseUrl}/dashboard/bookings"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        View Booking
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
      If you have any questions, please contact us at
      <a href="mailto:${process.env.SMTP_FROM}" style="color: #667eea;">${process.env.SMTP_FROM}</a>
      or call us at 352-340-3659.
    </p>
  `

  const textContent = `
Hi ${client.name},

Your booking with ${contractor.name} has been updated by our admin team following an invoice adjustment request.

INVOICE ADJUSTMENT:
Booking Details:
Contractor: ${contractor.name}
Date: ${dateRange}

Previous Services:
${previousServiceDetails.map(s => `- ${s.name} - $${(s.price / 100).toFixed(2)}${s.paymentType === 'daily' ? '/day' : ''}`).join('\n')}

Updated Services:
${currentServiceDetails.map(s => `- ${s.name} - $${(s.price / 100).toFixed(2)}${s.paymentType === 'daily' ? '/day' : ''}`).join('\n')}

New Total: ${totalAmount}

This change was made by our admin team on behalf of a contractor request. If you have any questions about this adjustment, please don't hesitate to reach out.

View booking: ${baseUrl}/dashboard/bookings

If you have any questions, please contact us at ${process.env.SMTP_FROM} or call us at 352-340-3659.

Best regards,
The Boorkin Industries Team
  `

  return {
    subject: `Booking Updated — Invoice Adjustment`,
    html: createEmailTemplate(content, 'Invoice Adjustment'),
    text: textContent
  }
}

// CONTRACTOR: Admin updated booking prices confirmation
export function createAdminPriceUpdatedContractorEmail(
  booking: Booking,
  client: Client,
  contractor: Contractor,
  services: PlatformService[],
  previousServices: ServiceLineItem[]
): { subject: string; html: string; text: string } {
  const baseUrl = getBaseAppUrl()

  const currentServiceDetails = booking.services?.map(s => {
    const platform = services.find(ps => ps.id === s.serviceId)
    return { name: platform?.name || s.name || s.serviceId, price: s.price, paymentType: s.paymentType }
  }) || []

  const previousServiceDetails = previousServices.map(s => {
    const platform = services.find(ps => ps.id === s.serviceId)
    return { name: platform?.name || s.name || s.serviceId, price: s.price, paymentType: s.paymentType }
  })

  const dateRange = formatBookingDateRange(booking.startDate, booking.endDate)
  const totalAmount = `$${booking.paymentAmount.toFixed(2)}`
  const baseServiceAmount = booking.baseServiceAmount || booking.services?.reduce((total, s) => total + s.price, 0) || 0
  const contractorEarnings = booking.baseServiceAmount
    ? `$${baseServiceAmount.toFixed(2)}`
    : `$${(baseServiceAmount / 100).toFixed(2)}`

  const content = `
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hi ${contractor.name},
    </p>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      The invoice adjustment you requested for the booking with <strong>${client.name}</strong> has been completed by our admin team.
    </p>

    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
      <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">Invoice Adjustment Confirmed</h3>

      <div style="margin-bottom: 15px;">
        <strong style="color: #166534;">Booking Details:</strong><br>
        Client: ${client.name}<br>
        Date: ${dateRange}
      </div>

      ${previousServiceDetails.length > 0 ? `
      <div style="margin-bottom: 15px;">
        <span style="color: #991b1b; font-weight: 500;">Previous Services:</span>
        <ul style="margin: 5px 0; padding-left: 20px; color: #991b1b;">
          ${formatServicesList(previousServiceDetails)}
        </ul>
      </div>
      ` : ''}

      <div style="margin-bottom: 15px;">
        <span style="color: #065f46; font-weight: 500;">Updated Services:</span>
        <ul style="margin: 5px 0; padding-left: 20px; color: #065f46;">
          ${formatServicesList(currentServiceDetails)}
        </ul>
      </div>

      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #22c55e;">
        <strong style="color: #166534;">Your Updated Earnings:</strong> ${contractorEarnings}<br>
        <strong style="color: #166534;">Total Client Payment:</strong> ${totalAmount}
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${baseUrl}/dashboard/contractor/gigs"
         style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        Review Booking
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
      If you have any questions, please contact us at
      <a href="mailto:${process.env.SMTP_FROM}" style="color: #667eea;">${process.env.SMTP_FROM}</a>
      or call us at 352-340-3659.
    </p>
  `

  const textContent = `
Hi ${contractor.name},

The invoice adjustment you requested for the booking with ${client.name} has been completed by our admin team.

INVOICE ADJUSTMENT CONFIRMED:
Booking Details:
Client: ${client.name}
Date: ${dateRange}

Previous Services:
${previousServiceDetails.map(s => `- ${s.name} - $${(s.price / 100).toFixed(2)}${s.paymentType === 'daily' ? '/day' : ''}`).join('\n')}

Updated Services:
${currentServiceDetails.map(s => `- ${s.name} - $${(s.price / 100).toFixed(2)}${s.paymentType === 'daily' ? '/day' : ''}`).join('\n')}

Your Updated Earnings: ${contractorEarnings}
Total Client Payment: ${totalAmount}

Review booking: ${baseUrl}/dashboard/contractor/gigs

If you have any questions, please contact us at ${process.env.SMTP_FROM} or call us at 352-340-3659.

Best regards,
The Boorkin Industries Team
  `

  return {
    subject: `Booking Updated — Invoice Adjustment Confirmed`,
    html: createEmailTemplate(content, 'Invoice Adjustment Confirmed'),
    text: textContent
  }
}
