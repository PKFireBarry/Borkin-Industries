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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            // Set driving range from contractor's profile
            const drivingRange = typeof contractorProfile.drivingRange === 'number' ? contractorProfile.drivingRange : 0;
            console.log('[Debug] useEffect fetchClientAndGeocode: Contractor driving range:', drivingRange);
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
    await updateBookingStatus(gigId, 'approved')
    await fetchGigs()
    setActionLoading(null)
  }

  const handleDecline = async (gigId: string) => {
    setActionLoading(gigId)
    await updateBookingStatus(gigId, 'cancelled')
    await fetchGigs()
    setActionLoading(null)
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
    let color = 'bg-gray-200 text-gray-700'
    if (status === 'pending') color = 'bg-yellow-100 text-yellow-800'
    if (status === 'approved') color = 'bg-blue-100 text-blue-800'
    if (status === 'completed') color = 'bg-green-100 text-green-800'
    if (status === 'cancelled') color = 'bg-red-100 text-red-800'
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  // PetDetailItem helper component
  const PetDetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | number | null }) => (
    value ? (
        <div className="flex items-start text-sm">
            <Icon className="w-4 h-4 mr-2 mt-0.5 text-primary flex-shrink-0" />
            <span className="font-medium text-muted-foreground">{label}:&nbsp;</span>
            <span className="text-foreground break-words">{String(value)}</span>
        </div>
    ) : null
  );

  // Format price for display - fixing the Stripe cents formatting issue
  const formatPrice = (price: number, paymentType: 'one_time' | 'daily', numberOfDays: number = 1) => {
    // Convert from cents to dollars if price is over 100
    // This handles the case where prices might be stored in cents in the database
    const isInCents = price > 100 && price % 100 === 0;
    const displayPrice = isInCents ? price / 100 : price;

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
    <main className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Your Gigs</h1>
      {/* Status Filter Bar */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'approved', 'completed', 'cancelled'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status === 'all' ? 'All' : statusLabels[status as keyof typeof statusLabels]}
          </Button>
        ))}
      </div>
      {/* Gigs List */}
      {filteredGigs.length === 0 ? (
        <div className="text-muted-foreground">No gigs found for this status.</div>
      ) : (
        <div className="grid gap-4 w-full">
          {filteredGigs.map(gig => {
            const canMessage = gigMessageEligibility[gig.id] === true;
            return (
              <Card key={gig.id} className="w-full bg-white rounded-lg shadow-md border border-gray-200 flex flex-col gap-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 flex-wrap p-4 pb-2 border-b">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                      {hasMultipleServices(gig) ? (
                        <Badge variant="outline" className="mr-2 bg-primary/10 text-primary">
                          <Package className="h-3 w-3 mr-1" />
                          {gig.services?.length} services
                        </Badge>
                      ) : null}
                      <span className="truncate max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl">{getServiceNames(gig)}</span>
                    </CardTitle>
                    <div className="text-sm text-gray-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-primary" />
                        {getGigDateTimeRange(gig)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-end gap-2 min-w-[120px] sm:min-w-[100px] mt-2 sm:mt-0">
                    <StatusBadge status={gig.status} />
                    <span className={`capitalize text-xs${gig.paymentStatus === 'cancelled' ? ' text-red-600' : ''}`}>{gig.paymentStatus}</span>
                  </div>
                </div>
                <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 pt-2">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground">Client: <span className="font-medium text-foreground">{gig.clientName}</span></span>
                    <span className="text-xs text-muted-foreground">Pets: <span className="font-medium text-foreground">{gig.pets.join(', ')}</span></span>
                    {gig.review && (
                      <span className="text-xs text-muted-foreground">Review: <span className="font-medium text-foreground">{gig.review.rating}★</span> {gig.review.comment}</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-end items-center w-full sm:w-auto mt-2 sm:mt-0">
                    <Button variant="outline" className="text-sm px-3 py-1 rounded-full shadow-sm w-full sm:w-auto" onClick={() => setDetailGig(gig)}>
                      Details
                    </Button>
                    {canMessage && (
                      <Link href={`/dashboard/messages/${gig.id}`} passHref>
                        <Button variant="outline" className="text-sm px-3 py-1 rounded-full shadow-sm w-full sm:w-auto">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message Client
                        </Button>
                      </Link>
                    )}
                    {gig.status === 'pending' && (
                      <>
                        <Button variant="default" disabled={actionLoading === gig.id} onClick={() => handleAccept(gig.id)}>
                          {actionLoading === gig.id ? 'Accepting...' : 'Accept'}
                        </Button>
                        <Button variant="destructive" disabled={actionLoading === gig.id} onClick={() => handleDecline(gig.id)}>
                          {actionLoading === gig.id ? 'Declining...' : 'Decline'}
                        </Button>
                      </>
                    )}
                    {gig.status === 'approved' && !gig.contractorCompleted && (
                      <>
                        <Button variant="default" disabled={actionLoading === gig.id} onClick={() => handleMarkCompleted(gig.id)}>
                          {actionLoading === gig.id ? 'Marking...' : 'Mark as Completed'}
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="text-sm px-3 py-1 rounded-full shadow-sm"
                          onClick={() => setCancelGigId(gig.id)}
                          disabled={actionLoading === gig.id}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {gig.status === 'approved' && gig.contractorCompleted && (
                      <span className="text-xs text-muted-foreground">Waiting for client...</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      {/* Gig Details Modal */}
      <Dialog open={!!detailGig} onOpenChange={() => setDetailGig(null)}>
        <DialogContent className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gig Details</DialogTitle>
          </DialogHeader>
          {isDetailLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <div className="text-muted-foreground text-sm">Loading gig details...</div>
            </div>
          ) : detailGig && (
            <section className="space-y-6">
              {/* Status & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b pb-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold shadow-sm
                    ${detailGig.status === 'completed' ? 'bg-green-100 text-green-800' :
                      detailGig.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      detailGig.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-200 text-gray-700'}`}
                  >
                    {detailGig.status?.charAt(0).toUpperCase() + detailGig.status?.slice(1)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">Payment Status</span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800 capitalize shadow-sm">
                    {detailGig.paymentStatus}
                  </span>
                </div>
                {/* Date, Time, and Duration (responsive) */}
                <div className="col-span-1 sm:col-span-2 mt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 bg-muted/50 rounded-md px-4 py-3 w-full">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground">Date & Time</span>
                      <span className="font-bold text-base flex items-center gap-2 break-words">
                        <Clock className="w-4 h-4 text-primary shrink-0" />
                        {getGigDateTimeRange(detailGig)}
                      </span>
                    </div>
                    <div className="flex flex-col flex-none sm:border-l sm:border-border sm:pl-6">
                      <span className="text-xs text-muted-foreground">Duration</span>
                      <span className="font-semibold text-base">{detailGig.numberOfDays} day{detailGig.numberOfDays !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Client Info (separate row) */}
              {clientProfile && (
                <div className="border-b pb-4 flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {clientProfile.avatar ? (
                      <AvatarImage src={clientProfile.avatar} alt={clientProfile.name} />
                    ) : (
                      <AvatarFallback>{clientProfile.name?.charAt(0) ?? '?'}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="font-semibold text-lg">{clientProfile.name}</div>
                    <div className="text-xs text-muted-foreground">{clientProfile.email}</div>
                    <div className="text-xs text-muted-foreground">{clientProfile.phone}</div>
                    <div className="text-xs text-muted-foreground">{[clientProfile.address, clientProfile.city, clientProfile.state, clientProfile.postalCode].filter(Boolean).join(', ')}</div>
                  </div>
                </div>
              )}
              {/* Map Section */}
              {(contractorLatLng && clientLatLng) && (
                <div className="w-full h-64 mb-2 relative">
                  <ContractorMap
                    lat={contractorLatLng.lat}
                    lng={contractorLatLng.lng}
                    miles={contractorDrivingRange}
                    clientLat={clientLatLng?.lat}
                    clientLng={clientLatLng?.lng}
                  />
                  <div className="absolute top-2 left-2 bg-background/80 rounded px-3 py-1 text-xs font-medium shadow border border-gray-200">
                    Contractor Driving Range: <span className="font-semibold">{contractorDrivingRange} miles</span>
                  </div>
                </div>
              )}
              {/* Distance to Gig */}
              {(contractorLatLng && clientLatLng && typeof distanceMiles === 'number') && (
                <div className="mb-2 text-sm text-muted-foreground">
                  <span className="font-medium">Distance to Gig:</span> {distanceMiles.toFixed(2)} miles
                </div>
              )}
              {/* Service & Payment */}
              <div className="border-b pb-4">
                <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary"/>
                  Services & Payment
                </h3>
                <div className="space-y-3">
                  {detailGig.services && detailGig.services.length > 0 ? detailGig.services.map((service, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-muted/50 rounded-md px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-base">{service.name || service.serviceId}</span>
                        <span className="text-xs text-muted-foreground">
                          {service.paymentType === 'one_time' ? 'One-time payment' : 'Daily rate'}
                        </span>
                      </div>
                      <div className="text-right mt-2 sm:mt-0">
                        <span className="font-bold text-lg">{formatPrice(service.price, service.paymentType, detailGig.numberOfDays || 1)}</span>
                      </div>
                    </div>
                  )) : <div className="text-muted-foreground">No service details available</div>}
                  <div className="flex justify-between items-center border-t pt-3 mt-2">
                    <span className="font-semibold text-base">Total Payment</span>
                    <span className="font-bold text-primary text-xl">${(detailGig.paymentAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-dashed pt-3 text-sm">
                    <span className="text-muted-foreground">Platform Fee (5%)</span>
                    <span className="text-red-600">-${(detailGig.platformFee || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span className="text-red-600">-${((detailGig.stripeFee && detailGig.stripeFee > 0 ? detailGig.stripeFee : (detailGig.paymentAmount || 0) * 0.029 + 0.3).toFixed(2))}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="font-semibold">Your Payout</span>
                    <span className="font-semibold text-green-600 text-lg">${getNetPayout(detailGig).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              {/* Pet Info */}
              {bookedPetsDetails.length > 0 && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center"><PawPrint className="w-5 h-5 mr-2 text-primary"/>Pet Information</h3>
                  <div className="flex flex-col gap-2">
                    {bookedPetsDetails.map((pet, index) => {
                      const isExpanded = expandedPetIndex === index
                      return (
                        <div key={pet.id} className={`rounded-lg border border-gray-200 bg-muted/50 transition-shadow ${isExpanded ? 'shadow-lg' : 'hover:shadow'} relative`}> 
                          <button
                            type="button"
                            className="w-full flex items-center gap-4 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-left"
                            aria-expanded={isExpanded}
                            onClick={() => setExpandedPetIndex(isExpanded ? -1 : index)}
                          >
                            <Avatar className="w-12 h-12 border-2 border-primary/50">
                              <AvatarImage src={pet.photoUrl || '/avatars/default-pet.png'} alt={pet.name} className="object-cover" />
                              <AvatarFallback className="bg-primary/10 text-primary text-xl">{pet.name ? pet.name[0].toUpperCase() : 'P'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-base truncate">{pet.name}</div>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                                {pet.animalType && <span><strong>Type:</strong> {pet.animalType}</span>}
                                {pet.breed && <span><strong>Breed:</strong> {pet.breed}</span>}
                                {pet.age && <span><strong>Age:</strong> {pet.age} yrs</span>}
                                {pet.weight && <span><strong>Weight:</strong> {pet.weight}</span>}
                              </div>
                            </div>
                            <span className="ml-2 text-primary">{isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
                          </button>
                          {isExpanded && (
                            <div className="px-6 pb-4 pt-1 animate-fade-in">
                              <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 mt-2">
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
    </main>
  )
}
