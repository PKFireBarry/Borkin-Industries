export interface ContractorApplication {
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string // ISO date
  reviewedAt?: string // ISO date
  experience: string
  education: string
  address: string
  drivingRange: string
  certifications: string[]
  references: string[]
}

export interface Availability {
  // ISO date strings for available days/times
  availableSlots: string[]
  unavailableDates?: string[]
}

export interface PaymentInfo {
  id: string
  type: 'bank' | 'card' | 'other'
  last4: string
  brand?: string
  expMonth?: number
  expYear?: number
  isDefault?: boolean
}

export interface WorkHistory {
  bookingId: string
  clientId: string
  petIds: string[]
  serviceType: string
  date: string // ISO date
  status: 'pending' | 'approved' | 'completed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'refunded'
  paymentAmount: number
  review?: {
    rating: number
    comment?: string
  }
}

export interface Rating {
  bookingId: string
  clientId: string
  rating: number
  comment?: string
  date: string // ISO date
}

export interface Contractor {
  id: string
  name: string
  address: string
  phone: string
  email: string
  veterinarySkills: string[]
  experience: string
  certifications: string[]
  references: string[]
  education: string
  drivingRange: string
  application: ContractorApplication
  availability: Availability
  paymentInfo: PaymentInfo[]
  workHistory: WorkHistory[]
  ratings: Rating[]
} 