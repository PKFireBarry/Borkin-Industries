"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { Contractor } from '@/types/contractor'
import * as React from 'react'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button";
import { getContractorServiceOfferings } from "@/lib/firebase/contractors";
import type { ContractorServiceOffering, PlatformService } from "@/types/service";

// TODO: Consider a shared utility or context for platform services if MOCK is used in multiple places
const MOCK_PLATFORM_SERVICES_MODAL: PlatformService[] = [
  { id: "ps_1", name: "Dog Walking (30 mins)", description: "A 30-minute walk for your dog." },
  { id: "ps_2", name: "Pet Sitting (per hour)", description: "In-home pet sitting, billed hourly." },
  { id: "ps_3", name: "Medication Administration", description: "Administering prescribed medication." },
  { id: "ps_4", name: "Nail Trim", description: "Professional nail trimming service." },
  { id: "dog_walking_30_mins", name: "Dog Walking (30 mins)"},
  { id: "pet_sitting_hourly", name: "Pet Sitting (per hour)" },
  { id: "medication_administration", name: "Medication Administration" },
  { id: "nail_trim", name: "Nail Trim" },
];
const getServiceNameModal = (serviceId: string) => MOCK_PLATFORM_SERVICES_MODAL.find(ps => ps.id === serviceId)?.name || serviceId;

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
  const [isLoadingServices, setIsLoadingServices] = useState(false)

  useEffect(() => {
    if (!clientLocation) return
    const query = [clientLocation.address, clientLocation.city, clientLocation.state, clientLocation.postalCode].filter(Boolean).join(', ')
    if (!query) return
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data[0]) setClientLatLng({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
      })
      .catch(() => setClientLatLng(null))
  }, [clientLocation])

  useEffect(() => {
    if (open && contractor) {
      setIsLoadingServices(true)
      getContractorServiceOfferings(contractor.id)
        .then(offerings => {
          setServiceOfferings(offerings)
        })
        .catch(err => {
          console.error("Error fetching contractor services for modal:", err)
          setServiceOfferings([]) // Set to empty or handle error display
        })
        .finally(() => {
          setIsLoadingServices(false)
        })
    } else {
      setServiceOfferings([]) // Clear when modal closes or no contractor
    }
  }, [open, contractor])

  if (!contractor) return null

  // DEBUG: Log contractor location
  if (contractor) {
    // eslint-disable-next-line no-console
    console.log('Contractor location:', contractor.locationLat, contractor.locationLng)
    console.log('Client location:', clientLatLng)
  }

  // Helper to get service name - assumes serviceOfferings might have denormalized name,
  // or falls back to serviceId. A proper shared utility for platform services is better long-term.
  const getServiceName = (serviceId: string) => {
    // In a real app, this would look up from a fetched list of PlatformService
    const platformService = MOCK_PLATFORM_SERVICES_MODAL.find(ps => ps.id === serviceId);
    return platformService?.name || serviceId;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] md:w-full rounded-lg shadow-xl">
        <div className="p-6 space-y-6 bg-card text-card-foreground overflow-y-auto max-h-[calc(100vh_-_5rem)]">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pb-6 border-b">
            <Avatar className="w-28 h-28 md:w-36 md:h-36 border-4 border-primary shadow-lg">
              <AvatarImage src={contractor.profileImage || '/avatars/default.png'} alt={contractor.name || 'Contractor'} className="object-cover"/>
              <AvatarFallback className="text-4xl bg-primary/10">{contractor.name ? contractor.name[0].toUpperCase() : 'C'}</AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left">
              <DialogTitle className="text-3xl font-bold mb-1">{contractor.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mb-0.5">{contractor.email}</p>
              <p className="text-xs text-muted-foreground">
                {[contractor.city, contractor.state].filter(Boolean).join(', ')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Driving Range: {contractor.drivingRange || 'N/A'}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-primary">About Me</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contractor.bio || 'No bio provided.'}</p>
              </div>



              <div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Services Offered</h3>
                {isLoadingServices ? (
                  <p className="text-sm text-muted-foreground">Loading services...</p>
                ) : serviceOfferings.length > 0 ? (
                  <ul className="space-y-1.5 text-sm">
                    {serviceOfferings.map(offering => (
                      <li key={offering.serviceId} className="flex justify-between items-center py-1 border-b border-border/50 last:border-b-0">
                        <span>{getServiceName(offering.serviceId)}</span>
                        <span className="font-medium text-primary">${(offering.price / 100).toFixed(2)} / day</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No specific services listed.</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Availability Notes</h3>
                {contractor.availability?.unavailableDates && contractor.availability.unavailableDates.length > 0 ? (
                    <ul className="list-disc list-inside pl-1 space-y-1 text-sm text-muted-foreground">
                        {contractor.availability.unavailableDates.map(date => 
                            <li key={date}>Unavailable on: {new Date(date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</li>
                        )}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">No specific unavailability notes. Please confirm when booking.</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {contractor.locationLat && contractor.locationLng ? (
                <div> 
                    <h3 className="text-lg font-semibold mb-2 text-primary">Service Area</h3>
                    <div className="w-full h-72 md:h-80 rounded-md overflow-hidden border shadow-sm">
                    <ContractorMap
                        lat={contractor.locationLat}
                        lng={contractor.locationLng}
                        miles={(() => {
                        const match = contractor.drivingRange?.match(/(\d+(?:\.\d+)?)/)
                        return match ? parseFloat(match[1]) : 10
                        })()}
                        clientLat={clientLatLng?.lat}
                        clientLng={clientLatLng?.lng}
                    />
                    </div>
                </div>
              ) : (
                 <div>
                    <h3 className="text-lg font-semibold mb-2 text-primary">Service Area</h3>
                    <p className="text-sm text-muted-foreground">Location not set for map display.</p>
                 </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Ratings & Reviews</h3>
                {contractor.ratings && contractor.ratings.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {contractor.ratings.slice(0, 5).map((review, idx) => ( // Show latest 5 or so
                      <div key={idx} className="p-3 bg-secondary/50 rounded-md shadow-sm text-sm">
                        <div className="flex items-center mb-1">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          ))}
                        </div>
                        {review.comment && <p className="text-muted-foreground mb-1">{review.comment}</p>}
                        <p className="text-xs text-muted-foreground/80">{new Date(review.date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No reviews yet.</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="w-full pt-6 border-t flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
              onClick={() => onBookNow(contractor.id)} 
              type="button"
            >
              Request Booking
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 py-3 shadow-sm"
              onClick={onClose} 
              type="button"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 