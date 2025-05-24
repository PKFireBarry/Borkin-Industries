'use client'

import React, { useState } from 'react'
import { getAllContractors } from '@/lib/firebase/contractors'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import type { Contractor } from '@/types/contractor'
import { ContractorProfileModal } from './contractor-profile-modal'
import { BookingRequestForm } from '../bookings/booking-request-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useRequireRole } from '../use-require-role'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useUser } from '@clerk/nextjs'
import { getClientProfile } from '@/lib/firebase/client'

export default function ContractorsPageWrapper() {
  // All Hooks must be called at the top level, before any conditional returns.
  const { isLoaded, isAuthorized } = useRequireRole('client')
  const { user } = useUser()

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null)
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [filterSkill, setFilterSkill] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [bookingForContractorId, setBookingForContractorId] = useState<string | null>(null)
  const [clientLocation, setClientLocation] = useState<{ address?: string; city?: string; state?: string; postalCode?: string } | null>(null)

  // Moved useEffect Hooks before the early return
  // Fetch contractors on mount (client component)
  React.useEffect(() => {
    // Ensure this effect only runs when authorized and user is available if needed
    if (isAuthorized && user) {
        getAllContractors().then(setContractors)
    }
  }, [isAuthorized, user]) // Added dependencies

  // Fetch client location on mount
  React.useEffect(() => {
    if (!user || !isAuthorized) return // Guard condition
    getClientProfile(user.id).then(profile => {
      if (profile) setClientLocation({
        address: profile.address,
        city: profile.city,
        state: profile.state,
        postalCode: profile.postalCode,
      })
    })
  }, [user, isAuthorized]) // Added isAuthorized dependency

  // Early return after all Hooks have been declared
  if (!isLoaded || !isAuthorized) {
    // It's good practice to return a consistent loading/skeleton UI here 
    // instead of null if the page has a defined layout, but null is fine for now.
    return null
  }

  // Get all unique skills for filter dropdown
  const allSkills = Array.from(new Set(contractors.flatMap(c => c.veterinarySkills || [])))

  // Filter contractors by skill and date
  const filteredContractors = contractors.filter(c => {
    const matchesSkill = !filterSkill || (c.veterinarySkills || []).includes(filterSkill)
    const matchesDate = !filterDate || (c.availability?.availableSlots || []).some(slot => slot.slice(0, 10) === filterDate)
    return matchesSkill && matchesDate
  })

  const handleOpenModal = (contractor: Contractor) => {
    setSelectedContractor(contractor)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedContractor(null)
  }

  const handleBookNowFromModal = (contractorId: string) => {
    setModalOpen(false)
    setSelectedContractor(null)
    setBookingForContractorId(contractorId)
    setIsBookingOpen(true)
  }

  const handleBookingClose = () => {
    setIsBookingOpen(false)
    setBookingForContractorId(null)
  }

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Available Contractors</h1>
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">Service Type</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={filterSkill}
            onChange={e => setFilterSkill(e.target.value)}
          >
            <option value="">All</option>
            {allSkills.map(skill => (
              <option key={skill} value={skill}>{skill}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Available On</label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
        </div>
        {(filterSkill || filterDate) && (
          <button
            className="ml-2 px-3 py-1 rounded bg-muted text-xs hover:bg-muted/80"
            onClick={() => { setFilterSkill(''); setFilterDate('') }}
            type="button"
          >
            Clear Filters
          </button>
        )}
      </div>
      {filteredContractors.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No contractors found matching your criteria.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredContractors.map((contractor) => (
            <Card key={contractor.id} className="flex flex-col bg-white shadow-lg rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-5 flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4 border-4 border-primary/20 shadow-md">
                  <AvatarImage src={contractor.profileImage || '/avatars/default.png'} alt={contractor.name || 'Contractor'} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {contractor.name ? contractor.name[0].toUpperCase() : 'C'}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl font-semibold text-gray-900 mb-1">{contractor.name || 'Unnamed Contractor'}</CardTitle>
                {(contractor.city || contractor.state) && (
                  <p className="text-xs text-gray-500 mb-2">
                    {[contractor.city, contractor.state].filter(Boolean).join(', ')}
                  </p>
                )}
                 <p className="text-xs text-gray-500 mb-3">
                  Driving Range: <span className="font-medium text-gray-700">{contractor.drivingRange || 'N/A'}</span>
                </p>
                <p className="text-sm text-gray-600 mb-4 min-h-[40px] line-clamp-2">
                  {contractor.bio || contractor.experience?.substring(0,100) || 'Experienced pet care professional.'}
                </p>
              </div>

              <div className="mt-auto p-4 border-t">
                <button
                  className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-md transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
                  onClick={() => handleOpenModal(contractor)}
                  type="button"
                >
                  View Profile & Book
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {modalOpen && selectedContractor && (
        <ContractorProfileModal
          contractor={selectedContractor}
          open={modalOpen} 
          onClose={handleCloseModal}
          onBookNow={handleBookNowFromModal}
          clientLocation={clientLocation}
        />
      )}
      {isBookingOpen && (
        <Dialog open={isBookingOpen} onOpenChange={handleBookingClose}>
          <DialogContent 
            className="max-w-2xl"
            aria-labelledby="bookingRequestTitle"
          >
            <DialogHeader>
              <DialogTitle id="bookingRequestTitle">New Booking Request</DialogTitle>
              <DialogDescription id="bookingRequestDescription" className="sr-only">
                Submit a new booking request for the selected contractor.
              </DialogDescription>
            </DialogHeader>
            <BookingRequestForm 
                onSuccess={handleBookingClose} 
                preselectedContractorId={bookingForContractorId} 
            />
          </DialogContent>
        </Dialog>
      )}
    </main>
  )
} 