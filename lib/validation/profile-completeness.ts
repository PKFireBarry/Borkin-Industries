import type { Client } from '@/types/client'

export interface ProfileValidationResult {
  isComplete: boolean
  missingFields: string[]
  missingProfile: string[]
  missingPayment: boolean
}

export interface ProfileValidationError {
  type: 'profile' | 'payment' | 'both'
  title: string
  description: string
  missingFields: string[]
  profileUrl: string
  paymentUrl: string
}

const REQUIRED_PROFILE_FIELDS = [
  { key: 'name', label: 'Full Name' },
  { key: 'email', label: 'Email Address' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'address', label: 'Street Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'postalCode', label: 'Postal Code' },
  { key: 'avatar', label: 'Profile Picture' }
]

/**
 * Validates if a client profile is complete enough for booking creation
 */
export function validateProfileCompleteness(profile: Client | null, hasPaymentMethod: boolean = false): ProfileValidationResult {
  if (!profile) {
    return {
      isComplete: false,
      missingFields: REQUIRED_PROFILE_FIELDS.map(f => f.label),
      missingProfile: REQUIRED_PROFILE_FIELDS.map(f => f.label),
      missingPayment: !hasPaymentMethod
    }
  }

  const missingProfileFields: string[] = []

  REQUIRED_PROFILE_FIELDS.forEach(field => {
    const value = profile[field.key as keyof Client]
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingProfileFields.push(field.label)
    }
  })

  const missingPayment = !hasPaymentMethod

  return {
    isComplete: missingProfileFields.length === 0 && !missingPayment,
    missingFields: [...missingProfileFields, ...(missingPayment ? ['Payment Method'] : [])],
    missingProfile: missingProfileFields,
    missingPayment
  }
}

/**
 * Creates a user-friendly error object for incomplete profiles
 */
export function createProfileValidationError(validation: ProfileValidationResult): ProfileValidationError {
  const hasProfileIssues = validation.missingProfile.length > 0
  const hasPaymentIssues = validation.missingPayment

  let type: 'profile' | 'payment' | 'both' = 'profile'
  let title = ''
  let description = ''

  if (hasProfileIssues && hasPaymentIssues) {
    type = 'both'
    title = 'Complete Your Profile & Add Payment Method'
    description = 'To create a booking, please complete your profile information and add a payment method. This helps us provide better service and process your bookings.'
  } else if (hasProfileIssues) {
    type = 'profile'
    title = 'Complete Your Profile'
    description = 'Please complete your profile information before creating a booking. This helps contractors know who they\'ll be working with.'
  } else if (hasPaymentIssues) {
    type = 'payment'
    title = 'Add a Payment Method'
    description = 'Please add a payment method to your account before creating a booking. This is required to process payment when your booking is approved.'
  }

  return {
    type,
    title,
    description,
    missingFields: validation.missingFields,
    profileUrl: '/dashboard/profile',
    paymentUrl: '/dashboard/payments'
  }
}

/**
 * Checks if client has any payment methods on file
 */
export async function checkPaymentMethodExists(stripeCustomerId: string | undefined): Promise<boolean> {
  if (!stripeCustomerId) return false

  try {
    const response = await fetch('/api/stripe/list-payment-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: stripeCustomerId }),
    })

    if (!response.ok) return false

    const { paymentMethods } = await response.json()
    return Array.isArray(paymentMethods) && paymentMethods.length > 0
  } catch (error) {
    console.warn('Failed to check payment methods:', error)
    return false
  }
}