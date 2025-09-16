"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { Contractor } from '@/types/contractor'
import * as React from 'react'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button";
import { getContractorServiceOfferings } from "@/lib/firebase/contractors";
import { getAllPlatformServices } from "@/lib/firebase/services";
import type { ContractorServiceOffering, PlatformService } from "@/types/service";
import { CompactAvailabilityCalendar } from '../components/compact-availability-calendar';
import { Badge } from '@/components/ui/badge'
import { MapPin, Star, Calendar, Mail, DollarSign, Clock, Award } from 'lucide-react'
import { getGigsForContractor } from "@/lib/firebase/bookings";
import type { Booking } from '@/types/booking'

interface ContractorProfileModalProps {
  contractor: Contractor | null
  open: boolean
  onClose: () => void
  onBookNow: (contractorId: string) => void
  clientLocation?: { address?: string; city?: string; state?: string; postalCode?: string } | null
}

const ContractorMap = dynamic(() => import('@/components/contractor-map'), { ssr: false })

export function ContractorProfileModal({ contractor, open, onClose, onBookNow, clientLocation }: ContractorProfileModalProps) {
  const [clientLatLng, setClientLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [serviceOfferings, setServiceOfferings] = useState<ContractorServiceOffering[]>([])
  const [platformServices, setPlatformServices] = useState<PlatformService[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)

  useEffect(() => {
    if (!contractor || !clientLocation) return
    const query = [clientLocation.address, clientLocation.city, clientLocation.state, clientLocation.postalCode].filter(Boolean).join(', ')
    if (!query) return
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data[0]) setClientLatLng({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
      })
      .catch(() => setClientLatLng(null))
  }, [clientLocation, contractor])

  useEffect(() => {
    if (open && contractor) {
      setIsLoadingServices(true)
      setIsLoadingBookings(true)
      async function fetchData() {
        try {
          const [offerings, services, gigs] = await Promise.all([
            getContractorServiceOfferings(contractor!.id),
            getAllPlatformServices(),
            getGigsForContractor(contractor!.id)
          ]);
          setServiceOfferings(offerings);
          setPlatformServices(services);
          // Include pending bookings as they should also show as blocked on calendar
          const filteredBookings = gigs.filter(b => b.status === 'pending' || b.status === 'approved' || b.status === 'completed')
          setBookings(filteredBookings)
        } catch (err) {
          console.error("Error fetching data:", err);
          setServiceOfferings([]);
          setBookings([])
        } finally {
          setIsLoadingServices(false);
          setIsLoadingBookings(false)
        }
      }
      fetchData();
    } else {
      setServiceOfferings([]);
      setIsLoadingServices(false);
      setBookings([])
      setIsLoadingBookings(false)
    }
  }, [open, contractor])

  // Now do the return if contractor is null
  if (!contractor) return null;

  // At this point, we know contractor is not null
  const validContractor = contractor;

  // Helper to get service name - assumes serviceOfferings might have denormalized name,
  // or falls back to serviceId. A proper shared utility for platform services is better long-term.
  const getServiceName = (serviceId: string) => 
    platformServices.find(ps => ps.id === serviceId)?.name || serviceId;
  
  const getServiceDescription = (serviceId: string) => 
    platformServices.find(ps => ps.id === serviceId)?.description || '';

  // Safely access contractor properties to avoid null reference errors
  const contractorName = validContractor.name || 'Contractor';
  const contractorInitial = contractorName ? contractorName[0].toUpperCase() : 'C';
  const contractorProfileImage = validContractor.profileImage || '/avatars/default.png';
  const contractorEmail = validContractor.email || '';
  const contractorLocation = [validContractor.city, validContractor.state].filter(Boolean).join(', ');
  const contractorDrivingRange = validContractor.drivingRange || 'N/A';
  const contractorBio = validContractor.bio || 'No bio provided.';

  // Calculate driving range in miles
  const drivingRangeMiles = (() => {
    if (!validContractor.drivingRange) return 10;
    const match = validContractor.drivingRange.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 10;
  })();

  // For availability section - extract from dailyAvailability
  const dailyAvailability = validContractor.availability?.dailyAvailability || [];
  const unavailableDates = dailyAvailability
    .filter(day => day.isFullyUnavailable)
    .map(day => day.date);

  // For ratings section
  const contractorRatings = validContractor.ratings || [];
  const hasRatings = contractorRatings.length > 0;
  
  // Calculate average rating
  const averageRating = hasRatings 
    ? contractorRatings.reduce((sum, rating) => sum + rating.rating, 0) / contractorRatings.length 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl w-[95vw] md:w-full rounded-2xl shadow-2xl border-0 max-h-[90vh] overflow-hidden"
        aria-labelledby="contractorProfileTitle"
      >
        <div className="overflow-y-auto max-h-[calc(90vh-2rem)]">
          {/* Hero Section */}
          <div className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-8 -m-6 mb-0 rounded-t-2xl">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="relative">
                <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-white shadow-xl">
                  <AvatarImage src={contractorProfileImage} alt={contractorName} className="object-cover"/>
                  <AvatarFallback className="text-5xl bg-primary/10 text-primary font-bold">{contractorInitial}</AvatarFallback>
                </Avatar>
                {averageRating > 0 && (
                  <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg border-2 border-primary/20">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-bold text-slate-700">{averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-center md:text-left flex-1">
                <DialogHeader>
                  <DialogTitle id="contractorProfileTitle" className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                    {contractorName}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-2 mb-4">
                  {contractorEmail && (
                    <div className="flex items-center justify-center md:justify-start gap-2 text-slate-600">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{contractorEmail}</span>
                    </div>
                  )}
                  
                  {contractorLocation && (
                    <div className="flex items-center justify-center md:justify-start gap-2 text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{contractorLocation}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-center md:justify-start gap-2 text-slate-600">
                    <Award className="w-4 h-4" />
                    <span className="text-sm">Service Range: {contractorDrivingRange}</span>
                  </div>
                </div>

                {hasRatings && (
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm text-slate-600">
                      {contractorRatings.length} review{contractorRatings.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Services Preview */}
                {serviceOfferings && serviceOfferings.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {serviceOfferings.slice(0, 4).map((offering, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="bg-white/80 text-primary border border-primary/20 rounded-full px-3 py-1"
                      >
                        {getServiceName(offering.serviceId)}
                      </Badge>
                    ))}
                    {serviceOfferings.length > 4 && (
                      <Badge 
                        variant="secondary" 
                        className="bg-white/80 text-slate-600 border border-slate-200 rounded-full px-3 py-1"
                      >
                        +{serviceOfferings.length - 4} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="p-6 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* About Section */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <div className="w-2 h-6 bg-primary rounded-full"></div>
                    About Me
                  </h3>
                  <DialogDescription className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {contractorBio}
                  </DialogDescription>
                </div>

                {/* Services Section */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-primary rounded-full"></div>
                    Services & Pricing
                  </h3>
                  {isLoadingServices ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading services...</span>
                    </div>
                  ) : serviceOfferings.length > 0 ? (
                    <div className="space-y-3">
                      {serviceOfferings.map(offering => {
                        const serviceDescription = getServiceDescription(offering.serviceId);
                        return (
                          <div key={offering.serviceId} className="bg-white rounded-lg p-4 border border-slate-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-900">{getServiceName(offering.serviceId)}</h4>
                                {serviceDescription && (
                                  <p className="text-sm text-slate-600 mt-1">{serviceDescription}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-primary font-bold text-lg">
                                  <DollarSign className="w-4 h-4" />
                                  {(offering.price / 100).toFixed(2)}
                                </div>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {offering.paymentType === 'daily' ? 'per day' : 'one-time'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-600">No specific services listed. Contact for custom pricing.</p>
                  )}
                </div>

                {/* Availability Section */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-primary rounded-full"></div>
                    <Calendar className="w-5 h-5" />
                    Availability
                  </h3>
                  {isLoadingBookings ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading booked dates...</span>
                    </div>
                  ) : (
                    <CompactAvailabilityCalendar unavailableDates={unavailableDates} bookings={bookings} />
                  )}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 text-center font-medium">
                      📅 Purple = booked (may be full-day or partial). Red = unavailable. Others are generally open.
                    </p>
                    <p className="text-xs text-blue-600 text-center mt-1">
                      Specific times are confirmed during the booking process.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Service Area Map */}
                {validContractor.locationLat && validContractor.locationLng ? (
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <div className="w-2 h-6 bg-primary rounded-full"></div>
                      <MapPin className="w-5 h-5" />
                      Service Area
                    </h3>
                    <div className="w-full h-80 rounded-xl overflow-hidden border-2 border-white shadow-lg">
                      <ContractorMap
                        lat={validContractor.locationLat}
                        lng={validContractor.locationLng}
                        miles={drivingRangeMiles}
                        clientLat={clientLatLng?.lat}
                        clientLng={clientLatLng?.lng}
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2 text-center">
                      Service area covers approximately {contractorDrivingRange} from base location
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <div className="w-2 h-6 bg-primary rounded-full"></div>
                      <MapPin className="w-5 h-5" />
                      Service Area
                    </h3>
                    <div className="bg-white rounded-lg p-8 text-center border border-slate-200">
                      <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600">Location not set for map display</p>
                      <p className="text-sm text-slate-500 mt-1">Contact for service area details</p>
                    </div>
                  </div>
                )}

                {/* Reviews Section */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-primary rounded-full"></div>
                    <Star className="w-5 h-5" />
                    Reviews & Ratings
                  </h3>
                  {hasRatings ? (
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {contractorRatings.slice(0, 5).map((review, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} 
                                />
                              ))}
                            </div>
                            <span className="text-xs text-slate-500">
                              {review.date && !isNaN(new Date(review.date).getTime()) 
                                ? new Date(review.date).toLocaleDateString()
                                : 'Date not available'
                              }
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-slate-700 text-sm leading-relaxed mb-2">"{review.comment}"</p>
                          )}
                          {review.contractorFeedback && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                  Contractor Response
                                </Badge>
                                <span className="text-xs text-blue-600">
                                  {review.contractorFeedback.date && !isNaN(new Date(review.contractorFeedback.date).getTime())
                                    ? new Date(review.contractorFeedback.date).toLocaleDateString()
                                    : ''
                                  }
                                </span>
                              </div>
                              <p className="text-sm text-blue-700 italic">"{review.contractorFeedback.comment}"</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-8 text-center border border-slate-200">
                      <Star className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600 font-medium">No reviews yet</p>
                      <p className="text-sm text-slate-500 mt-1">Be the first to book and leave a review!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 -m-6 mt-0 rounded-b-2xl">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex-1 py-4 text-lg font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                onClick={() => onBookNow(validContractor.id)} 
                type="button"
              >
                Request Booking
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 py-4 text-lg font-semibold rounded-xl border-2 hover:bg-slate-50 transition-all duration-200"
                onClick={onClose} 
                type="button"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 