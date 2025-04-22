'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUser } from '@clerk/nextjs'
import { getClientProfile } from '@/lib/firebase/client'
import { addBooking } from '@/lib/firebase/bookings'
import { getAllContractors } from '@/lib/firebase/contractors'
import type { Contractor } from '@/types/contractor'
import type { Pet } from '@/types/client'

const SERVICE_TYPES = [
  'Dog Walking',
  'Cat Sitting',
  'Medication Administration',
  'Overnight Stay',
]

export function BookingRequestForm({ onSuccess, preselectedContractorId }: { onSuccess: () => void; preselectedContractorId?: string | null }) {
  const { user } = useUser()
  const [pets, setPets] = useState<Pet[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [selectedContractor, setSelectedContractor] = useState(preselectedContractorId || '')
  const [selectedPets, setSelectedPets] = useState<string[]>([])
  const [serviceType, setServiceType] = useState('Dog Walking')
  const [date, setDate] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [filteredContractors, setFilteredContractors] = useState<Contractor[]>([])

  useEffect(() => {
    async function fetchPetsAndContractors() {
      if (!user) return
      const profile = await getClientProfile(user.id)
      setPets(profile?.pets || [])
      const allContractors = await getAllContractors()
      setContractors(allContractors.filter(c => c.application?.status === 'approved'))
    }
    fetchPetsAndContractors()
  }, [user])

  useEffect(() => {
    if (!serviceType && !date) {
      setFilteredContractors(contractors)
      return
    }
    setFilteredContractors(
      contractors.filter(c => {
        const matchesSkill = !serviceType || (c.veterinarySkills || []).includes(serviceType)
        const matchesDate = !date || (c.availability?.availableSlots || []).some(slot => slot.slice(0, 10) === date)
        return matchesSkill && matchesDate
      })
    )
  }, [contractors, serviceType, date])

  const handlePetToggle = (petId: string) => {
    setSelectedPets((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!user) return
    if (!selectedPets.length) {
      setError('Please select at least one pet.')
      return
    }
    if (!date) {
      setError('Please select a date and time.')
      return
    }
    setIsPending(true)
    try {
      await addBooking({
        clientId: user.id,
        contractorId: selectedContractor,
        petIds: selectedPets,
        serviceType,
        date,
        status: 'pending',
        paymentStatus: 'pending',
        paymentAmount: 0,
      })
      setSuccess(true)
      onSuccess()
    } catch (err) {
      setError('Failed to create booking')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Select Pet(s)</label>
        <div className="flex flex-wrap gap-2">
          {pets.map((pet) => (
            <label key={pet.id} className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPets.includes(pet.id)}
                onChange={() => handlePetToggle(pet.id)}
                className="accent-primary"
              />
              <span>{pet.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Service Type</label>
        <select
          className="w-full border rounded-md px-3 py-2"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
        >
          {SERVICE_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Date & Time</label>
        <Input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Contractor (optional)</label>
        <select
          className="w-full border rounded-md px-3 py-2"
          value={selectedContractor}
          onChange={e => setSelectedContractor(e.target.value)}
        >
          <option value="">No preference</option>
          {filteredContractors.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {error && <div className="text-destructive text-sm">{error}</div>}
      {success && <div className="text-success text-sm">Booking created!</div>}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Booking'}
      </Button>
    </form>
  )
} 