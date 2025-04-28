'use client'

import { PetManagement } from './pet-management'
import type { Pet } from '@/types/client'
import { useRequireRole } from '../use-require-role'

// TODO: Replace with real data fetching from Firebase
const mockPets: Pet[] = [
  {
    id: '1',
    name: 'Bella',
    age: 3,
    photoUrl: '',
    medications: 'None',
    food: 'Dry food',
    temperament: 'Friendly',
    schedule: 'Morning walk',
  },
  {
    id: '2',
    name: 'Max',
    age: 5,
    photoUrl: '',
    medications: 'Insulin',
    food: 'Wet food',
    temperament: 'Calm',
    schedule: 'Evening walk',
  },
]

export default function PetsPage() {
  const { isLoaded, isAuthorized } = useRequireRole('client')
  if (!isLoaded || !isAuthorized) return null
  return <PetManagement initialPets={mockPets} />
} 