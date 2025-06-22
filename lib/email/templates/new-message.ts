import type { Message } from '@/types/messaging'
import { createEmailTemplate } from '../utils'

// New message received while offline
export function createNewMessageEmail(
  message: Message,
  recipientName: string,
  senderName: string,
  isContractor: boolean = false
): { subject: string; html: string; text: string } {
  
  const dashboardUrl = isContractor 
    ? `${process.env.NEXT_PUBLIC_APP_URL}`
    : `${process.env.NEXT_PUBLIC_APP_URL}`

  const content = `
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hi ${recipientName},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      You have a new message from <strong>${senderName}</strong> on Boorkin Industries.
    </p>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">💬 New Message</h3>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #374151;">From:</strong> ${senderName}<br>
        <strong style="color: #374151;">Sent:</strong> ${new Date(message.timestamp).toLocaleString()}
      </div>
      
              <div style="background: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 15px 0;">
          <p style="color: #374151; margin: 0; line-height: 1.6; font-style: italic;">
            "${message.text}"
          </p>
        </div>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Login to your account to view the full conversation and respond.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        View Message
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
      You're receiving this email because you have message notifications enabled. 
      You can manage your notification preferences by logging into your account.
    </p>
  `

  const textContent = `
Hi ${recipientName},

You have a new message from ${senderName} on Boorkin Industries.

NEW MESSAGE:
From: ${senderName}
Sent: ${new Date(message.timestamp).toLocaleString()}

"${message.text}"

Login to your account to view the full conversation and respond.

View message: ${dashboardUrl}

You're receiving this email because you have message notifications enabled. 
You can manage your notification preferences by logging into your account.

Best regards,
The Boorkin Industries Team
  `

  return {
    subject: `New message from ${senderName}`,
    html: createEmailTemplate(content, 'New Message'),
    text: textContent
  }
} 