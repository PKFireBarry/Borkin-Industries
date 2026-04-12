'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getAllContractors, getContractorServiceOfferings } from '@/lib/firebase/contractors'
import { getAllPlatformServices } from '@/lib/firebase/services'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import type { Contractor } from '@/types/contractor'
import type { PlatformService, ContractorServiceOffering } from '@/types/service'
import { ContractorProfileModal } from './contractor-profile-modal'
import { BookingRequestForm } from '../bookings/booking-request-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useRequireRole } from '../use-require-role'
import { useProfileValidation } from '@/hooks/use-profile-validation'
import { ProfileValidationModal } from '@/components/profile-validation-modal'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useUser } from '@clerk/nextjs'
import { getClientProfile } from '@/lib/firebase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DashboardPageContent, DashboardPageHeader, DashboardPageShell } from '../components/dashboard-shell'
import { EmptyState } from '../components/empty-state'
import { MapPin, Star, Filter, Search, X } from 'lucide-react'

interface ContractorWithServices extends Contractor {
  serviceOfferings: ContractorServiceOffering[]
}

const isFullDaySlot = (start: string, end: string) => start === '00:00' && (end === '23:59' || end === '24:00')

const isContractorAvailableOnDate = (contractor: Contractor, date: string) => {
  const availability = contractor.availability || {}
  const unavailableDates = availability.unavailableDates || []
  const dailyAvailability = availability.dailyAvailability || []

  if (unavailableDates.includes(date)) {
    return false
  }

  const day = dailyAvailability.find((entry) => entry.date === date)
  if (!day) {
    return true
  }

  if (day.isFullyUnavailable) {
    return false
  }

  if ((day.unavailableSlots || []).some((slot) => isFullDaySlot(slot.startTime, slot.endTime))) {
    return false
  }

  return true
}

function ContractorsPageContent() {
  // All Hooks must be called at the top level, before any conditional returns.
  const { isLoaded, isAuthorized } = useRequireRole('client')
  const { user } = useUser()
  const searchParams = useSearchParams()

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null)
  const [contractors, setContractors] = useState<ContractorWithServices[]>([])
  const [platformServices, setPlatformServices] = useState<PlatformService[]>([])
  const [filterService, setFilterService] = useState('all')
  const [filterDate, setFilterDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [bookingForContractorId, setBookingForContractorId] = useState<string | null>(null)
  const [clientLocation, setClientLocation] = useState<{ address?: string; city?: string; state?: string; postalCode?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const { validateBeforeBooking, isValidationModalOpen, validationError, closeValidationModal } = useProfileValidation()
  const initialContractorId = searchParams.get('contractorId')
  const [hasHandledInitialContractorId, setHasHandledInitialContractorId] = useState(false)

  // Moved useEffect Hooks before the early return
  // Fetch contractors and platform services on mount
  React.useEffect(() => {
    if (isAuthorized && user) {
      const fetchData = async () => {
        try {
          setLoading(true)
          
          // Fetch platform services and contractors in parallel
          const [servicesData, contractorsData] = await Promise.all([
            getAllPlatformServices(),
            getAllContractors()
          ])
          
          // Filter for approved contractors only
          const approvedContractors = contractorsData.filter(
            contractor => contractor.application?.status === 'approved'
          )
          
          // Fetch service offerings for each approved contractor
          const contractorsWithServices = await Promise.all(
            approvedContractors.map(async (contractor) => {
              const serviceOfferings = await getContractorServiceOfferings(contractor.id)
              return {
                ...contractor,
                serviceOfferings
              }
            })
          )
          
          setPlatformServices(servicesData)
          setContractors(contractorsWithServices)
        } catch (error) {
          console.error('Error fetching contractors and services:', error)
        } finally {
          setLoading(false)
        }
      }
      
      fetchData()
    }
  }, [isAuthorized, user])

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

  useEffect(() => {
    if (!initialContractorId || hasHandledInitialContractorId || contractors.length === 0 || modalOpen) return
    const matchedContractor = contractors.find((contractor) => contractor.id === initialContractorId)
    if (matchedContractor) {
      setSelectedContractor(matchedContractor)
      setModalOpen(true)
      setHasHandledInitialContractorId(true)
    }
  }, [initialContractorId, contractors, hasHandledInitialContractorId, modalOpen])

  // Early return after all Hooks have been declared
  if (!isLoaded || !isAuthorized || loading) {
    return (
      <DashboardPageShell className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/60">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="font-medium text-slate-600">Finding amazing pet care professionals...</p>
        </div>
      </DashboardPageShell>
    )
  }

  // Get service name by ID
  const getServiceName = (serviceId: string) => {
    return platformServices.find(s => s.id === serviceId)?.name || 'Unknown Service'
  }

  // Enhanced filtering with search
  const filteredContractors = contractors.filter(c => {
    // Filter by service - check if contractor offers the selected service
    const matchesService = !filterService || filterService === 'all' || 
      c.serviceOfferings.some(offering => offering.serviceId === filterService)
    
    // Match current availability model including full-day dailyAvailability blocks
    const matchesDate = !filterDate || isContractorAvailableOnDate(c, filterDate)
    
    // Search in name, location, bio, and offered services
    const matchesSearch = !searchQuery || 
      (c.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.city?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.state?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.bio?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.serviceOfferings.some(offering => 
        getServiceName(offering.serviceId).toLowerCase().includes(searchQuery.toLowerCase())
      )
    
    return matchesService && matchesDate && matchesSearch
  })

  const handleOpenModal = (contractor: Contractor) => {
    setSelectedContractor(contractor)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedContractor(null)
  }

  const handleBookNowFromModal = async (contractorId: string) => {
    const isValid = await validateBeforeBooking()
    if (isValid) {
      setModalOpen(false)
      setSelectedContractor(null)
      setBookingForContractorId(contractorId)
      setIsBookingOpen(true)
    }
  }

  const handleBookingClose = () => {
    setIsBookingOpen(false)
    setBookingForContractorId(null)
  }

  const clearAllFilters = () => {
    setFilterService('all')
    setFilterDate('')
    setSearchQuery('')
  }

  const hasActiveFilters = (filterService && filterService !== 'all') || filterDate || searchQuery
  const activeFilterCount = [filterService !== 'all' ? filterService : null, filterDate, searchQuery].filter(Boolean).length

  // Calculate average rating for a contractor
  const getAverageRating = (contractor: Contractor) => {
    if (!contractor.ratings || contractor.ratings.length === 0) return 0
    const sum = contractor.ratings.reduce((acc, rating) => acc + rating.rating, 0)
    return sum / contractor.ratings.length
  }

  return (
    <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/60">
      <DashboardPageContent className="space-y-4 pb-8 pt-4 sm:space-y-6 sm:pb-10 sm:pt-6 lg:pb-12">
        <DashboardPageHeader
          variant="summary"
          title="Find your next pet care professional"
          description="Connect with trusted, experienced pet care specialists in your area. From daily walks to specialized care, find the right fit for your pets without digging through oversized cards."
          eyebrow={
            <>
              <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
                Find contractors
              </Badge>
              <Badge variant="secondary" className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                {contractors.length} approved pros
              </Badge>
            </>
          }
          meta={
            <div className="flex flex-col gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by name, location, or service"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10 pr-10 text-sm shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="pill"
                  onClick={() => setShowFilters((current) => !current)}
                  className="h-11 rounded-2xl border-slate-200 bg-white/80 px-4 text-sm text-slate-700 hover:bg-white"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {hasActiveFilters ? (
                    <Badge variant="secondary" className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">
                      {activeFilterCount}
                    </Badge>
                  ) : null}
                </Button>

                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="pill"
                    onClick={clearAllFilters}
                    className="h-11 rounded-2xl px-3 text-sm text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                ) : null}
              </div>

              {showFilters ? (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <Filter className="h-3.5 w-3.5" />
                      Service type
                    </label>
                    <Select value={filterService} onValueChange={setFilterService}>
                      <SelectTrigger className="h-11 rounded-2xl border-blue-100 bg-white/85 text-sm shadow-none">
                        <SelectValue placeholder="All services" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Services</SelectItem>
                        {platformServices.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Available date</label>
                    <Input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="h-11 rounded-2xl border-purple-100 bg-white/85 text-sm shadow-none"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          }
        />

          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200/70 bg-white/70 p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900 sm:text-xl">
              {filteredContractors.length} professional{filteredContractors.length !== 1 ? 's' : ''} available
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {hasActiveFilters ? 'Showing filtered results for your current search.' : 'Browse all approved pet care professionals currently available to book.'}
            </p>
          </div>

          {hasActiveFilters ? (
            <div className="flex flex-wrap gap-2">
              {filterService !== 'all' ? (
                <Badge variant="secondary" className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
                  {getServiceName(filterService)}
                </Badge>
              ) : null}
              {filterDate ? (
                <Badge variant="secondary" className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700">
                  {filterDate}
                </Badge>
              ) : null}
              {searchQuery ? (
                <Badge variant="secondary" className="max-w-[16rem] truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-700">
                  {searchQuery}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>

        {filteredContractors.length === 0 ? (
          <EmptyState
            icon={<Search className="h-6 w-6 text-slate-400" />}
            title="No professionals found"
            description="Try adjusting your search criteria or clearing filters to see more results."
            iconInCircle
            iconWrapperClassName="h-14 w-14 bg-slate-100"
            className="py-14"
          >
            {hasActiveFilters ? (
              <Button type="button" onClick={clearAllFilters} variant="outline" size="pill">
                Clear all filters
              </Button>
            ) : null}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredContractors.map((contractor) => {
              const averageRating = getAverageRating(contractor)
              const reviewCount = contractor.ratings?.length || 0
              const accentShell = [
                'border-pink-100 bg-gradient-to-br from-pink-50 via-white to-white',
                'border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white',
                'border-purple-100 bg-gradient-to-br from-purple-50 via-white to-white',
                'border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white',
                'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white',
              ][filteredContractors.indexOf(contractor) % 5]

              return (
                <Card
                  key={contractor.id}
                  className={`group cursor-pointer rounded-[1.6rem] border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${accentShell}`}
                  onClick={() => handleOpenModal(contractor)}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white shadow-sm sm:h-20 sm:w-20">
                        <AvatarImage src={contractor.profileImage || '/avatars/default.png'} alt={contractor.name || 'Contractor'} className="object-cover" />
                        <AvatarFallback className="rounded-2xl bg-primary/10 text-lg font-semibold text-primary sm:text-xl">
                          {contractor.name ? contractor.name[0].toUpperCase() : 'C'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-slate-900 transition-colors group-hover:text-primary sm:text-lg">
                              {contractor.name || 'Unnamed Contractor'}
                            </h3>
                            {(contractor.city || contractor.state) ? (
                              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 sm:text-sm">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{[contractor.city, contractor.state].filter(Boolean).join(', ')}</span>
                              </div>
                            ) : null}
                          </div>

                          {averageRating > 0 ? (
                            <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              {averageRating.toFixed(1)}
                            </div>
                          ) : null}
                        </div>

                        {reviewCount > 0 ? (
                          <div className="flex items-center gap-1 text-xs text-slate-500 sm:text-sm">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-medium text-slate-700">{averageRating.toFixed(1)}</span>
                            <span>{reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 sm:text-sm">New to Borkin. No reviews yet.</p>
                        )}
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {contractor.bio || contractor.experience?.substring(0, 100) || 'Experienced pet care professional dedicated to providing thoughtful support for your furry family.'}
                    </p>

                    {contractor.serviceOfferings && contractor.serviceOfferings.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {contractor.serviceOfferings.slice(0, 3).map((offering, index) => (
                          <Badge key={index} variant="secondary" className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
                            {getServiceName(offering.serviceId)}
                          </Badge>
                        ))}
                        {contractor.serviceOfferings.length > 3 ? (
                          <Badge variant="secondary" className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                            +{contractor.serviceOfferings.length - 3} more
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between rounded-xl border border-white/80 bg-white/75 px-3 py-2 text-xs text-slate-500">
                      <span>Service range</span>
                      <span className="font-medium text-slate-700">{contractor.drivingRange ? `${contractor.drivingRange} miles` : 'Contact for details'}</span>
                    </div>

                    <Button
                      type="button"
                      variant="petCta"
                      size="pill"
                      className="mt-4 h-10 w-full rounded-xl text-sm"
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
      </DashboardPageContent>

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

      {/* Profile Validation Modal */}
      {validationError && (
        <ProfileValidationModal
          isOpen={isValidationModalOpen}
          onClose={closeValidationModal}
          error={validationError}
        />
      )}
    </DashboardPageShell>
  )
}

export default function ContractorsPageWrapper() {
  return (
    <Suspense fallback={null}>
      <ContractorsPageContent />
    </Suspense>
  )
} 
