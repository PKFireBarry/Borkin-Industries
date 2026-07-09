"use client"

import { Dialog } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Contractor } from '@/types/contractor'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getContractorServiceOfferings } from '@/lib/firebase/contractors'
import { getAllPlatformServices } from '@/lib/firebase/services'
import type { ContractorServiceOffering, PlatformService } from '@/types/service'
import { CompactAvailabilityCalendar } from '../components/compact-availability-calendar'
import { Badge } from '@/components/ui/badge'
import { Award, Calendar, DollarSign, Mail, MapPin, Star } from 'lucide-react'
import { getGigsForContractor } from '@/lib/firebase/bookings'
import type { Booking } from '@/types/booking'
import { ModalHeader } from '../components/modal-header'
import { ModalShell } from '../components/modal-shell'
import { MobileStepFooter } from '../components/mobile-step-footer'
import { SectionHeader } from '../components/section-header'
import { useSwipeSteps } from '@/hooks/use-swipe-steps'

interface ContractorProfileModalProps {
  contractor: Contractor | null
  open: boolean
  onClose: () => void
  onBookNow: (contractorId: string) => void
  clientLocation?: { address?: string; city?: string; state?: string; postalCode?: string } | null
}

const ContractorMap = dynamic(() => import('@/components/contractor-map'), { ssr: false })

const stepThemes = [
  {
    key: 'overview',
    label: 'Overview',
    accent: 'border-primary/10 bg-gradient-to-br from-primary/5 via-white to-blue-50',
    iconWrap: 'bg-primary/10 text-primary',
  },
  {
    key: 'services',
    label: 'Services',
    accent: 'border-blue-100 bg-gradient-to-br from-blue-50 to-white',
    iconWrap: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'availability',
    label: 'Availability',
    accent: 'border-purple-100 bg-gradient-to-br from-purple-50 to-white',
    iconWrap: 'bg-purple-100 text-purple-700',
  },
  {
    key: 'area',
    label: 'Area',
    accent: 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-white',
    iconWrap: 'bg-emerald-100 text-emerald-700',
  },
  {
    key: 'reviews',
    label: 'Reviews',
    accent: 'border-amber-100 bg-gradient-to-br from-amber-50 to-white',
    iconWrap: 'bg-amber-100 text-amber-700',
  },
] as const

export function ContractorProfileModal({ contractor, open, onClose, onBookNow, clientLocation }: ContractorProfileModalProps) {
  const [clientLatLng, setClientLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [serviceOfferings, setServiceOfferings] = useState<ContractorServiceOffering[]>([])
  const [platformServices, setPlatformServices] = useState<PlatformService[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const mobileScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!contractor || !clientLocation) return
    const query = [clientLocation.address, clientLocation.city, clientLocation.state, clientLocation.postalCode].filter(Boolean).join(', ')
    if (!query) return
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data[0]) setClientLatLng({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
      })
      .catch(() => setClientLatLng(null))
  }, [clientLocation, contractor])

  useEffect(() => {
    if (open && contractor) {
      const contractorId = contractor.id
      setIsLoadingServices(true)
      setIsLoadingBookings(true)
      setActiveStep(0)

      async function fetchData() {
        try {
          const [offerings, services, gigs] = await Promise.all([
            getContractorServiceOfferings(contractorId),
            getAllPlatformServices(),
            getGigsForContractor(contractorId),
          ])
          setServiceOfferings(offerings)
          setPlatformServices(services)
          const filteredBookings = gigs.filter((b) => b.status === 'pending' || b.status === 'approved' || b.status === 'completed')
          setBookings(filteredBookings)
        } catch (err) {
          console.error('Error fetching data:', err)
          setServiceOfferings([])
          setBookings([])
        } finally {
          setIsLoadingServices(false)
          setIsLoadingBookings(false)
        }
      }

      fetchData()
    } else {
      setServiceOfferings([])
      setIsLoadingServices(false)
      setBookings([])
      setIsLoadingBookings(false)
      setActiveStep(0)
    }
  }, [open, contractor])

  useEffect(() => {
    mobileScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeStep])

  if (!contractor) return null

  const validContractor = contractor

  const getServiceName = (serviceId: string) => platformServices.find((service) => service.id === serviceId)?.name || serviceId

  const getServiceDescription = (serviceId: string) => platformServices.find((service) => service.id === serviceId)?.description || ''

  const contractorName = validContractor.name || 'Contractor'
  const contractorInitial = contractorName ? contractorName[0].toUpperCase() : 'C'
  const contractorProfileImage = validContractor.profileImage || '/avatars/default.png'
  const contractorEmail = validContractor.email || ''
  const contractorLocation = [validContractor.city, validContractor.state].filter(Boolean).join(', ')
  const contractorDrivingRange = validContractor.drivingRange || 'N/A'
  const contractorBio = validContractor.bio || 'No bio provided.'

  const drivingRangeMiles = (() => {
    if (!validContractor.drivingRange) return 10
    const match = validContractor.drivingRange.match(/(\d+(?:\.\d+)?)/)
    return match ? parseFloat(match[1]) : 10
  })()

  const dailyAvailability = validContractor.availability?.dailyAvailability || []
  const unavailableDates = dailyAvailability.filter((day) => day.isFullyUnavailable).map((day) => day.date)

  const contractorRatings = validContractor.ratings || []
  const hasRatings = contractorRatings.length > 0
  const averageRating = hasRatings
    ? contractorRatings.reduce((sum, rating) => sum + rating.rating, 0) / contractorRatings.length
    : 0

  const steps = useMemo(
    () => [
      {
        ...stepThemes[0],
        content: (
          <div className={`h-full rounded-[1.75rem] border p-4 shadow-sm sm:p-6 ${stepThemes[0].accent}`}>
            <div className="flex h-full min-h-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              <div className="relative mx-auto sm:mx-0">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg sm:h-28 sm:w-28">
                  <AvatarImage src={contractorProfileImage} alt={contractorName} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-3xl font-bold text-primary sm:text-4xl">{contractorInitial}</AvatarFallback>
                </Avatar>
                {averageRating > 0 ? (
                  <div className="absolute -bottom-1 -right-1 rounded-full border border-primary/20 bg-white px-2 py-1 shadow-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-bold text-slate-700">{averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-4 text-center sm:text-left">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">At a glance</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">{contractorName}</h3>
                </div>

                <p className="mb-5 text-sm leading-6 text-slate-600">{contractorBio}</p>

                <div className="space-y-2.5 pt-2 text-xs text-slate-600 sm:text-sm">
                  {contractorEmail ? (
                    <div className="flex items-start justify-center gap-2 text-left sm:justify-start">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words">{contractorEmail}</span>
                    </div>
                  ) : null}

                  {contractorLocation ? (
                    <div className="flex items-start justify-center gap-2 text-left sm:justify-start">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words">{contractorLocation}</span>
                    </div>
                  ) : null}

                  <div className="flex items-start justify-center gap-2 text-left sm:justify-start">
                    <Award className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">Service range: {contractorDrivingRange} miles</span>
                  </div>
                </div>

                {hasRatings ? (
                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-600 sm:text-sm">
                      {contractorRatings.length} review{contractorRatings.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 sm:text-sm">New to Borkin. No reviews yet.</p>
                )}

                {serviceOfferings.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                    {serviceOfferings.slice(0, 4).map((offering, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="rounded-full border border-primary/20 bg-white/80 px-2.5 py-1 text-[11px] text-primary"
                      >
                        {getServiceName(offering.serviceId)}
                      </Badge>
                    ))}
                    {serviceOfferings.length > 4 ? (
                      <Badge
                        variant="secondary"
                        className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] text-slate-600"
                      >
                        +{serviceOfferings.length - 4} more
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ),
      },
      {
        ...stepThemes[1],
        content: (
          <div className={`h-full rounded-[1.75rem] border p-4 shadow-sm sm:p-6 ${stepThemes[1].accent}`}>
            <SectionHeader
              icon={<DollarSign className="h-4 w-4" />}
              title="Services & Pricing"
              description="Review offered services and current pricing."
              iconWrapClassName={stepThemes[1].iconWrap}
              descriptionClassName="mt-1 text-xs text-slate-500"
            />
            {isLoadingServices ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>Loading services...</span>
              </div>
            ) : serviceOfferings.length > 0 ? (
              <div className="space-y-3">
                {serviceOfferings.map((offering) => {
                  const serviceDescription = getServiceDescription(offering.serviceId)

                  return (
                    <div key={offering.serviceId} className="rounded-xl border border-blue-100 bg-white/95 p-3.5 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-slate-900 sm:text-[15px]">{getServiceName(offering.serviceId)}</h4>
                          {serviceDescription ? <p className="mt-1 text-sm text-slate-600">{serviceDescription}</p> : null}
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1 text-base font-bold text-primary sm:text-lg">
                            <DollarSign className="h-4 w-4" />
                            {(offering.price / 100).toFixed(2)}
                          </div>
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            {offering.paymentType === 'daily' ? 'per day' : 'one-time'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No specific services listed. Contact for custom pricing.</p>
            )}
          </div>
        ),
      },
      {
        ...stepThemes[2],
        content: (
          <div className={`h-full rounded-[1.75rem] border p-4 shadow-sm sm:p-6 ${stepThemes[2].accent}`}>
            <SectionHeader
              icon={<Calendar className="h-4 w-4" />}
              title="Availability"
              description="See blocked days before sending a request."
              iconWrapClassName={stepThemes[2].iconWrap}
              descriptionClassName="mt-1 text-xs text-slate-500"
            />
            {isLoadingBookings ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
                <span>Loading booked dates...</span>
              </div>
            ) : (
              <CompactAvailabilityCalendar unavailableDates={unavailableDates} bookings={bookings} />
            )}
            <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-3">
              <p className="text-center text-xs font-medium text-purple-700">
                Purple = booked (may be full-day or partial). Red = unavailable. Others are generally open.
              </p>
              <p className="mt-1 text-center text-xs text-purple-600">Specific times are confirmed during the booking process.</p>
            </div>
          </div>
        ),
      },
      {
        ...stepThemes[3],
        content: validContractor.locationLat && validContractor.locationLng ? (
          <div className={`h-full rounded-[1.75rem] border p-4 shadow-sm sm:p-6 ${stepThemes[3].accent}`}>
            <SectionHeader
              icon={<MapPin className="h-4 w-4" />}
              title="Service Area"
              description="Approximate coverage from the contractor's base location."
              iconWrapClassName={stepThemes[3].iconWrap}
              descriptionClassName="mt-1 text-xs text-slate-500"
            />
            <div className="h-64 w-full overflow-hidden rounded-[1.25rem] border border-white shadow-sm sm:h-80">
              <ContractorMap
                lat={validContractor.locationLat}
                lng={validContractor.locationLng}
                miles={drivingRangeMiles}
                clientLat={clientLatLng?.lat}
                clientLng={clientLatLng?.lng}
              />
            </div>
            <p className="mt-3 text-center text-xs text-slate-600">Service area covers approximately {contractorDrivingRange} miles from base location.</p>
          </div>
        ) : (
          <div className={`h-full rounded-[1.75rem] border p-4 shadow-sm sm:p-6 ${stepThemes[3].accent}`}>
            <SectionHeader
              icon={<MapPin className="h-4 w-4" />}
              title="Service Area"
              description="Approximate coverage details are not available yet."
              iconWrapClassName={stepThemes[3].iconWrap}
              descriptionClassName="mt-1 text-xs text-slate-500"
            />
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center sm:p-8">
              <MapPin className="mx-auto mb-2 h-10 w-10 text-slate-400 sm:h-12 sm:w-12" />
              <p className="text-slate-600">Location not set for map display</p>
              <p className="mt-1 text-sm text-slate-500">Contact for service area details</p>
            </div>
          </div>
        ),
      },
      {
        ...stepThemes[4],
        content: (
          <div className={`h-full rounded-[1.75rem] border p-4 shadow-sm sm:p-6 ${stepThemes[4].accent}`}>
            <SectionHeader
              icon={<Star className="h-4 w-4" />}
              title="Reviews & Ratings"
              description="What past clients have shared about working together."
              iconWrapClassName={stepThemes[4].iconWrap}
              descriptionClassName="mt-1 text-xs text-slate-500"
            />
            {hasRatings ? (
              <div className="space-y-3">
                {contractorRatings.slice(0, 5).map((review, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {review.date && !isNaN(new Date(review.date).getTime()) ? new Date(review.date).toLocaleDateString() : 'Date not available'}
                      </span>
                    </div>
                    {review.comment ? <p className="mb-2 text-sm leading-relaxed text-slate-700">"{review.comment}"</p> : null}
                    {review.contractorFeedback ? (
                      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge variant="outline" className="border-blue-300 bg-blue-100 text-[10px] text-blue-700">
                            Contractor Response
                          </Badge>
                          <span className="text-[11px] text-blue-600">
                            {review.contractorFeedback.date && !isNaN(new Date(review.contractorFeedback.date).getTime())
                              ? new Date(review.contractorFeedback.date).toLocaleDateString()
                              : ''}
                          </span>
                        </div>
                        <p className="text-sm italic text-blue-700">"{review.contractorFeedback.comment}"</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center sm:p-8">
                <Star className="mx-auto mb-2 h-10 w-10 text-slate-400 sm:h-12 sm:w-12" />
                <p className="font-medium text-slate-600">No reviews yet</p>
                <p className="mt-1 text-sm text-slate-500">Be the first to book and leave a review!</p>
              </div>
            )}
          </div>
        ),
      },
    ],
    [
      averageRating,
      bookings,
      clientLatLng?.lat,
      clientLatLng?.lng,
      contractorBio,
      contractorDrivingRange,
      contractorEmail,
      contractorInitial,
      contractorLocation,
      contractorName,
      contractorProfileImage,
      contractorRatings,
      drivingRangeMiles,
      getServiceDescription,
      hasRatings,
      isLoadingBookings,
      isLoadingServices,
      serviceOfferings,
      unavailableDates,
      validContractor.locationLat,
      validContractor.locationLng,
    ]
  )

  const activeStepData = steps[activeStep] || steps[0]

  const handlePreviousStep = () => {
    setActiveStep((step) => Math.max(step - 1, 0))
  }

  const handleNextStep = () => {
    setActiveStep((step) => Math.min(step + 1, steps.length - 1))
  }

  const { onTouchStart: handleStepTouchStart, onTouchMove: handleStepTouchMove, onTouchEnd: handleStepTouchEnd } = useSwipeSteps({
    step: activeStep,
    maxStep: steps.length - 1,
    threshold: 60,
    onNext: handleNextStep,
    onPrevious: handlePreviousStep,
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <ModalShell aria-labelledby="contractorProfileTitle">
        <div className="flex h-full min-h-0 flex-col">
          <ModalHeader
            eyebrow="Contractor profile"
            title={contractorName}
            description="Review services, availability, coverage, and reviews before sending a request."
            titleId="contractorProfileTitle"
            onClose={onClose}
            closeAriaLabel="Close contractor profile"
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="flex h-full min-h-0 flex-col sm:hidden">
              <div className="min-h-0 flex-1 px-4 pb-5 pt-4">
                <div className="flex h-full min-h-0 flex-col">
                  <div
                    ref={mobileScrollRef}
                    className="min-h-0 flex-1 overflow-y-auto"
                    onTouchStart={handleStepTouchStart}
                    onTouchMove={handleStepTouchMove}
                    onTouchEnd={handleStepTouchEnd}
                  >
                    {activeStepData.content}
                  </div>
                </div>
              </div>

              <MobileStepFooter
                step={activeStep}
                maxStep={steps.length - 1}
                onBack={handlePreviousStep}
                onNext={handleNextStep}
                onClose={onClose}
                finalActionLabel="Request Booking"
                onFinalAction={() => onBookNow(validContractor.id)}
              />
            </div>

            <div className="hidden h-full min-h-0 sm:flex sm:flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-6 p-6">
                  <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
                    <div className="space-y-4">
                      {steps[0].content}
                      {steps[1].content}
                      {steps[2].content}
                    </div>
                    <div className="space-y-4">
                      {steps[3].content}
                      {steps[4].content}
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white/95 p-6">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="petCta"
                    size="pill"
                    className="h-12 flex-1 rounded-2xl text-base"
                    onClick={() => onBookNow(validContractor.id)}
                    type="button"
                  >
                    Request Booking
                  </Button>
                  <Button
                    variant="outline"
                    size="pill"
                    className="h-12 flex-1 rounded-2xl border-slate-200 text-base"
                    onClick={onClose}
                    type="button"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalShell>
    </Dialog>
  )
}
