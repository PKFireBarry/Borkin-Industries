export interface Booking {
  id: string
  clientId: string
  contractorId: string
  petIds: string[]
  
  // Updated for multiple services
  services: {
    serviceId: string
    paymentType: 'one_time' | 'daily'
    price: number // Price in cents
    name?: string // Optional service name for display
  }[]
  
  // Fields for multi-day booking
  startDate: string // ISO date string
  endDate: string // ISO date string
  numberOfDays: number
  
  // Time information
  time?: {
    startTime: string // HH:MM format
    endTime: string // HH:MM format
  }

  status: 'pending' | 'approved' | 'completed' | 'cancelled'
  
  // Payment related fields
  paymentAmount: number // Total amount in currency (e.g., USD, not cents here for display type)
  platformFee: number // Platform fee in currency
  paymentIntentId: string
  paymentClientSecret?: string // Optional as client doesn't always need it after creation
  paymentMethodId?: string
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed' | 'cancelled' // Added 'failed' and 'cancelled'
  
  // Keeping for backward compatibility
  serviceType?: string // Deprecated: Use services array instead
  paymentType?: 'one_time' | 'daily' // Deprecated: Use services array instead

  // Timestamps
  createdAt: string // ISO date string
  updatedAt: string // ISO date string

  // Optional review
  review?: {
    rating: number
    comment?: string
    createdAt: string // ISO date string
  }

  // Optional fields for contractor/client completion tracking (if used)
  clientCompleted?: boolean
  contractorCompleted?: boolean

  // Remove old single 'date' field if it's fully deprecated
  // date?: string; // Keep if some old bookings might still have it and need handling

  contractorName: string // Contractor's name at time of booking
  contractorPhone: string // Contractor's phone at time of booking
} 