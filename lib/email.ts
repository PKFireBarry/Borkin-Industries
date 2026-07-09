import nodemailer from 'nodemailer'

// Create transporter with Gmail SMTP configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use Gmail service instead of manual config
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter configuration error:', error)
  } else {
    console.log('Email server is ready to send messages')
  }
})

interface ContactEmailData {
  name: string
  email: string
  subject: string
  message: string
}

export async function sendContactEmail(data: ContactEmailData) {
  try {
    const { name, email, subject, message } = data

    // Email to company (you receive this)
    const companyEmailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: process.env.SMTP_FROM, // Your company email
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px; text-align: center;">New Contact Form Submission</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="margin-bottom: 20px;">
              <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 18px;">Contact Details:</h3>
              <p style="margin: 5px 0; color: #6b7280;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 5px 0; color: #6b7280;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0; color: #6b7280;"><strong>Subject:</strong> ${subject}</p>
            </div>
            
            <div style="margin-top: 20px;">
              <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 18px;">Message:</h3>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
                <p style="margin: 0; color: #374151; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
              </div>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 14px; text-align: center;">
                This email was sent from the Boorkin Industries contact form
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        New Contact Form Submission
        
        Name: ${name}
        Email: ${email}
        Subject: ${subject}
        
        Message:
        ${message}
        
        ---
        This email was sent from the Boorkin Industries contact form
      `,
    }

    // Auto-reply to customer
    const customerEmailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Thank you for contacting Boorkin Industries',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px; text-align: center;">Thank You for Contacting Us!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hi ${name},
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Thank you for reaching out to Boorkin Industries! We've received your message and will get back to you within 24 hours during business days.
            </p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">Your Message:</h3>
              <p style="margin: 0; color: #6b7280; font-style: italic;">"${subject}"</p>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              In the meantime, feel free to explore our services or call us directly at <strong>352-340-3659</strong> if you have any urgent questions.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:${process.env.SMTP_FROM}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Reply to This Email
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                Best regards,<br>
                <strong>The Boorkin Industries Team</strong>
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        Hi ${name},
        
        Thank you for reaching out to Boorkin Industries! We've received your message and will get back to you within 24 hours during business days.
        
        Your Message: "${subject}"
        
        In the meantime, feel free to explore our services or call us directly at 352-340-3659 if you have any urgent questions.
        
        Best regards,
        The Boorkin Industries Team
      `,
    }

    // Send both emails
    const [companyResult, customerResult] = await Promise.all([
      transporter.sendMail(companyEmailOptions),
      transporter.sendMail(customerEmailOptions),
    ])

    console.log('Company email sent:', companyResult.messageId)
    console.log('Customer email sent:', customerResult.messageId)

    return {
      success: true,
      companyMessageId: companyResult.messageId,
      customerMessageId: customerResult.messageId,
    }
  } catch (error) {
    console.error('Error sending email:', error)
    throw new Error('Failed to send email')
  }
}

export default transporter 