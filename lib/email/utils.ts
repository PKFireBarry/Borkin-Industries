// Base email template wrapper
export function createEmailTemplate(content: string, title: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0; font-size: 24px; text-align: center;">${title}</h1>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        ${content}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 14px;">
            Best regards,<br>
            <strong>The Boorkin Industries Team</strong>
          </p>
        </div>
      </div>
    </div>
  `
}

// Helper function to format date range
export function formatBookingDateRange(startDate: string, endDate: string): string {
  // Handle different date formats consistently
  // startDate might be ISO timestamp: '2025-06-23T13:00:00.000Z'
  // endDate might be date-only: '2025-06-24'
  
  const start = new Date(startDate)
  
  // For endDate, if it's just a date (no time), parse it carefully to avoid timezone issues
  let end: Date
  if (endDate.includes('T') || endDate.includes('Z')) {
    // Has time component, parse normally
    end = new Date(endDate)
  } else {
    // Date-only string, parse as local date to avoid timezone conversion
    const [year, month, day] = endDate.split('-').map(Number)
    end = new Date(year, month - 1, day) // month is 0-indexed
  }
  
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }
  
  if (start.toDateString() === end.toDateString()) {
    // Same day
    return `${start.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })} from ${start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })} to ${end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })}`
  } else {
    // Multiple days - for end date, if it's date-only, don't show time
    const endHasTime = endDate.includes('T') || endDate.includes('Z')
    const endFormatOptions: Intl.DateTimeFormatOptions = endHasTime ? formatOptions : {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
    
    return `${start.toLocaleDateString('en-US', formatOptions)} to ${end.toLocaleDateString('en-US', endFormatOptions)}`
  }
}

// Helper function to format services list
export function formatServicesList(services: Array<{ name: string; price: number; paymentType: 'one_time' | 'daily' }>): string {
  return services.map(service => {
    const price = `$${(service.price / 100).toFixed(2)}`
    const frequency = service.paymentType === 'daily' ? '/day' : ''
    return `<li style="margin: 5px 0; color: #374151;">${service.name} - ${price}${frequency}</li>`
  }).join('')
} 