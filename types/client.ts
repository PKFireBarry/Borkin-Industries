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
  id: string
  name: string
  address?: string
  phone: string
  email: string
  pets: Pet[]
  paymentMethods: PaymentMethod[]
  bookingHistory: Booking[]
  stripeCustomerId?: string
} 