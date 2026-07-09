'use client'

import { Suspense } from 'react'
import { PetManagement } from './pet-management'
import { useRequireRole } from '../use-require-role'

function PetsPageContent() {
  const { isLoaded, isAuthorized } = useRequireRole('client')

  if (!isLoaded || !isAuthorized) return null

  return <PetManagement />
}

export default function PetsPage() {
  return (
    <Suspense fallback={null}>
      <PetsPageContent />
    </Suspense>
  )
} 