export interface Booking {
  id: string
  clientId: string
  contractorId: string
  petIds: string[]
  serviceType: string
  date: string // ISO date
  status: 'pending' | 'approved' | 'completed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'refunded'
  paymentAmount: number
  paymentMethodId?: string
  createdAt: string // ISO date
  updatedAt: string // ISO date
  review?: {
    rating: number
    comment?: string
    createdAt: string // ISO date
  }
} 