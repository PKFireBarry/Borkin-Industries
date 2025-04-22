'use client'

import React, { useState } from 'react'
import { getAllContractors } from '@/lib/firebase/contractors'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import type { Contractor } from '@/types/contractor'
import { ContractorAvailabilityModal } from './contractor-availability-modal'
import { BookingRequestForm } from '../bookings/booking-request-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function ContractorsPageWrapper() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null)
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [filterSkill, setFilterSkill] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [preselectedContractorId, setPreselectedContractorId] = useState<string | null>(null)

  // Fetch contractors on mount (client component)
  React.useEffect(() => {
    getAllContractors().then(setContractors)
  }, [])

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

  const handleBookNow = (contractor: Contractor) => {
    setPreselectedContractorId(contractor.id)
    setIsBookingOpen(true)
  }

  const handleBookingClose = () => {
    setIsBookingOpen(false)
    setPreselectedContractorId(null)
  }

  return (
    <main className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Available Contractors</h1>
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
        <div className="text-muted-foreground">No contractors found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredContractors.map((contractor) => (
            <Card key={contractor.id}>
              <CardContent>
                <CardTitle>{contractor.name}</CardTitle>
                <div className="mb-1 text-xs">Experience: <span className="font-medium">{contractor.experience}</span></div>
                <div className="mb-1 text-xs">Driving Range: <span className="font-medium">{contractor.drivingRange}</span></div>
                <div className="mb-2 text-sm text-muted-foreground">
                  {contractor.veterinarySkills?.join(', ') || 'No skills listed'}
                </div>
                <div className="mb-2 text-xs">Rating: {contractor.ratings?.length ? (contractor.ratings.reduce((sum, r) => sum + r.rating, 0) / contractor.ratings.length).toFixed(1) : 'N/A'}</div>
                <div className="mb-2 text-xs">
                  {contractor.ratings && contractor.ratings.length > 0 ? (
                    contractor.ratings.slice(-2).reverse().map((review, idx) => (
                      <div key={idx} className="mb-1 p-2 bg-muted rounded">
                        <span className="font-semibold text-yellow-600">{review.rating}★</span>
                        {review.comment && <span className="ml-2">{review.comment}</span>}
                        <span className="ml-2 text-xs text-muted-foreground">{new Date(review.date).toLocaleDateString()}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No reviews yet.</span>
                  )}
                </div>
                <button
                  className="mt-2 px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
                  onClick={() => handleOpenModal(contractor)}
                  type="button"
                >
                  View Availability
                </button>
                <button
                  className="mt-2 ml-2 px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-xs font-medium"
                  onClick={() => handleBookNow(contractor)}
                  type="button"
                >
                  Book Now
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {selectedContractor && (
        <ContractorAvailabilityModal
          contractor={selectedContractor}
          open={modalOpen}
          onClose={handleCloseModal}
        />
      )}
      {isBookingOpen && (
        <Dialog open={isBookingOpen} onOpenChange={handleBookingClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Booking for Contractor</DialogTitle>
            </DialogHeader>
            <BookingRequestForm onSuccess={handleBookingClose} preselectedContractorId={preselectedContractorId} />
          </DialogContent>
        </Dialog>
      )}
    </main>
  )
} 