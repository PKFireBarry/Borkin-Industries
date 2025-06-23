import nodemailer from 'nodemailer'
import { 
  createBookingRequestClientEmail, 
  createNewGigRequestContractorEmail,
  createBookingApprovedClientEmail,
  createBookingDeclinedClientEmail,
  createClientCancelledBookingEmail,
  createGigCancelledContractorEmail,
  createBookingCompletedClientEmail,
  createPaymentFailureEmail,
  createNewMessageEmail,
  createServicesUpdatedContractorEmail
} from './templates'
import type { Booking } from '@/types/booking'
import type { Client } from '@/types/client'
import type { Contractor } from '@/types/contractor'
import type { PlatformService } from '@/types/service'

// Create transporter (reusable)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Send booking created notifications (existing)
export async function sendBookingCreatedNotifications(
  booking: Booking,
  client: Client,
  contractor: Contractor,
  services: PlatformService[]
): Promise<void> {
  const transporter = createTransporter()

  try {
    // Client confirmation email
    const clientEmail = createBookingRequestClientEmail(booking, client, contractor, services)
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: client.email,
      subject: clientEmail.subject,
      html: clientEmail.html,
      text: clientEmail.text,
    })

    // Contractor notification email
    const contractorEmail = createNewGigRequestContractorEmail(booking, client, contractor, services)
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: contractor.email,
      subject: contractorEmail.subject,
      html: contractorEmail.html,
      text: contractorEmail.text,
    })

    console.log('Booking created notifications sent successfully')
  } catch (error) {
    console.error('Error sending booking created notifications:', error)
    // Don't throw - we don't want email failures to break the booking process
  }
}

// Send booking approved notification
export async function sendBookingApprovedNotification(
  booking: Booking,
  client: Client,
  contractor: Contractor,
  services: PlatformService[]
): Promise<void> {
  const transporter = createTransporter()

  try {
    const email = createBookingApprovedClientEmail(booking, client, contractor, services)
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: client.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })

    console.log('Booking approved notification sent successfully')
  } catch (error) {
    console.error('Error sending booking approved notification:', error)
  }
}

// Send booking declined notification
export async function sendBookingDeclinedNotification(
  booking: Booking,
  client: Client,
  contractor: Contractor,
  services: PlatformService[]
): Promise<void> {
  const transporter = createTransporter()

  try {
    const email = createBookingDeclinedClientEmail(booking, client, contractor, services)
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: client.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })

    console.log('Booking declined notification sent successfully')
  } catch (error) {
    console.error('Error sending booking declined notification:', error)
  }
}

// Send booking completed receipt
export async function sendBookingCompletedReceipt(
  booking: Booking,
  client: Client,
  contractor: Contractor,
  services: PlatformService[]
): Promise<void> {
  const transporter = createTransporter()

  try {
    const email = createBookingCompletedClientEmail(booking, client, contractor, services)
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: client.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })

    console.log('Booking completed receipt sent successfully')
  } catch (error) {
    console.error('Error sending booking completed receipt:', error)
  }
}

// Send payment failure notification
export async function sendPaymentFailureNotification(
  booking: Booking,
  client: Client,
  contractor: Contractor,
  services: PlatformService[],
  failureReason?: string
): Promise<void> {
  const transporter = createTransporter()

  try {
    const email = createPaymentFailureEmail(booking, client, contractor, services, failureReason)
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: client.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })

    console.log('Payment failure notification sent successfully')
  } catch (error) {
    console.error('Error sending payment failure notification:', error)
  }
}

// Send new message notification
export async function sendNewMessageNotification(
  message: {
    id: string;
    chatId: string;
    senderId: string;
    receiverId: string;
    text: string;
    timestamp: number;
    readBy: { [userId: string]: boolean };
  },
  recipientName: string,
  senderName: string,
  recipientEmail: string,
  isContractor: boolean = false
): Promise<void> {
  const transporter = createTransporter()

  try {
    const email = createNewMessageEmail(message, recipientName, senderName, isContractor)
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: recipientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })

    console.log('New message notification sent successfully')
  } catch (error) {
    console.error('Error sending new message notification:', error)
  }
}

// Send booking cancelled notification (contractor cancels, client gets notified)
export async function sendBookingCancelledNotification(
  booking: Booking,
  client: Client,
  contractor: Contractor,
  services: PlatformService[]
): Promise<void> {
  const transporter = createTransporter()

  try {
    const email = createClientCancelledBookingEmail(booking, client, contractor, services)
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: client.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })

    console.log('Booking cancellation notification sent successfully')
  } catch (error) {
    console.error('Error sending booking cancellation notification:', error)
  }
}

// Send client cancelled booking notification (client cancels, contractor gets notified)
export async function sendClientCancelledBookingNotification(
  booking: Booking,
  client: Client,
  contractor: Contractor,
  services: PlatformService[]
): Promise<void> {
  console.log('[DEBUG] sendClientCancelledBookingNotification called for booking:', booking.id)
  const transporter = createTransporter()

  try {
    console.log('[DEBUG] Creating email template for contractor:', contractor.email)
    const email = createGigCancelledContractorEmail(booking, client, contractor, services)
    console.log('[DEBUG] Email template created, sending email...')
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: contractor.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })

    console.log('Client cancelled booking notification sent successfully to contractor')
  } catch (error) {
    console.error('Error sending client cancelled booking notification:', error)
  }
}

// Send services updated notification
export async function sendServicesUpdatedNotification(
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
  }
): Promise<void> {
  const transporter = createTransporter()

  try {
    const email = createServicesUpdatedContractorEmail(booking, client, contractor, services, previousServices, previousBookingData)
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: contractor.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })

    console.log('Services updated notification sent successfully')
  } catch (error) {
    console.error('Error sending services updated notification:', error)
  }
} 