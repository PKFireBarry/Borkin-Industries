import { getBaseAppUrl } from '@/lib/utils'
import type { Booking } from '@/types/booking'
import type { Client } from '@/types/client'
import type { Contractor } from '@/types/contractor'
import type { PlatformService } from '@/types/service'
import { createEmailTemplate, formatBookingDateRange, formatServicesList } from '../utils'

export function createCompletionReminderEmail(
  booking: Booking,
  client: Client,
  contractor: Contractor,
  services: PlatformService[],
  completionUrl: string,
  reminderNumber: number
): { subject: string; html: string; text: string } {
  const serviceDetails = booking.services?.map((bookingService) => {
    const platformService = services.find((service) => service.id === bookingService.serviceId)
    return {
      name: platformService?.name || bookingService.name || bookingService.serviceId,
      price: bookingService.price,
      paymentType: bookingService.paymentType,
    }
  }) || []

  const dashboardUrl = `${getBaseAppUrl()}/dashboard/bookings?bookingId=${booking.id}`
  const dateRange = formatBookingDateRange(booking.startDate, booking.endDate)
  const isFinalReminder = reminderNumber >= 2
  const subject = isFinalReminder
    ? 'Final reminder: please confirm your completed pet care service'
    : 'Your pet care service is complete - please confirm payment release'

  const urgencyCopy = isFinalReminder
    ? 'If you do not confirm this completed service, payment will be automatically released within the next 24 hours.'
    : 'Please confirm that the service is complete so payment can be released to your contractor.'

  const content = `
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hi ${client.name},
    </p>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      ${contractor.name} marked your pet care service as complete.
    </p>

    <div style="background: ${isFinalReminder ? '#fff7ed' : '#eff6ff'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isFinalReminder ? '#f97316' : '#2563eb'};">
      <h3 style="color: ${isFinalReminder ? '#9a3412' : '#1d4ed8'}; margin: 0 0 12px 0; font-size: 18px;">${isFinalReminder ? 'Final reminder' : 'Action needed'}</h3>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0;">
        ${urgencyCopy}
      </p>
    </div>

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Service details</h3>
      <div style="margin-bottom: 15px; color: #475569; line-height: 1.7;">
        <strong style="color: #0f172a;">Contractor:</strong> ${contractor.name}<br>
        <strong style="color: #0f172a;">Service dates:</strong> ${dateRange}<br>
        <strong style="color: #0f172a;">Total charge:</strong> $${booking.paymentAmount.toFixed(2)}
      </div>

      <div>
        <strong style="color: #0f172a;">Services provided:</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          ${formatServicesList(serviceDetails)}
        </ul>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${completionUrl}"
         style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 999px; font-weight: bold; display: inline-block;">
        Confirm Service Completion
      </a>
    </div>

    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
      If the button above does not work, you can also review this booking in your dashboard:
    </p>
    <p style="word-break: break-word; color: #2563eb; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
      <a href="${dashboardUrl}" style="color: #2563eb;">${dashboardUrl}</a>
    </p>

    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
      If you have any questions, reply to this email or contact us at
      <a href="mailto:${process.env.SMTP_FROM}" style="color: #2563eb;">${process.env.SMTP_FROM}</a>.
    </p>
  `

  const textContent = `
Hi ${client.name},

${contractor.name} marked your pet care service as complete.

${urgencyCopy}

Contractor: ${contractor.name}
Service dates: ${dateRange}
Total charge: $${booking.paymentAmount.toFixed(2)}

Services provided:
${serviceDetails.map((service) => `- ${service.name} - $${(service.price / 100).toFixed(2)}${service.paymentType === 'daily' ? '/day' : ''}`).join('\n')}

Confirm service completion:
${completionUrl}

Review this booking in your dashboard:
${dashboardUrl}
  `

  return {
    subject,
    html: createEmailTemplate(content, 'Confirm Service Completion'),
    text: textContent,
  }
}
