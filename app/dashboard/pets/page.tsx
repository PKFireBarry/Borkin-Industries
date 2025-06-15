'use client'

import { PetManagement } from './pet-management'
import { useRequireRole } from '../use-require-role'

export default function PetsPage() {
  const { isLoaded, isAuthorized } = useRequireRole('client')
  
  if (!isLoaded || !isAuthorized) return null
  
  return <PetManagement />
} 