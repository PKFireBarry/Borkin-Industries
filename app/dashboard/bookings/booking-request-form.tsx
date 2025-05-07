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
  const [startDate, setStartDate] = useState('') // yyyy-mm-dd
  const [startTime, setStartTime] = useState('') // hh:mm
  const [endDate, setEndDate] = useState('') // yyyy-mm-dd
  const [endTime, setEndTime] = useState('') // hh:mm
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
    // Sync selectedContractor with preselectedContractorId when it changes
    if (preselectedContractorId) {
      setSelectedContractor(preselectedContractorId)
    }
  }, [preselectedContractorId])

  useEffect(() => {
    if (!serviceType && !startDate) {
      setFilteredContractors(contractors)
      return
    }
    setFilteredContractors(
      contractors.filter(c => {
        const matchesSkill = !serviceType || (c.veterinarySkills || []).includes(serviceType)
        const matchesDate = !startDate || (c.availability?.availableSlots || []).some(slot => slot.slice(0, 10) === startDate.slice(0, 10))
        return matchesSkill && matchesDate
      })
    )
  }, [contractors, serviceType, startDate])

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
    if (!startDate || !startTime || !endDate || !endTime) {
      setError('Please select a start and end date and time.')
      return
    }
    const startDateTime = new Date(`${startDate}T${startTime}`)
    const endDateTime = new Date(`${endDate}T${endTime}`)
    if (endDateTime <= startDateTime) {
      setError('End date/time must be after start date/time.')
      return
    }
    setIsPending(true)
    try {
      const profile = await getClientProfile(user.id)
      if (!profile?.stripeCustomerId) {
        setError('No Stripe customer ID found for this user.')
        setIsPending(false)
        return
      }
      const bookingData = {
        clientId: user.id,
        contractorId: selectedContractor,
        petIds: selectedPets,
        serviceType: serviceType || 'Dog Walking',
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
        paymentAmount: 50, // $50 for testing
        stripeCustomerId: profile.stripeCustomerId,
      }
      console.log('[booking] Creating booking with data:', bookingData)
      await addBooking(bookingData)
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
          />
          <label className="block text-sm font-medium mb-1 mt-2">Start Time</label>
          <Input
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            required
          />
          <label className="block text-sm font-medium mb-1 mt-2">End Time</label>
          <Input
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>
      {(startDate && startTime && endDate && endTime) && (
        <div className="mt-2 text-sm text-muted-foreground">
          You've selected: {new Date(`${startDate}T${startTime}`).toLocaleString()} to {new Date(`${endDate}T${endTime}`).toLocaleString()}
        </div>
      )}
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