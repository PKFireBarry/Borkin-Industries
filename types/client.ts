export interface Pet {
  id: string
  name: string
  age: number
  photoUrl?: string
  medications?: string
  food?: string
  temperament?: string
  schedule?: string
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
  date: string // ISO string
  status: 'pending' | 'approved' | 'completed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'refunded'
  clientCompleted?: boolean
  contractorCompleted?: boolean
  paymentAmount: number
  review?: {
    rating: number
    comment?: string
  }
  paymentIntentId?: string
  paymentClientSecret?: string
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