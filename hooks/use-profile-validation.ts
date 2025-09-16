'use client'

import { useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { getClientProfile } from '@/lib/firebase/client'
import {
  validateProfileCompleteness,
  createProfileValidationError,
  checkPaymentMethodExists,
  type ProfileValidationError
} from '@/lib/validation/profile-completeness'

export function useProfileValidation() {
  const { user } = useUser()
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false)
  const [validationError, setValidationError] = useState<ProfileValidationError | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  /**
   * Validates if the user's profile is complete enough to create a booking.
   * If not, shows the validation modal.
   * @returns Promise<boolean> - true if profile is complete, false if validation modal was shown
   */
  const validateBeforeBooking = useCallback(async (): Promise<boolean> => {
    if (!user) {
      console.warn('No user found for profile validation')
      return false
    }

    setIsChecking(true)

    try {
      // Fetch client profile
      const profile = await getClientProfile(user.id)

      // Check if payment method exists
      const hasPaymentMethod = await checkPaymentMethodExists(profile?.stripeCustomerId)

      // Validate profile completeness
      const validation = validateProfileCompleteness(profile, hasPaymentMethod)

      if (validation.isComplete) {
        return true
      }

      // Profile is incomplete, show validation modal
      const error = createProfileValidationError(validation)
      setValidationError(error)
      setIsValidationModalOpen(true)
      return false

    } catch (error) {
      console.error('Error validating profile:', error)

      // On error, assume profile is incomplete and show modal
      setValidationError({
        type: 'both',
        title: 'Unable to Verify Profile',
        description: 'We couldn\'t verify your profile information. Please ensure your profile and payment information are up to date.',
        missingFields: ['Profile Information', 'Payment Method'],
        profileUrl: '/dashboard/profile',
        paymentUrl: '/dashboard/payments'
      })
      setIsValidationModalOpen(true)
      return false

    } finally {
      setIsChecking(false)
    }
  }, [user])

  const closeValidationModal = useCallback(() => {
    setIsValidationModalOpen(false)
    setValidationError(null)
  }, [])

  return {
    validateBeforeBooking,
    isValidationModalOpen,
    validationError,
    closeValidationModal,
    isChecking
  }
}