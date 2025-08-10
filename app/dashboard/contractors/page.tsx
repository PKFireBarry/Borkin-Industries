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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Star, Calendar, Filter, Search, X } from 'lucide-react'

export default function ContractorsPageWrapper() {
  // All Hooks must be called at the top level, before any conditional returns.
  const { isLoaded, isAuthorized } = useRequireRole('client')
  const { user } = useUser()

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null)
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [filterSkill, setFilterSkill] = useState('all')
  const [filterDate, setFilterDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [bookingForContractorId, setBookingForContractorId] = useState<string | null>(null)
  const [clientLocation, setClientLocation] = useState<{ address?: string; city?: string; state?: string; postalCode?: string } | null>(null)
  const [showFilters, setShowFilters] = useState(false)

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Finding amazing pet care professionals...</p>
        </div>
      </div>
    )
  }

  // Get all unique skills for filter dropdown
  const allSkills = Array.from(new Set(contractors.flatMap(c => c.veterinarySkills || [])))

  // Enhanced filtering with search
  const filteredContractors = contractors.filter(c => {
    const matchesSkill = !filterSkill || filterSkill === 'all' || (c.veterinarySkills || []).includes(filterSkill)
    // Check if the selected date is NOT in the contractor's unavailable dates
    const matchesDate = !filterDate || !(c.availability?.unavailableDates || []).includes(filterDate)
    const matchesSearch = !searchQuery || 
      (c.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.city?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.state?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.bio?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.veterinarySkills || []).some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
    
    // Debug logging for date filtering (remove this after testing)
    if (filterDate && process.env.NODE_ENV === 'development') {
      console.log(`Contractor ${c.name}: unavailable dates:`, c.availability?.unavailableDates, 
                  `Selected date: ${filterDate}, Available: ${matchesDate}`)
    }
    
    return matchesSkill && matchesDate && matchesSearch
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

  const clearAllFilters = () => {
    setFilterSkill('all')
    setFilterDate('')
    setSearchQuery('')
  }

  const hasActiveFilters = (filterSkill && filterSkill !== 'all') || filterDate || searchQuery

  // Calculate average rating for a contractor
  const getAverageRating = (contractor: Contractor) => {
    if (!contractor.ratings || contractor.ratings.length === 0) return 0
    const sum = contractor.ratings.reduce((acc, rating) => acc + rating.rating, 0)
    return sum / contractor.ratings.length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200/60">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              Find Your Perfect
              <span className="text-primary block md:inline md:ml-3">Pet Care Professional</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Connect with trusted, experienced pet care specialists in your area. 
              From daily walks to specialized care, find the perfect match for your furry family.
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mb-6">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search by name, location, or services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg border-2 border-slate-200 rounded-2xl focus:border-primary focus:ring-0 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="rounded-full px-6 py-2 border-2 hover:bg-slate-50 transition-all duration-200"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 px-2 py-0.5 text-xs">
                  {[filterSkill, filterDate, searchQuery].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters Section */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-8 transition-all duration-300">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Service Type</label>
                <Select value={filterSkill} onValueChange={setFilterSkill}>
                  <SelectTrigger className="rounded-xl border-2 border-slate-200">
                    <SelectValue placeholder={filterSkill === 'all' ? 'All Services' : (allSkills.find(skill => skill === filterSkill) || 'All Services')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {allSkills.map(skill => (
                      <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Available Date</label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="rounded-xl border-2 border-slate-200"
                />
              </div>
              
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="rounded-xl px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {filteredContractors.length} Professional{filteredContractors.length !== 1 ? 's' : ''} Available
            </h2>
            <p className="text-slate-600 mt-1">
              {hasActiveFilters ? 'Filtered results' : 'All available pet care professionals'}
            </p>
          </div>
        </div>

        {/* Contractors Grid */}
        {filteredContractors.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No professionals found</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Try adjusting your search criteria or clearing filters to see more results.
            </p>
            {hasActiveFilters && (
              <Button onClick={clearAllFilters} variant="outline" className="rounded-full">
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredContractors.map((contractor) => {
              const averageRating = getAverageRating(contractor)
              const reviewCount = contractor.ratings?.length || 0
              
              return (
                <Card 
                  key={contractor.id} 
                  className="group bg-white border-0 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer transform hover:-translate-y-1"
                  onClick={() => handleOpenModal(contractor)}
                >
                  {/* Image Section */}
                  <div className="relative h-48 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center overflow-hidden">
                    <Avatar className="w-24 h-24 border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <AvatarImage 
                        src={contractor.profileImage || '/avatars/default.png'} 
                        alt={contractor.name || 'Contractor'} 
                        className="object-cover" 
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                        {contractor.name ? contractor.name[0].toUpperCase() : 'C'}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Rating Badge */}
                    {averageRating > 0 && (
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-semibold text-slate-700">
                          {averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="mb-4">
                      <CardTitle className="text-xl font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">
                        {contractor.name || 'Unnamed Contractor'}
                      </CardTitle>
                      
                      {/* Location */}
                      {(contractor.city || contractor.state) && (
                        <div className="flex items-center text-slate-500 text-sm mb-2">
                          <MapPin className="w-4 h-4 mr-1" />
                          {[contractor.city, contractor.state].filter(Boolean).join(', ')}
                        </div>
                      )}

                      {/* Reviews */}
                      {reviewCount > 0 && (
                        <div className="flex items-center text-slate-500 text-sm">
                          <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium text-slate-700">{averageRating.toFixed(1)}</span>
                          <span className="ml-1">({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
                        </div>
                      )}
                    </div>

                    {/* Bio */}
                    <p className="text-slate-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                      {contractor.bio || contractor.experience?.substring(0,100) || 'Experienced pet care professional dedicated to providing the best care for your furry friends.'}
                    </p>

                    {/* Skills */}
                    {contractor.veterinarySkills && contractor.veterinarySkills.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {contractor.veterinarySkills.slice(0, 3).map((skill, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="text-xs px-2 py-1 bg-primary/10 text-primary border-0 rounded-full"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {contractor.veterinarySkills.length > 3 && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs px-2 py-1 bg-slate-100 text-slate-600 border-0 rounded-full"
                            >
                              +{contractor.veterinarySkills.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Driving Range */}
                    <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                      <span>Service Range:</span>
                      <span className="font-medium text-slate-700">{contractor.drivingRange || 'Contact for details'}</span>
                    </div>

                    {/* CTA Button */}
                    <Button 
                      className="w-full rounded-xl font-semibold py-3 bg-primary hover:bg-primary/90 text-white shadow-sm hover:shadow-md transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenModal(contractor)
                      }}
                    >
                      View Profile & Book
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
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
            className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-2xl"
            aria-labelledby="bookingRequestTitle"
          >
            <DialogHeader>
              <DialogTitle id="bookingRequestTitle" className="text-2xl font-bold">New Booking Request</DialogTitle>
              <DialogDescription id="bookingRequestDescription" className="sr-only">
                Submit a new booking request for the selected contractor.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
              <BookingRequestForm 
                  onSuccess={handleBookingClose} 
                  preselectedContractorId={bookingForContractorId} 
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 