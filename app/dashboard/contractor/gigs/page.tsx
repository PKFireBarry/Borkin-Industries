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
import { PawPrint, Pill, Utensils, Clock, Dog, Info, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Booking } from '@/types/booking'
import { getAllPlatformServices } from '@/lib/firebase/services'

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
        <div className="space-y-6">
          {filteredGigs.map(gig => (
            <Card key={gig.id} className="shadow-sm">
              <CardContent className="py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-lg shadow-md border border-gray-200">
                <div>
                  <CardTitle className="mb-2 flex items-center">
                    {hasMultipleServices(gig) ? (
                      <Badge variant="outline" className="mr-2 bg-primary/10 text-primary">
                        <Package className="h-3 w-3 mr-1" />
                        {gig.services?.length} services
                      </Badge>
                    ) : null}
                    {getServiceNames(gig)}
                  </CardTitle>
                  <div className="text-sm mb-1"><span className="font-medium">Client:</span> {gig.clientName}</div>
                  <div className="text-sm mb-1"><span className="font-medium">Pets:</span> {gig.pets.join(', ')}</div>
                  <div className="text-sm mb-1">
                    <span className="font-medium">Date & Time:</span> {getGigDateTimeRange(gig)}
                  </div>
                  <div className="text-sm mb-1"><span className="font-medium">Status:</span> <StatusBadge status={gig.status} /></div>
                  {gig.review && (
                    <span className="text-xs text-muted-foreground">Review: <span className="font-medium text-foreground">{gig.review.rating}★</span> {gig.review.comment}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-end items-center">
                  <Button variant="outline" className="text-sm px-3 py-1 rounded-full shadow-sm" onClick={() => setDetailGig(gig)}>
                    Details
                  </Button>
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
          ))}
        </div>
      )}
      {/* Gig Details Modal */}
      <Dialog open={!!detailGig} onOpenChange={() => setDetailGig(null)}>
        <DialogContent className="w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gig Details</DialogTitle>
          </DialogHeader>
          {detailGig && (
            <div className="space-y-6 py-4 max-h-[80vh] overflow-y-auto pr-2">
              {/* Client Info Section */}
              {clientProfile && (
                <div className="flex items-center gap-4 border-b pb-4">
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
              {contractorLatLng && clientLatLng && (
                <div className="w-full h-64 mb-4">
                  <ContractorMap
                    lat={contractorLatLng.lat}
                    lng={contractorLatLng.lng}
                    miles={contractorDrivingRange}
                    clientLat={clientLatLng?.lat}
                    clientLng={clientLatLng?.lng}
                  />
                </div>
              )}
              {!contractorLatLng && clientLatLng && (
                <div className="w-full h-64 mb-4">
                  <ContractorMap
                    lat={clientLatLng.lat}
                    lng={clientLatLng.lng}
                    miles={0}
                  />
                </div>
              )}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">Booking Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                    <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-medium">
                      {detailGig?.status?.charAt(0).toUpperCase() + detailGig?.status?.slice(1)}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Date & Time</div>
                    <div className="font-medium text-base">
                      {getGigDateTimeRange(detailGig)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Payment Status</div>
                     <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        detailGig?.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        detailGig?.paymentStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                        detailGig?.paymentStatus === 'escrow' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800' // Default for unpaid or pending (if applicable)
                    }`}>
                       {detailGig?.paymentStatus?.charAt(0).toUpperCase() + detailGig?.paymentStatus?.slice(1)}
                    </span>
                  </div>

                  {/* Add Duration Details section */}
                  {detailGig?.time?.startTime && detailGig?.time?.endTime && (
                    <div className="sm:col-span-2 border rounded-md p-3 mt-2 bg-muted/50">
                      <h4 className="text-sm font-semibold mb-2 flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-primary" />
                        Duration Details
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total days:</span>
                          <span className="font-medium ml-2">
                            {detailGig.numberOfDays || 1} day{(detailGig.numberOfDays || 1) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {distanceMiles !== null && clientLatLng && contractorLatLng && (
                    <div className="sm:col-span-2 mt-2">
                      <div className="text-xs text-muted-foreground mb-1">Distance to Gig</div>
                      <div className="font-medium text-base">{distanceMiles.toFixed(2)} miles</div>
                    </div>
                  )}
                </div>
              </div>
              {/* Display payment breakdown for each service */}
              <div className="border border-gray-200 rounded-md p-4 mt-4">
                <h3 className="text-base font-semibold mb-3 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-primary"/>
                  Service Details
                </h3>
                
                {detailGig?.services && detailGig.services.length > 0 ? (
                  <div className="space-y-3">
                    {detailGig.services.map((service, idx) => (
                      <div key={idx} className="flex justify-between items-center pb-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{service.name || service.serviceId}</span>
                          <span className="text-xs text-muted-foreground">
                            {service.paymentType === 'one_time' ? 'One-time payment' : 'Daily rate'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatPrice(service.price, service.paymentType, detailGig.numberOfDays || 1)}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t pt-3 mt-2 flex justify-between items-center">
                      <div className="font-semibold">Total Payment:</div>
                      <div className="font-semibold text-primary text-lg">
                        ${((detailGig.paymentAmount || 0)).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="border-t border-dashed pt-3 flex justify-between items-center text-sm">
                      <div className="text-muted-foreground">Platform Fee (5%):</div>
                      <div className="text-red-600">-${((detailGig.platformFee || 0)).toFixed(2)}</div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm mb-1">
                      <div className="text-muted-foreground">Processing Fee:</div>
                      <div className="text-red-600">-${((detailGig.stripeFee && detailGig.stripeFee > 0 ? detailGig.stripeFee : (detailGig.paymentAmount || 0) * 0.029 + 0.3)).toFixed(2)}</div>
                    </div>
                    
                    <div className="border-t pt-3 flex justify-between items-center">
                      <div className="font-semibold">Your Payout:</div>
                      <div className="font-semibold text-green-600 text-lg">
                        ${getNetPayout(detailGig).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">No service details available</div>
                )}
              </div>
              {/* Enhanced Pet Information Section */}
              {bookedPetsDetails.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center"><PawPrint className="w-5 h-5 mr-2 text-primary"/>Pet Information</h3>
                  {bookedPetsDetails.map((pet, index) => (
                    <div key={pet.id} className={`py-4 ${index < bookedPetsDetails.length - 1 ? 'border-b border-dashed' : ''}`}>
                      <div className="flex flex-col sm:flex-row items-center gap-4 mb-3">
                          <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-primary/50">
                              <AvatarImage src={pet.photoUrl || '/avatars/default-pet.png'} alt={pet.name} className="object-cover" />
                              <AvatarFallback className="bg-primary/10 text-primary text-xl">{pet.name ? pet.name[0].toUpperCase() : 'P'}</AvatarFallback>
                          </Avatar>
                          <div className="text-center sm:text-left">
                              <h4 className="text-lg font-semibold text-gray-800 mb-0.5">{pet.name}</h4>
                              <div className="flex flex-wrap justify-center sm:justify-start gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                  <span><strong>Age:</strong> {pet.age || 'N/A'} yrs</span>
                                  {pet.animalType && <span><strong>Type:</strong> {pet.animalType}</span>}
                                  {pet.breed && <span><strong>Breed:</strong> {pet.breed}</span>}
                                  {pet.weight && <span><strong>Weight:</strong> {pet.weight}</span>}
                              </div>
                          </div>
                      </div>
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
                  ))}
                </div>
              )}
              {detailGig.review && (
                <div className="border-t pt-4">
                  <div className="text-xs text-muted-foreground mb-2 font-semibold">Review</div>
                  <div className="text-sm">Rating: <span className="font-bold">{detailGig.review.rating}</span></div>
                  {detailGig.review.comment && <div className="text-sm mt-1">"{detailGig.review.comment}"</div>}
                </div>
              )}
              <div className="border-t pt-4 text-xs text-muted-foreground">
                <div className="mb-1">Booking ID</div>
                <div className="font-mono break-all mb-1">{detailGig?.id ?? ''}</div>
              </div>
              {clientProfile && (
                <div className="flex justify-end mb-4">
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