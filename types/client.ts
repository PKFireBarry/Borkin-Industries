export interface Pet {
  id: string
  name: string
  age: number
  photoUrl?: string
  medications?: string
  food?: string
  foodSchedule?: string
  animalType?: string
  breed?: string
  weight?: string
  temperament?: string
  schedule?: string
  allergies?: string
  needToKnow?: string
}

export interface PaymentMethod {
  id: string
  type: 'card' | 'bank' | 'other'
  last4: string
  brand?: string
  expMonth?: number
  expYear?: number
  isDefault?: boolean
}

export interface Booking {
  id: string
  clientId: string
  contractorId: string
  petIds: string[]
  serviceType: string
  startDate?: string // ISO string
  endDate?: string // ISO string
  date?: string // ISO string
  status: 'pending' | 'approved' | 'completed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'cancelled'
  clientCompleted?: boolean
  contractorCompleted?: boolean
  paymentAmount: number
  platformFee?: number // 5% platform fee
  review?: {
    rating: number
    comment?: string
  }
  paymentIntentId?: string
  paymentClientSecret?: string
  stripeFee?: number // Actual Stripe fee for the transaction
  netPayout?: number // Actual net payout to contractor
}

export interface Client {
  id: string // User ID from Clerk
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  createdAt?: string // ISO date string
  updatedAt?: string // ISO date string
  status?: 'active' | 'inactive' | 'suspended'
  avatar?: string // URL to avatar image
  bio?: string
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  petCareProvider?: {
    name: string
    phone: string
    address?: string
  }
  emergencyClinic?: {
    name: string
    phone: string
    address?: string
  }
  preferences?: {
    notifications?: {
      email?: boolean
      sms?: boolean
      app?: boolean
    }
    language?: string
    timezone?: string
  }
  metadata?: Record<string, any> // For any additional data
  pets: Pet[]
  paymentMethods: PaymentMethod[]
  bookingHistory: Booking[]
  stripeCustomerId?: string
} 