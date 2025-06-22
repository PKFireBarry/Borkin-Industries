"use client"
import { useRequireRole } from '../../use-require-role'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUser } from '@clerk/nextjs'
import { getGigsForContractor, updateBookingStatus, setContractorCompleted } from '@/lib/firebase/bookings'
import { getClientById, getPetsByIds } from '@/lib/firebase/client'
import { getContractorProfile } from '@/lib/firebase/contractors'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import dynamic from 'next/dynamic'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Pet } from '@/types/client'
import { PawPrint, Pill, Utensils, Clock, Dog, Info, Package, ChevronDown, ChevronUp, Loader2, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Booking } from '@/types/booking'
import { getAllPlatformServices } from '@/lib/firebase/services'
import type { PlatformService } from '@/types/service'
import { isOpenBookingStatus } from '@/app/actions/messaging-actions'
import Link from 'next/link'

// Define Gig interface directly without extending Booking
interface Gig {
  id: string
  clientId?: string
  clientName: string
  pets: string[]
  serviceType?: string
  services?: {
    serviceId: string
    price: number
    paymentType: 'one_time' | 'daily'
    name?: string
  }[]
  date?: string
  time?: { startTime?: string; endTime?: string }
  status: 'pending' | 'approved' | 'completed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'escrow' | 'cancelled' | 'failed'
  contractorCompleted: boolean
  paymentAmount?: number
  platformFee?: number
  stripeFee?: number
  netPayout?: number
  review?: { rating: number; comment?: string }
  petIds?: string[]
  startDate?: string
  endDate?: string
  numberOfDays?: number
  paymentIntentId?: string
}

const statusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const ContractorMap = dynamic(() => import('@/components/contractor-map'), { ssr: false })

// Add a helper function to calculate hours between start and end time
function calculateHours(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 0;
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  let hours = endHour - startHour;
  let minutes = endMinute - startMinute;
  
  // Handle negative minutes by borrowing an hour
  if (minutes < 0) {
    hours -= 1;
    minutes += 60;
  }
  
  // If end time is earlier than start time, assume it's for the next day
  if (hours < 0) {
    hours += 24;
  }
  
  // Convert to decimal hours (e.g., 1 hour 30 minutes = 1.5 hours)
  return Math.round((hours + minutes / 60) * 10) / 10;
}

// Update getGoogleCalendarUrl to use robust local date parsing
function getGoogleCalendarUrl(gig: Gig, clientName: string, petNames: string[], clientProfile?: { name?: string; phone?: string; address?: string; city?: string; state?: string; postalCode?: string }): string {
  function parseLocalDate(dateStr?: string) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
      const [datePart] = dateStr.split('T');
      const [y, m, d] = datePart.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
  }
  const clientFullName = clientProfile?.name || clientName;
  const clientPhone = clientProfile?.phone || '';
  const clientAddress = [clientProfile?.address, clientProfile?.city, clientProfile?.state, clientProfile?.postalCode].filter(Boolean).join(', ');
  const title = `Pet Care for ${petNames.join(', ') || 'your pet'} with ${clientFullName}`;
  const description = [
    `Client: ${clientFullName}`,
    clientPhone ? `Phone: ${clientPhone}` : '',
    clientAddress ? `Address: ${clientAddress}` : '',
    `Pets: ${petNames.join(', ')}`,
    gig.services && gig.services.length > 0 ? `Services: ${gig.services.map(s => s.name || s.serviceId).join(', ')}` : '',
    `Gig ID: ${gig.id}`,
  ].filter(Boolean).join('\n');
  const startDate = parseLocalDate(gig.startDate);
  const endDate = parseLocalDate(gig.endDate);
  let startTime = gig.time?.startTime;
  let endTime = gig.time?.endTime;
  if (!startTime) startTime = '09:00';
  if (!endTime) endTime = '17:00';
  function toGoogleDate(date: Date, time: string) {
    const [h, m] = time.split(':');
    const d = new Date(date);
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }
  const start = startDate ? toGoogleDate(startDate, startTime) : '';
  const end = endDate ? toGoogleDate(endDate, endTime) : '';
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', title);
  url.searchParams.set('details', description);
  if (start && end) url.searchParams.set('dates', `${start}/${end}`);
  return url.toString();
}

// Add robust local date range display helper
function getGigDateTimeRange(g: Gig) {
  function parseLocalDate(dateStr?: string) {
    if (!dateStr) return null;
    // If format is YYYY-MM-DD, treat as local date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    // If ISO string, extract date part and treat as local
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
      const [datePart] = dateStr.split('T');
      const [y, m, d] = datePart.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
  }
  const start = parseLocalDate(g.startDate);
  const end = parseLocalDate(g.endDate);
  const startTime = g.time?.startTime;
  const endTime = g.time?.endTime;
  if (!start || !end) return '';
  const startStr = `${start.toLocaleDateString()}${startTime ? ', ' + startTime : ''}`;
  const endStr = `${end.toLocaleDateString()}${endTime ? ', ' + endTime : ''}`;
  return `${startStr} — ${endStr}`;
}

export default function ContractorGigsPage() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const [filter, setFilter] = useState<'all' | Gig['status']>('all')
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [detailGig, setDetailGig] = useState<Gig | null>(null)
  const [clientProfile, setClientProfile] = useState<any>(null)
  const [clientLatLng, setClientLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [contractorLatLng, setContractorLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null)
  const [contractorDrivingRange, setContractorDrivingRange] = useState<number>(0)
  const [bookedPetsDetails, setBookedPetsDetails] = useState<Pet[]>([])
  const [cancelGigId, setCancelGigId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [expandedPetIndex, setExpandedPetIndex] = useState<number>(0)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [gigMessageEligibility, setGigMessageEligibility] = useState<Record<string, boolean>>({})
  const [isPaymentBreakdownExpanded, setIsPaymentBreakdownExpanded] = useState(false)

  async function fetchGigs() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const bookings = await getGigsForContractor(user.id)
      const platformServices = await getAllPlatformServices()
      const serviceNameMap = new Map(platformServices.map((s: PlatformService) => [s.id, s.name]))
      const mapped = await Promise.all(bookings.map(async (b: any) => {
        let clientName = 'N/A'
        let petNames: string[] = []
        let bookingClientId: string | undefined = b.clientId;

        if (bookingClientId) {
          const client = await getClientById(bookingClientId)
          clientName = client?.name || 'N/A'
          if (b.petIds && b.petIds.length && client?.pets) {
            petNames = client.pets.filter((p: any) => b.petIds.includes(p.id)).map((p: any) => p.name)
          }
        }
        // Attach service names
        const servicesWithNames = (b.services || []).map((service: any) => ({
          ...service,
          name: service.name || serviceNameMap.get(service.serviceId) || service.serviceId,
        }))
        return {
          id: b.id,
          clientId: bookingClientId,
          clientName,
          pets: petNames,
          serviceType: b.serviceType || 'N/A',
          services: servicesWithNames,
          date: b.startDate || b.date || '',
          time: b.time || '',
          status: b.status || 'pending',
          paymentStatus: b.paymentStatus || 'unpaid',
          contractorCompleted: b.contractorCompleted || false,
          paymentAmount: b.paymentAmount,
          platformFee: b.platformFee,
          stripeFee: b.stripeFee,
          netPayout: b.netPayout,
          review: b.review,
          petIds: b.petIds,
          startDate: b.startDate || '',
          endDate: b.endDate || '',
          numberOfDays: b.numberOfDays || 1,
          paymentIntentId: b.paymentIntentId,
        }
      }))
      setGigs(mapped)
    } catch {
      setError('Failed to load gigs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGigs()
  }, [user])

  useEffect(() => {
    const checkEligibility = async () => {
      const eligibility: Record<string, boolean> = {};
      for (const gig of gigs) {
        eligibility[gig.id] = await isOpenBookingStatus(gig.status);
      }
      setGigMessageEligibility(eligibility);
    };
    if (gigs.length > 0) {
      checkEligibility();
    }
  }, [gigs]);

  // Fetch client profile and geocode both addresses when opening modal
  useEffect(() => {
    const fetchClientAndGeocode = async () => {
      if (!detailGig || !user) {
        // Clear previous data if no gig is selected or no user
        setClientProfile(null);
        setClientLatLng(null);
        setContractorLatLng(null);
        setDistanceMiles(null);
        setContractorDrivingRange(0);
        setBookedPetsDetails([]);
        return;
      }
      
      console.log('[Debug] useEffect fetchClientAndGeocode: Running for gig ID:', (detailGig as any).id);
      const gigClientId = (detailGig as any).clientId;
      const gigPetIds = (detailGig as any).petIds;
      console.log('[Debug] useEffect fetchClientAndGeocode: Attempting to fetch client with clientId:', gigClientId);

      // Reset states for new gig details
      setClientProfile(null);
      setClientLatLng(null);
      setContractorLatLng(null);
      setDistanceMiles(null);
      setContractorDrivingRange(0);
      setBookedPetsDetails([]);

      let clientData = null;
      if (gigClientId) {
        try {
          clientData = await getClientById(gigClientId);
          console.log('[Debug] useEffect fetchClientAndGeocode: Fetched client profile:', clientData);
          setClientProfile(clientData);

          if (clientData && clientData.pets && gigPetIds && gigPetIds.length > 0) {
            const petsForThisGig = clientData.pets.filter((p: Pet) => gigPetIds.includes(p.id));
            setBookedPetsDetails(petsForThisGig);
            console.log("[Debug] Fetched full pet details for gig:", petsForThisGig);
          } else {
            console.log("[Debug] No pet IDs in gig or no pets on client profile to filter.");
          }
        } catch (err) {
          console.error('[Debug] useEffect fetchClientAndGeocode: Error fetching client profile:', err);
        }
      }

      if (clientData) {
        const clientQuery = [clientData.address, clientData.city, clientData.state, clientData.postalCode].filter(Boolean).join(', ');
        console.log('[Debug] useEffect fetchClientAndGeocode: Client geocoding query:', clientQuery);
        if (clientQuery) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clientQuery)}`);
            const data = await res.json();
            console.log('[Debug] useEffect fetchClientAndGeocode: Client geocoding API response data:', data);
            if (data && data[0]) {
              const latLng = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
              console.log('[Debug] useEffect fetchClientAndGeocode: Setting clientLatLng:', latLng);
              setClientLatLng(latLng);
            } else {
              console.warn('[Debug] useEffect fetchClientAndGeocode: No client geocoding results.');
            }
          } catch (err) {
            console.error('[Debug] useEffect fetchClientAndGeocode: Error during client geocoding API call:', err);
          }
        } else {
          console.warn('[Debug] useEffect fetchClientAndGeocode: Client geocoding query is empty.');
        }
      } else {
        console.warn('[Debug] useEffect fetchClientAndGeocode: Client data is null, skipping client geocoding.');
        if (gigClientId) {
          console.warn('[Debug] useEffect fetchClientAndGeocode: Client was null despite having a clientId. Check getClientById or Firestore data for clients collection.');
        }
      }

      // Fetch and geocode contractor's address
      if (user.id) {
        try {
          const contractorProfile = await getContractorProfile(user.id);
          console.log('[Debug] useEffect fetchClientAndGeocode: Fetched contractor profile:', contractorProfile);
          if (contractorProfile) {
            // Set driving range from contractor's profile - extract numeric value from string
            const drivingRangeStr = contractorProfile.drivingRange || '';
            const drivingRangeMatch = drivingRangeStr.match(/(\d+(?:\.\d+)?)/);
            const drivingRange = drivingRangeMatch ? parseFloat(drivingRangeMatch[1]) : 0;
            console.log('[Debug] useEffect fetchClientAndGeocode: Contractor driving range string:', drivingRangeStr);
            console.log('[Debug] useEffect fetchClientAndGeocode: Parsed contractor driving range:', drivingRange);
            setContractorDrivingRange(drivingRange);

            if (contractorProfile.address && contractorProfile.city && contractorProfile.state && contractorProfile.postalCode) {
              const contractorQuery = [contractorProfile.address, contractorProfile.city, contractorProfile.state, contractorProfile.postalCode].filter(Boolean).join(', ');
              console.log('[Debug] useEffect fetchClientAndGeocode: Contractor geocoding query:', contractorQuery);
              if (contractorQuery) {
                try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(contractorQuery)}`);
                  const data = await res.json();
                  console.log('[Debug] useEffect fetchClientAndGeocode: Contractor geocoding API response data:', data);
                  if (data && data[0]) {
                    const latLng = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                    console.log('[Debug] useEffect fetchClientAndGeocode: Setting contractorLatLng:', latLng);
                    setContractorLatLng(latLng);
                  } else {
                    console.warn('[Debug] useEffect fetchClientAndGeocode: No contractor geocoding results.');
                  }
                } catch (err) {
                  console.error('[Debug] useEffect fetchClientAndGeocode: Error during contractor geocoding API call:', err);
                }
              } else {
                console.warn('[Debug] useEffect fetchClientAndGeocode: Contractor geocoding query is empty, skipping contractor geocoding.');
              }
            } else {
              console.warn('[Debug] useEffect fetchClientAndGeocode: Contractor profile or address details missing, skipping contractor geocoding.');
            }
          } else {
            console.warn('[Debug] useEffect fetchClientAndGeocode: Contractor profile is null, skipping contractor geocoding.');
          }
        } catch (err) {
          console.error('[Debug] useEffect fetchClientAndGeocode: Error fetching contractor profile:', err);
        }
      } else {
        console.warn("[Debug] useEffect fetchClientAndGeocode: user.id not available for contractor geocoding.");
      }
    }
    fetchClientAndGeocode();
  }, [detailGig, user]);

  useEffect(() => {
    console.log('[Debug] clientProfile state updated:', clientProfile);
  }, [clientProfile]);

  useEffect(() => {
    console.log('[Debug] clientLatLng state updated:', clientLatLng);
  }, [clientLatLng]);

  // Optionally, calculate distance between client and contractor
  useEffect(() => {
    if (clientLatLng && contractorLatLng) {
      const toRad = (v: number) => (v * Math.PI) / 180
      const R = 3958.8 // miles
      const dLat = toRad(contractorLatLng.lat - clientLatLng.lat)
      const dLon = toRad(contractorLatLng.lng - clientLatLng.lng)
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(clientLatLng.lat)) * Math.cos(toRad(contractorLatLng.lat)) * Math.sin(dLon / 2) ** 2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      setDistanceMiles(R * c)
    } else {
      setDistanceMiles(null)
    }
  }, [clientLatLng, contractorLatLng])

  const handleAccept = async (gigId: string) => {
    setActionLoading(gigId)
    try {
      // Update booking status to approved
    await updateBookingStatus(gigId, 'approved')
      
      // Get the booking data to send notification
      const approvedGig = gigs.find(g => g.id === gigId)
      if (approvedGig) {
        // Trigger email notification for booking approved
        try {
          const response = await fetch('/api/notifications/booking-approved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              booking: {
                id: approvedGig.id,
                clientId: approvedGig.clientId,
                contractorId: user?.id,
                services: approvedGig.services,
                startDate: approvedGig.startDate,
                endDate: approvedGig.endDate,
                paymentAmount: approvedGig.paymentAmount || 0,
                status: 'approved',
                paymentStatus: approvedGig.paymentStatus,
                petIds: approvedGig.petIds,
                numberOfDays: approvedGig.numberOfDays,
                platformFee: approvedGig.platformFee,
                stripeFee: approvedGig.stripeFee,
                netPayout: approvedGig.netPayout,
                paymentIntentId: approvedGig.paymentIntentId
              }
            })
          })
          
          if (!response.ok) {
            console.error('Failed to send booking approved notification')
          } else {
            console.log('Booking approved notification sent successfully')
          }
        } catch (emailError) {
          console.error('Error sending booking approved notification:', emailError)
          // Don't throw - we don't want email failures to break the approval process
        }
      }
      
    await fetchGigs()
    } catch (error) {
      console.error('Error accepting gig:', error)
      setError('Failed to accept gig')
    } finally {
    setActionLoading(null)
    }
  }

  const handleDecline = async (gigId: string) => {
    setActionLoading(gigId)
    try {
      // Update booking status to cancelled (declined)
    await updateBookingStatus(gigId, 'cancelled')
      
      // Get the booking data to send notification
      const declinedGig = gigs.find(g => g.id === gigId)
      if (declinedGig) {
        // Trigger email notification for booking declined
        try {
          const response = await fetch('/api/notifications/booking-declined', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              booking: {
                id: declinedGig.id,
                clientId: declinedGig.clientId,
                contractorId: user?.id,
                services: declinedGig.services,
                startDate: declinedGig.startDate,
                endDate: declinedGig.endDate,
                paymentAmount: declinedGig.paymentAmount || 0,
                status: 'cancelled',
                paymentStatus: declinedGig.paymentStatus,
                petIds: declinedGig.petIds,
                numberOfDays: declinedGig.numberOfDays,
                platformFee: declinedGig.platformFee,
                stripeFee: declinedGig.stripeFee,
                netPayout: declinedGig.netPayout,
                paymentIntentId: declinedGig.paymentIntentId
              }
            })
          })
          
          if (!response.ok) {
            console.error('Failed to send booking declined notification')
          } else {
            console.log('Booking declined notification sent successfully')
          }
        } catch (emailError) {
          console.error('Error sending booking declined notification:', emailError)
          // Don't throw - we don't want email failures to break the decline process
        }
      }
      
    await fetchGigs()
    } catch (error) {
      console.error('Error declining gig:', error)
      setError('Failed to decline gig')
    } finally {
    setActionLoading(null)
    }
  }

  const handleMarkCompleted = async (gigId: string) => {
    setActionLoading(gigId)
    try {
      await setContractorCompleted(gigId, true)
      await fetchGigs()
    } catch {
      setError('Failed to mark as completed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEmergencyCancel = async () => {
    if (!cancelGigId) return
    setIsCancelling(true)
    setCancelError(null)
    try {
      const gigToCancel = gigs.find(g => g.id === cancelGigId)
      if (!gigToCancel) throw new Error('Gig not found')
      
      // Cancel the payment intent in Stripe if it exists
      if (gigToCancel.paymentIntentId) {
        try {
          const res = await fetch('/api/stripe/cancel-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId: gigToCancel.paymentIntentId }),
          })
          const data = await res.json()
          if (!res.ok) {
            throw new Error(data.error || 'Failed to cancel payment')
          }
        } catch (err: any) {
          console.error('Failed to cancel payment intent:', err)
          // Continue with booking cancellation even if payment cancellation fails
        }
      }
      
      // Update booking status to cancelled
      await updateBookingStatus(cancelGigId, 'cancelled')
      
      // Send cancellation email notification to client
      if (gigToCancel) {
        try {
          const response = await fetch('/api/notifications/booking-cancelled', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              booking: {
                id: gigToCancel.id,
                clientId: gigToCancel.clientId,
                contractorId: user?.id,
                services: gigToCancel.services,
                startDate: gigToCancel.startDate,
                endDate: gigToCancel.endDate,
                paymentAmount: gigToCancel.paymentAmount || 0,
                status: 'cancelled',
                paymentStatus: gigToCancel.paymentStatus,
                petIds: gigToCancel.petIds,
                numberOfDays: gigToCancel.numberOfDays,
                platformFee: gigToCancel.platformFee,
                stripeFee: gigToCancel.stripeFee,
                netPayout: gigToCancel.netPayout,
                paymentIntentId: gigToCancel.paymentIntentId
              }
            })
          })
          
          if (!response.ok) {
            console.error('Failed to send booking cancellation notification')
          } else {
            console.log('Booking cancellation notification sent successfully')
          }
        } catch (emailError) {
          console.error('Error sending booking cancellation notification:', emailError)
          // Don't throw - we don't want email failures to break the cancellation process
        }
      }
      
      setCancelGigId(null)
      await fetchGigs()
    } catch (err: any) {
      setCancelError(err?.message || 'Failed to cancel gig')
    } finally {
      setIsCancelling(false)
    }
  }

  // Helper to format date(s)
  const safeDateString = (date: string) => {
    if (!date) return ''
    const d = new Date(date)
    return isNaN(d.getTime()) ? '' : d.toLocaleString()
  }

  // Update the formatDateTime function to include hours calculation if time is provided
  const formatDateTime = (date: string | undefined, time?: {startTime?: string, endTime?: string}) => {
    if (!date) return 'N/A';
    
    const formattedDate = safeDateString(date);
    if (!time) return formattedDate;
    
    const { startTime, endTime } = time;
    if (startTime && endTime) {
      const hoursPerDay = calculateHours(startTime, endTime);
      return `${formattedDate}, ${startTime} - ${endTime} (${hoursPerDay} hours)`;
    } else if (startTime) {
      return `${formattedDate}, ${startTime}`;
    }
    
    return formattedDate;
  };

  // Update the getGigDisplayDate function to include time information
  const getGigDisplayDate = (g: Gig) => {
    const start = g.startDate ?? g.date ?? '';
    
    if (g.time?.startTime) {
      return formatDateTime(start, g.time);
    }
    
    return safeDateString(start);
  };

  // Helper for net payout
  const getNetPayout = (gig: Gig) => {
    if (typeof gig.netPayout === 'number') return gig.netPayout
    if (typeof gig.paymentAmount === 'number') {
      const platformFee = gig.platformFee ?? gig.paymentAmount * 0.05
      const stripeFee = gig.stripeFee ?? (gig.paymentAmount * 0.029 + 0.3)
      return +(gig.paymentAmount - platformFee - stripeFee).toFixed(2)
    }
    return 0
  }

  // Helper for status badge
  function StatusBadge({ status }: { status: string }) {
    const statusConfig = {
      pending: { 
        color: 'bg-amber-100 text-amber-700 border-amber-200', 
        icon: '⏳',
        label: 'Pending'
      },
      approved: { 
        color: 'bg-blue-100 text-blue-700 border-blue-200', 
        icon: '✓',
        label: 'Approved'
      },
      completed: { 
        color: 'bg-green-100 text-green-700 border-green-200', 
        icon: '✅',
        label: 'Completed'
      },
      cancelled: { 
        color: 'bg-red-100 text-red-700 border-red-200', 
        icon: '❌',
        label: 'Cancelled'
      }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: '•',
      label: status.charAt(0).toUpperCase() + status.slice(1)
    }
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
        <span>{config.icon}</span>
        {config.label}
      </span>
    )
  }

  // PetDetailItem helper component
  const PetDetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | number | null }) => (
    value ? (
        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200/60">
            <div className="flex items-center justify-center w-6 h-6 bg-white rounded-md border border-slate-200/60 flex-shrink-0 mt-0.5">
              <Icon className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-700 text-sm">{label}</div>
              <div className="text-slate-900 text-sm mt-0.5 break-words">{String(value)}</div>
            </div>
        </div>
    ) : null
  );

  // Format price for display - fixing the Stripe cents formatting issue
  const formatPrice = (price: number, paymentType: 'one_time' | 'daily', numberOfDays: number = 1) => {
    // Service prices might be stored in cents, convert to dollars
    // If price is a whole number over 100, it's likely in cents
    const displayPrice = price >= 100 && price % 1 === 0 ? price / 100 : price;

    if (paymentType === 'one_time') {
      return `$${displayPrice.toFixed(2)}`;
    } else {
      // For daily services, show total and rate
      const dailyRate = displayPrice;
      const totalPrice = dailyRate * numberOfDays;
      return `$${dailyRate.toFixed(2)}/day × ${numberOfDays} day${numberOfDays !== 1 ? 's' : ''} = $${totalPrice.toFixed(2)}`;
    }
  };

  // Add a helper function to get service names
  const getServiceNames = (gig: Gig) => {
    if (!gig.services || gig.services.length === 0) {
      return gig.serviceType || 'N/A';
    }
    
    // If we have only one service, show its name
    if (gig.services.length === 1) {
      return gig.services[0].name || gig.services[0].serviceId;
    }
    
    // If we have multiple services, show the first one with a +N indicator
    return `${gig.services[0].name || gig.services[0].serviceId} +${gig.services.length - 1} more`;
  };

  // Helper to check if a gig has multiple services
  const hasMultipleServices = (gig: Gig) => {
    return gig.services && gig.services.length > 1;
  };

  // Calculate the correct total payment from services
  const calculateTotalFromServices = (gig: Gig) => {
    if (!gig.services || gig.services.length === 0) {
      return gig.paymentAmount || 0;
    }
    
    const numberOfDays = gig.numberOfDays || 1;
    return gig.services.reduce((total, service) => {
      if (service.paymentType === 'daily') {
        return total + (service.price * numberOfDays);
      } else {
        return total + service.price;
      }
    }, 0);
  };

  // When detailGig is set, start loading state
  useEffect(() => {
    if (detailGig) setIsDetailLoading(true)
  }, [detailGig])

  // When all modal data is loaded, stop loading state
  useEffect(() => {
    if (
      detailGig &&
      clientProfile &&
      bookedPetsDetails &&
      (contractorLatLng && clientLatLng)
    ) {
      setIsDetailLoading(false)
    }
  }, [detailGig, clientProfile, bookedPetsDetails, contractorLatLng, clientLatLng])

  if (!isLoaded || !isAuthorized) return null
  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading gigs...</div>
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>

  const filteredGigs = filter === 'all' ? gigs : gigs.filter(g => g.status === filter)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Your Gigs
                </h1>
                <p className="text-slate-600 mt-1">
                  Manage your bookings and track your earnings
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-slate-100 rounded-full px-3 py-1">
                  <span className="text-sm font-medium text-slate-700">
                    {filteredGigs.length} {filteredGigs.length === 1 ? 'gig' : 'gigs'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Filter Bar */}
        <div className="mb-8">
          {/* Mobile Filter - Compact Grid */}
          <div className="sm:hidden bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4">
            <div className="grid grid-cols-2 gap-3">
              {(['all', 'pending', 'approved', 'completed', 'cancelled'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'default' : 'outline'}
                  onClick={() => setFilter(status)}
                  className={`capitalize text-sm rounded-xl font-medium transition-all duration-200 ${
                    filter === status 
                      ? 'bg-primary text-white shadow-md' 
                      : 'border-2 border-slate-200 hover:border-primary hover:bg-primary/5'
                  } ${status === 'cancelled' ? 'col-span-2' : ''}`}
                >
                  {status === 'all' ? 'All Gigs' : statusLabels[status as keyof typeof statusLabels]}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Desktop Filter - Horizontal */}
          <div className="hidden sm:flex gap-3 justify-center lg:justify-start">
            {(['all', 'pending', 'approved', 'completed', 'cancelled'] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                onClick={() => setFilter(status)}
                className={`capitalize rounded-xl px-6 py-2 font-medium transition-all duration-200 ${
                  filter === status 
                    ? 'bg-primary text-white shadow-md hover:bg-primary/90' 
                    : 'border-2 border-slate-200 hover:border-primary hover:bg-primary/5'
                }`}
              >
                {status === 'all' ? 'All Gigs' : statusLabels[status as keyof typeof statusLabels]}
              </Button>
            ))}
          </div>
        </div>

        {/* Gigs List or Empty State */}
        {filteredGigs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-slate-100 rounded-full p-6 mb-6">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No gigs found</h3>
            <p className="text-slate-600 text-center max-w-md">
              {filter === 'all' 
                ? "You don't have any gigs yet. New booking requests will appear here."
                : `No gigs found with "${statusLabels[filter as keyof typeof statusLabels]}" status.`
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-6 w-full">
            {filteredGigs.map(gig => {
              const canMessage = gigMessageEligibility[gig.id] === true;
              return (
                <Card key={gig.id} className="bg-white border-0 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden group">
                  {/* Header Section */}
                  <div className="p-6 pb-4">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      {/* Service Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          {hasMultipleServices(gig) && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 rounded-full px-3 py-1">
                            <Package className="h-3 w-3 mr-1" />
                            {gig.services?.length} services
                          </Badge>
                          )}
                          <StatusBadge status={gig.status} />
                        </div>
                        
                        <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-primary transition-colors">
                          {getServiceNames(gig)}
                        </h3>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                            <span className="font-medium">{getGigDateTimeRange(gig)}</span>
                      </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-slate-300 rounded-full"></span>
                            <span>Client: <span className="font-medium text-slate-900">{gig.clientName}</span></span>
                    </div>
                    </div>
                        
                        {gig.pets.length > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <PawPrint className="w-4 h-4 text-primary" />
                            <span className="text-sm text-slate-600">
                              <span className="font-medium">{gig.pets.length} pet{gig.pets.length !== 1 ? 's' : ''}:</span> {gig.pets.join(', ')}
                            </span>
                  </div>
                        )}
                        
                      {gig.review && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <svg key={i} className={`w-4 h-4 ${i < gig.review!.rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-sm text-slate-600">
                              {gig.review.comment && `"${gig.review.comment}"`}
                            </span>
                          </div>
                      )}
                    </div>
                      
                      {/* Payment Info */}
                      <div className="flex flex-col items-end gap-2 min-w-[140px]">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-slate-900">
                            ${(gig.paymentAmount || 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-slate-500">
                            Net: <span className="font-semibold text-green-600">${getNetPayout(gig).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                          gig.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                          gig.paymentStatus === 'escrow' ? 'bg-blue-100 text-blue-700' :
                          gig.paymentStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {gig.paymentStatus}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions Section */}
                  <div className="px-6 pb-6">
                    <div className="flex flex-wrap gap-3 justify-end">
                      <Button 
                        variant="outline" 
                        onClick={() => setDetailGig(gig)}
                        className="rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-all duration-200"
                      >
                        View Details
                      </Button>
                      
                      {canMessage && (
                        <Link href={`/dashboard/messages/${gig.id}`} passHref>
                          <Button 
                            variant="outline"
                            className="rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-all duration-200"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                        </Link>
                      )}
                      
                      {gig.status === 'pending' && (
                        <>
                          <Button 
                            disabled={actionLoading === gig.id} 
                            onClick={() => handleAccept(gig.id)}
                            className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-6 font-medium transition-all duration-200"
                          >
                            {actionLoading === gig.id ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Accepting...
                              </div>
                            ) : (
                              'Accept'
                            )}
                          </Button>
                          <Button 
                            variant="destructive" 
                            disabled={actionLoading === gig.id} 
                            onClick={() => handleDecline(gig.id)}
                            className="rounded-xl px-6 font-medium transition-all duration-200"
                          >
                            {actionLoading === gig.id ? 'Declining...' : 'Decline'}
                          </Button>
                        </>
                      )}
                      
                      {gig.status === 'approved' && !gig.contractorCompleted && (
                        <>
                          <Button 
                            disabled={actionLoading === gig.id} 
                            onClick={() => handleMarkCompleted(gig.id)}
                            className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 font-medium transition-all duration-200"
                          >
                            {actionLoading === gig.id ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Mark Complete
                              </div>
                            ) : (
                              'Mark Complete'
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setCancelGigId(gig.id)}
                            disabled={actionLoading === gig.id}
                            className="rounded-xl border-2 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 transition-all duration-200"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      
                      {gig.status === 'approved' && gig.contractorCompleted && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium">Awaiting client confirmation</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
        
        {/* Gig Details Modal */}
        <Dialog open={!!detailGig} onOpenChange={() => setDetailGig(null)}>
          <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border-0 shadow-2xl p-4 sm:p-6">
            <DialogHeader className="pb-6 border-b border-slate-200">
              <DialogTitle className="text-2xl font-bold text-slate-900">Gig Details</DialogTitle>
              {detailGig && (
                <div className="flex items-center gap-3 mt-2">
                  <StatusBadge status={detailGig.status} />
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                    detailGig.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                    detailGig.paymentStatus === 'escrow' ? 'bg-blue-100 text-blue-700' :
                    detailGig.paymentStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    Payment: {detailGig.paymentStatus}
                  </div>
                </div>
              )}
            </DialogHeader>
            {isDetailLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] py-16">
                <div className="bg-primary/10 rounded-full p-4 mb-6">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Details</h3>
                <p className="text-slate-600 text-sm">Fetching gig information and client details...</p>
              </div>
            ) : detailGig && (
              <section className="space-y-8 py-6">

                {/* Client Information */}
                {clientProfile && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center">👤</span>
                      Client Information
                    </h3>
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <Avatar className="h-16 w-16 border-2 border-slate-200 mx-auto sm:mx-0">
                        {clientProfile.avatar ? (
                          <AvatarImage src={clientProfile.avatar} alt={clientProfile.name} className="object-cover" />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                            {clientProfile.name?.charAt(0) ?? '?'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <h4 className="font-semibold text-lg text-slate-900">{clientProfile.name}</h4>
                        <div className="space-y-1 text-sm text-slate-600">
                          <div className="flex items-center gap-2 justify-center sm:justify-start">
                            <span className="w-4 h-4 flex items-center justify-center">📧</span>
                            <span className="break-all">{clientProfile.email}</span>
                          </div>
                          <div className="flex items-center gap-2 justify-center sm:justify-start">
                            <span className="w-4 h-4 flex items-center justify-center">📱</span>
                            <span>{clientProfile.phone}</span>
                          </div>
                          <div className="flex items-start gap-2 justify-center sm:justify-start">
                            <span className="w-4 h-4 flex items-center justify-center mt-0.5">📍</span>
                            <span className="text-center sm:text-left">{[clientProfile.address, clientProfile.city, clientProfile.state, clientProfile.postalCode].filter(Boolean).join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Map Section */}
                {(contractorLatLng && clientLatLng) && (
                  <div className="w-full h-48 sm:h-64 mb-2 relative rounded-xl overflow-hidden border border-slate-200">
                    <ContractorMap
                      lat={contractorLatLng.lat}
                      lng={contractorLatLng.lng}
                      miles={contractorDrivingRange}
                      clientLat={clientLatLng?.lat}
                      clientLng={clientLatLng?.lng}
                    />
                    <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 text-xs font-medium shadow-lg border border-slate-200">
                      <div className="text-slate-700">Service Range:</div>
                      <div className="font-semibold text-slate-900">{contractorDrivingRange} miles</div>
                    </div>
                  </div>
                )}
                {/* Distance to Gig */}
                {(contractorLatLng && clientLatLng && typeof distanceMiles === 'number') && (
                  <div className="mb-2 text-sm text-muted-foreground">
                    <span className="font-medium">Distance to Gig:</span> {distanceMiles.toFixed(2)} miles
                  </div>
                )}
                {/* Service Details & Payment */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary"/>
                    Service Details & Payment
                  </h3>
                  
                  {/* Service Overview */}
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 mb-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Package className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="font-medium text-slate-900 break-words">{getServiceNames(detailGig)}</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700 break-words">{getGigDateTimeRange(detailGig)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">📅</span>
                        <span className="text-slate-700">{detailGig.numberOfDays} day{detailGig.numberOfDays !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Service Items */}
                    {detailGig.services && detailGig.services.length > 0 ? detailGig.services.map((service, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50 rounded-xl px-3 sm:px-4 py-3 gap-2">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm sm:text-base text-slate-900 break-words">{service.name || service.serviceId}</span>
                          <span className="text-xs sm:text-sm text-slate-600">
                            {service.paymentType === 'one_time' ? 'One-time payment' : 'Daily rate'}
                          </span>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="font-bold text-base sm:text-lg text-slate-900 break-words">{formatPrice(service.price, service.paymentType, detailGig.numberOfDays || 1)}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="text-slate-500 text-center py-4 text-sm">No service details available</div>
                    )}
                    
                    {/* Payment Summary with Collapsible Breakdown */}
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-semibold text-sm sm:text-base text-slate-900">Total Payment</span>
                        <span className="font-bold text-primary text-lg sm:text-xl">${(detailGig.paymentAmount || 0).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 gap-2">
                        <span className="font-semibold text-sm sm:text-base text-slate-900">Your Payout</span>
                        <span className="font-bold text-green-600 text-lg sm:text-xl">${getNetPayout(detailGig).toFixed(2)}</span>
                      </div>
                      
                      {/* Collapsible Payment Breakdown */}
                      <button
                        onClick={() => setIsPaymentBreakdownExpanded(!isPaymentBreakdownExpanded)}
                        className="w-full flex items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-200 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        <span>View Payment Breakdown</span>
                        {isPaymentBreakdownExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      
                      {isPaymentBreakdownExpanded && (
                        <div className="space-y-2 pt-3 border-t border-slate-200 mt-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Platform Fee (5%)</span>
                            <span className="text-red-600 font-medium">-${(detailGig.platformFee || (detailGig.paymentAmount || 0) * 0.05).toFixed(2)}</span>
                    </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Processing Fee</span>
                            <span className="text-red-600 font-medium">-${((detailGig.stripeFee && detailGig.stripeFee > 0 ? detailGig.stripeFee : ((detailGig.paymentAmount || 0) * 0.029 + 0.3)).toFixed(2))}</span>
                    </div>
                  </div>
                      )}
                </div>
                  </div>
                </div>
                {/* Pet Information */}
                {bookedPetsDetails.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex-shrink-0">
                        <PawPrint className="w-4 h-4 text-amber-600" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-slate-900">Pet Information</h3>
                    </div>
                    
                    <div className="space-y-3">
                      {bookedPetsDetails.map((pet, index) => {
                        const isExpanded = expandedPetIndex === index
                        return (
                          <div key={pet.id} className={`bg-slate-50 rounded-xl border border-slate-200/60 transition-all duration-200 ${isExpanded ? 'shadow-lg ring-2 ring-primary/10' : 'hover:shadow-md hover:border-slate-300/60'}`}> 
                            <button
                              type="button"
                              className="w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-inset text-left rounded-xl transition-colors hover:bg-slate-100/50"
                              aria-expanded={isExpanded}
                              onClick={() => setExpandedPetIndex(isExpanded ? -1 : index)}
                            >
                              <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-white shadow-md ring-2 ring-slate-200/60 flex-shrink-0">
                                <AvatarImage src={pet.photoUrl || '/avatars/default-pet.png'} alt={pet.name} className="object-cover" />
                                <AvatarFallback className="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 text-base sm:text-lg font-semibold">
                                  {pet.name ? pet.name[0].toUpperCase() : 'P'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-base sm:text-lg text-slate-900 truncate">{pet.name}</div>
                                <div className="flex flex-wrap gap-x-2 sm:gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600 mt-1">
                                  {pet.animalType && (
                                    <span className="flex items-center gap-1">
                                      <span className="font-medium">Type:</span> 
                                      <span className="capitalize">{pet.animalType}</span>
                                    </span>
                                  )}
                                  {pet.breed && (
                                    <span className="flex items-center gap-1">
                                      <span className="font-medium">Breed:</span> 
                                      <span>{pet.breed}</span>
                                    </span>
                                  )}
                                  {pet.age && (
                                    <span className="flex items-center gap-1">
                                      <span className="font-medium">Age:</span> 
                                      <span>{pet.age} yrs</span>
                                    </span>
                                  )}
                                  {pet.weight && (
                                    <span className="flex items-center gap-1">
                                      <span className="font-medium">Weight:</span> 
                                      <span>{pet.weight}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 transition-colors">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-600" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-600" />
                                )}
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="px-3 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-slate-200/60 bg-white/50 rounded-b-xl">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 mt-3">
                                  <PetDetailItem icon={Pill} label="Medications" value={pet.medications} />
                                  <PetDetailItem icon={Utensils} label="Food" value={pet.food} />
                                  <PetDetailItem icon={Clock} label="Food Schedule" value={pet.foodSchedule} />
                                  <PetDetailItem icon={Clock} label="General Schedule" value={pet.schedule} />
                                  <PetDetailItem icon={Dog} label="Temperament" value={pet.temperament} />
                                  <PetDetailItem icon={Info} label="Allergies" value={pet.allergies} />
                                  <PetDetailItem icon={Info} label="Need to Know" value={pet.needToKnow} />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {/* Review */}
                {detailGig.review && (
                  <div className="border-b pb-4">
                    <div className="text-xs text-muted-foreground mb-2 font-semibold">Review</div>
                    <div className="text-sm">Rating: <span className="font-bold">{detailGig.review.rating}</span></div>
                    {detailGig.review.comment && <div className="text-sm mt-1">"{detailGig.review.comment}"</div>}
                  </div>
                )}
                {/* Booking ID & Calendar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t pt-4 mt-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Booking ID</span>
                    <div className="font-mono break-all text-xs mt-1">{detailGig?.id ?? ''}</div>
                  </div>
                  {clientProfile && (
                    <div className="flex justify-end mt-2 sm:mt-0">
                      <a
                        href={getGoogleCalendarUrl(detailGig, detailGig.clientName, detailGig.pets, clientProfile)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <Button variant="outline" className="text-sm px-3 py-1 rounded-full shadow-sm">Add to Google Calendar</Button>
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )}
            <DialogFooter>
              <div className="flex w-full justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailGig(null)}>Close</Button>
                {detailGig?.status === 'approved' && !detailGig.contractorCompleted && (
                  <Button 
                    variant="destructive" 
                    onClick={() => { 
                      setCancelGigId(detailGig.id); 
                      setDetailGig(null); 
                    }}
                    disabled={isCancelling}
                  >
                    Emergency Cancel
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Emergency Cancellation Dialog */}
        <Dialog open={!!cancelGigId} onOpenChange={(open) => !open && setCancelGigId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Emergency Gig Cancellation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">
                You are about to cancel this gig. This action is <strong>irreversible</strong> and should only be used in case of:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Emergencies that prevent you from fulfilling the gig</li>
                <li>Serious misunderstandings about service requirements</li>
                <li>Safety concerns</li>
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                <p className="font-medium text-amber-800">What happens when you cancel:</p>
                <ul className="list-disc pl-5 text-amber-700 mt-1">
                  <li>Any pending payment will be canceled</li>
                  <li>The client will be notified</li>
                  <li>The gig will be permanently marked as cancelled</li>
                  <li>Frequent cancellations may affect your contractor rating</li>
                </ul>
              </div>
              {cancelError && <div className="text-destructive text-sm mt-2">{cancelError}</div>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelGigId(null)} disabled={isCancelling}>
                No, Keep Gig
              </Button>
              <Button variant="destructive" onClick={handleEmergencyCancel} disabled={isCancelling}>
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Gig'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
