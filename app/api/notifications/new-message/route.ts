import { NextRequest, NextResponse } from 'next/server'
import { sendNewMessageNotification } from '@/lib/email/notifications'
import { getClientProfile } from '@/lib/firebase/client'
import { getContractorProfile } from '@/lib/firebase/contractors'
import type { Client } from '@/types/client'
import type { Contractor } from '@/types/contractor'

interface MessageNotificationRequest {
  recipientId: string
  senderId: string
  message: {
    id: string
    content: string
    timestamp: string // ISO string
    chatId: string
  }
  isRecipientClient: boolean
  isSenderClient: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { 
      recipientId, 
      senderId, 
      message, 
      isRecipientClient, 
      isSenderClient 
    }: MessageNotificationRequest = await request.json()

    if (!recipientId || !senderId || !message) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
    }

    // Fetch recipient and sender profiles
    const [recipient, sender] = await Promise.all([
      isRecipientClient ? getClientProfile(recipientId) : getContractorProfile(recipientId),
      isSenderClient ? getClientProfile(senderId) : getContractorProfile(senderId)
    ])

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 })
    }

    if (!recipient.email) {
      return NextResponse.json({ error: 'Recipient email not found' }, { status: 400 })
    }

    // Convert timestamp string to Date
    const messageWithDate = {
      ...message,
      timestamp: new Date(message.timestamp)
    }

    // Send notification
    await sendNewMessageNotification(
      recipient as Client | Contractor, 
      sender as Client | Contractor, 
      messageWithDate, 
      isRecipientClient
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending new message notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
} 