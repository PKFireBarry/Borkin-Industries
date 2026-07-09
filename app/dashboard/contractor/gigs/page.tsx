"use client"
import { useRequireRole } from '../../use-require-role'
import { Suspense, useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUser } from '@clerk/nextjs'
import { getGigsForContractor, updateBookingStatus, setContractorCompleted } from '@/lib/firebase/bookings'
import { getClientById, getPetsByIds } from '@/lib/firebase/client'
import { getContractorProfile } from '@/lib/firebase/contractors'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import dynamic from 'next/dynamic'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Pet } from '@/types/client'
import { PawPrint, Pill, Utensils, Clock, Dog, Info, Package, ChevronDown, ChevronUp, Loader2, MessageSquare, CalendarDays, MapPinned, Map as MapIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Booking } from '@/types/booking'
import { getAllPlatformServices } from '@/lib/firebase/services'
import type { PlatformService } from '@/types/service'
import { isOpenBookingStatus } from '@/app/actions/messaging-actions'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EmptyState } from '../../components/empty-state'
import { DashboardPageContent, DashboardPageHeader, DashboardPageShell } from '../../components/dashboard-shell'
import { ModalHeader } from '../../components/modal-header'
import { ModalShell } from '../../components/modal-shell'
import { RailDots } from '../../components/rail-dots'
import { StatusBadge } from '../../components/status-badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRailScroll } from '@/hooks/use-rail-scroll'

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
  // Coupon information
  couponCode?: string
  couponDiscount?: number // Amount saved in currency
  originalPrice?: number // Original price before coupon
}

const statusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const DEFAULT_DESKTOP_PAGINATION_HEIGHT = 96
const DESKTOP_GIGS_BOTTOM_BUFFER = 72
const DESKTOP_GIGS_FIT_SAFETY_BUFFER = 32

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

function getClientLocationLabel(clientProfile?: { address?: string; city?: string; state?: string; postalCode?: string }) {
  return [clientProfile?.address, clientProfile?.city, clientProfile?.state, clientProfile?.postalCode].filter(Boolean).join(', ')
}

function getGoogleMapsUrl(address: string, latLng?: { lat: number; lng: number } | null) {
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  if (latLng) return `https://www.google.com/maps/search/?api=1&query=${latLng.lat},${latLng.lng}`
  return null
}

function getAppleMapsUrl(address: string, latLng?: { lat: number; lng: number } | null) {
  if (address) return `https://maps.apple.com/?q=${encodeURIComponent(address)}`
  if (latLng) return `https://maps.apple.com/?ll=${latLng.lat},${latLng.lng}`
  return null
}

// Update getGoogleCalendarUrl to use robust local date parsing
function getGoogleCalendarUrl(gig: Gig, clientName: string, petNames: string[], clientProfile?: { name?: string; phone?: string; address?: string; city?: string; state?: string; postalCode?: string; emergencyContact?: { name?: string; phone?: string; relationship?: string }; petCareProvider?: { name?: string; phone?: string; address?: string }; emergencyClinic?: { name?: string; phone?: string; address?: string } }): string {
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
  const clientAddress = getClientLocationLabel(clientProfile);
  const title = `Pet Care for ${petNames.join(', ') || 'your pet'} with ${clientFullName}`;
  const description = [
    `Client: ${clientFullName}`,
    clientPhone ? `Phone: ${clientPhone}` : '',
    clientAddress ? `Address: ${clientAddress}` : '',
    clientProfile?.emergencyContact?.name ? `Emergency Contact: ${clientProfile.emergencyContact.name}${clientProfile.emergencyContact.relationship ? ` (${clientProfile.emergencyContact.relationship})` : ''}${clientProfile.emergencyContact.phone ? ` - ${clientProfile.emergencyContact.phone}` : ''}` : '',
    clientProfile?.petCareProvider?.name ? `Primary Care: ${clientProfile.petCareProvider.name}${clientProfile.petCareProvider.phone ? ` - ${clientProfile.petCareProvider.phone}` : ''}${clientProfile.petCareProvider.address ? `, ${clientProfile.petCareProvider.address}` : ''}` : '',
    clientProfile?.emergencyClinic?.name ? `Emergency Clinic: ${clientProfile.emergencyClinic.name}${clientProfile.emergencyClinic.phone ? ` - ${clientProfile.emergencyClinic.phone}` : ''}${clientProfile.emergencyClinic.address ? `, ${clientProfile.emergencyClinic.address}` : ''}` : '',
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

function getGigSortTimestamp(dateStr?: string) {
  if (!dateStr) return 0

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day).getTime()
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    const [datePart] = dateStr.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    return new Date(year, month - 1, day).getTime()
  }

  const parsedDate = new Date(dateStr)
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime()
}

function getGigPriority(gig: Gig) {
  const needsContractorAction = gig.status === 'approved' && gig.contractorCompleted !== true

  if (needsContractorAction) return 0
  if (gig.status === 'pending') return 1
  if (gig.status === 'approved') return 2
  if (gig.status === 'completed') return 3
  if (gig.status === 'cancelled') return 4

  return 5
}

function compareGigs(a: Gig, b: Gig) {
  const priorityDelta = getGigPriority(a) - getGigPriority(b)
  if (priorityDelta !== 0) return priorityDelta

  return compareGigsChronologically(a, b)
}

function compareGigsChronologically(a: Gig, b: Gig) {
  const aTimestamp = getGigSortTimestamp(a.startDate || a.date)
  const bTimestamp = getGigSortTimestamp(b.startDate || b.date)
  const isHistoricalStatus = a.status === 'completed' || a.status === 'cancelled'

  return isHistoricalStatus ? bTimestamp - aTimestamp : aTimestamp - bTimestamp
}

function ContractorGigsPageContent() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [filter, setFilter] = useState<'all' | Gig['status']>('all')
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<{ gigId: string; action: 'accept' | 'decline' | 'complete' } | null>(null)
  const [detailGig, setDetailGig] = useState<Gig | null>(null)
  const [clientProfile, setClientProfile] = useState<any>(null)
  const [clientLatLng, setClientLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [contractorLatLng, setContractorLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null)
  const [contractorDrivingRange, setContractorDrivingRange] = useState<number>(0)
  const [bookedPetsDetails, setBookedPetsDetails] = useState<Pet[]>([])
  const [cancelGigId, setCancelGigId] = useState<string | null>(null)
  const [confirmCompleteGigId, setConfirmCompleteGigId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [expandedPetIndex, setExpandedPetIndex] = useState<number>(0)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [gigMessageEligibility, setGigMessageEligibility] = useState<Record<string, boolean>>({})
  const [isPaymentBreakdownExpanded, setIsPaymentBreakdownExpanded] = useState(false)
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const [activeDesktopPage, setActiveDesktopPage] = useState(1)
  const [desktopGigsPerPage, setDesktopGigsPerPage] = useState(3)
  const [desktopPaginationHeight, setDesktopPaginationHeight] = useState(DEFAULT_DESKTOP_PAGINATION_HEIGHT)
  const [desktopViewportSectionHeight, setDesktopViewportSectionHeight] = useState<number | null>(null)
  const gigsSectionRef = useRef<HTMLDivElement | null>(null)
  const firstGigCardRef = useRef<HTMLDivElement | null>(null)
  const desktopPaginationRef = useRef<HTMLDivElement | null>(null)
  const gigRailContainerRef = useRef<HTMLDivElement | null>(null)

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
    const detailGigId = searchParams.get('detail')

    if (!detailGigId || gigs.length === 0) return

    const requestedGig = gigs.find((gig) => gig.id === detailGigId)
    if (!requestedGig) return
    if (detailGig?.id === requestedGig.id) return

    setDetailGig(requestedGig)

    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete('detail')
    const nextQueryString = nextSearchParams.toString()
    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, { scroll: false })
  }, [detailGig?.id, gigs, pathname, router, searchParams])

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

      const gigClientId = (detailGig as any).clientId;
      const gigPetIds = (detailGig as any).petIds;

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
          setClientProfile(clientData);

          if (clientData && clientData.pets && gigPetIds && gigPetIds.length > 0) {
            const petsForThisGig = clientData.pets.filter((p: Pet) => gigPetIds.includes(p.id));
            setBookedPetsDetails(petsForThisGig);
          }
        } catch (err) {
          console.error('[Debug] useEffect fetchClientAndGeocode: Error fetching client profile:', err);
        }
      }

      if (clientData) {
        const clientQuery = [clientData.address, clientData.city, clientData.state, clientData.postalCode].filter(Boolean).join(', ');
        if (clientQuery) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clientQuery)}`);
            const data = await res.json();
            if (data && data[0]) {
              const latLng = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
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
          if (contractorProfile) {
            // Set driving range from contractor's profile - extract numeric value from string
            const drivingRangeStr = contractorProfile.drivingRange || '';
            const drivingRangeMatch = drivingRangeStr.match(/(\d+(?:\.\d+)?)/);
            const drivingRange = drivingRangeMatch ? parseFloat(drivingRangeMatch[1]) : 0;
            setContractorDrivingRange(drivingRange);

            if (contractorProfile.address && contractorProfile.city && contractorProfile.state && contractorProfile.postalCode) {
              const contractorQuery = [contractorProfile.address, contractorProfile.city, contractorProfile.state, contractorProfile.postalCode].filter(Boolean).join(', ');
              if (contractorQuery) {
                try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(contractorQuery)}`);
                  const data = await res.json();
                  if (data && data[0]) {
                    const latLng = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
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
      setActionLoading({ gigId, action: 'accept' })
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
    setActionLoading({ gigId, action: 'decline' })
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
    setActionLoading({ gigId, action: 'complete' })
    try {
      await setContractorCompleted(gigId, true)

      const reminderResponse = await fetch('/api/notifications/completion-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: gigId, reminderNumber: 1 }),
      })

      if (!reminderResponse.ok) {
        console.error('Failed to send initial completion reminder for gig', gigId)
      }

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
  const formatDateTime = (date: string | undefined, time?: { startTime?: string, endTime?: string }) => {
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

  // Format price for display
  // Service prices attached to booking services are stored in cents.
  const formatPrice = (price: number, paymentType: 'one_time' | 'daily', numberOfDays: number = 1) => {
    const normalizedPrice = price / 100

    if (paymentType === 'one_time') {
      return `$${normalizedPrice.toFixed(2)}`;
    } else {
      // For daily services, show total and rate
      const dailyRate = normalizedPrice;
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

  // When essential modal data is loaded, stop loading state
  // Note: Geocoding (contractorLatLng, clientLatLng) is not required to show the modal
  useEffect(() => {
    if (
      detailGig &&
      clientProfile &&
      bookedPetsDetails
    ) {
      setIsDetailLoading(false)
    }
  }, [detailGig, clientProfile, bookedPetsDetails])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const updateViewport = () => setIsDesktopViewport(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => {
      mediaQuery.removeEventListener('change', updateViewport)
    }
  }, [])

  const filteredGigs = filter === 'all' ? gigs : gigs.filter(g => g.status === filter)
  const sortedFilteredGigs = [...filteredGigs].sort(filter === 'all' ? compareGigs : compareGigsChronologically)
  const pendingCount = gigs.filter((gig) => gig.status === 'pending').length
  const approvedCount = gigs.filter((gig) => gig.status === 'approved').length
  const completedCount = gigs.filter((gig) => gig.status === 'completed').length
  const desktopPageCount = Math.max(1, Math.ceil(sortedFilteredGigs.length / desktopGigsPerPage))
  const visibleGigs = isDesktopViewport
    ? sortedFilteredGigs.slice((activeDesktopPage - 1) * desktopGigsPerPage, activeDesktopPage * desktopGigsPerPage)
    : sortedFilteredGigs

  const { railRef: gigRailRef, clampedDotIndex: gigRailDotIndex, onScroll: handleGigRailScroll } = useRailScroll({
    slideSelector: '[data-contractor-gig-slide="true"]',
    itemCount: visibleGigs.length,
  })

  useEffect(() => {
    setActiveDesktopPage(1)
  }, [filter])

  useEffect(() => {
    if (activeDesktopPage > desktopPageCount) {
      setActiveDesktopPage(desktopPageCount)
    }
  }, [activeDesktopPage, desktopPageCount])

  useEffect(() => {
    if (!isDesktopViewport) {
      setDesktopViewportSectionHeight(null)
      return
    }

    const updateDesktopGigsPerPage = () => {
      const sectionTop = gigsSectionRef.current?.getBoundingClientRect().top
      const firstCardHeight = firstGigCardRef.current?.getBoundingClientRect().height
      const paginationHeight = desktopPaginationRef.current?.getBoundingClientRect().height

      if (typeof sectionTop !== 'number') return

      const sectionHeight = Math.max(0, window.innerHeight - sectionTop - DESKTOP_GIGS_BOTTOM_BUFFER)
      setDesktopViewportSectionHeight((previousHeight) => (previousHeight === sectionHeight ? previousHeight : sectionHeight))

      if (typeof paginationHeight === 'number') {
        setDesktopPaginationHeight((previousHeight) => (previousHeight === paginationHeight ? previousHeight : paginationHeight))
      }

      if (typeof firstCardHeight !== 'number') return

      const gridGap = 16
      const availableHeight = Math.max(0, sectionHeight - desktopPaginationHeight - DESKTOP_GIGS_FIT_SAFETY_BUFFER)
      const visibleRows = Math.max(1, Math.floor((availableHeight + gridGap) / (firstCardHeight + gridGap)))
      const desktopColumns = window.innerWidth >= 1280 ? 4 : window.innerWidth >= 1024 ? 3 : 1
      const nextPageSize = Math.max(desktopColumns, visibleRows * desktopColumns)

      setDesktopGigsPerPage((previousPageSize) => (previousPageSize === nextPageSize ? previousPageSize : nextPageSize))
    }

    const frameId = window.requestAnimationFrame(updateDesktopGigsPerPage)
    window.addEventListener('resize', updateDesktopGigsPerPage)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateDesktopGigsPerPage)
    }
  }, [activeDesktopPage, desktopPaginationHeight, isDesktopViewport, sortedFilteredGigs.length])

  useEffect(() => {
    if (isDesktopViewport) {
      gigRailContainerRef.current?.style.removeProperty('--rail-card-height')
      return
    }

    const updateMobileRailCardHeight = () => {
      const railContainer = gigRailContainerRef.current
      if (!railContainer) return

      const topOffset = railContainer.getBoundingClientRect().top
      const dotsAndBottomSpacing = 22
      const nextCardHeight = Math.max(260, window.innerHeight - topOffset - dotsAndBottomSpacing)

      railContainer.style.setProperty('--rail-card-height', `${nextCardHeight}px`)
    }

    const frameId = window.requestAnimationFrame(updateMobileRailCardHeight)
    window.addEventListener('resize', updateMobileRailCardHeight)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateMobileRailCardHeight)
    }
  }, [isDesktopViewport, visibleGigs.length])

  if (!isLoaded || !isAuthorized) return null
  if (loading) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
        <DashboardPageContent>
          <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-12 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-600">Loading gigs...</p>
          </div>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }
  if (error) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
        <DashboardPageContent>
          <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
      <DashboardPageContent className="space-y-6 pb-12 lg:space-y-8 lg:pb-0">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)} className="space-y-6 lg:space-y-8">
          <DashboardPageHeader
            variant="summary"
            title="Your Gigs"
            description="Track incoming requests, manage approved bookings, and keep an eye on completed work from one place."
            surfaceClassName="from-white via-blue-50/80 to-emerald-50/70"
            eyebrow={<Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">Contractor gigs</Badge>}
            meta={
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm">
                  <Badge className="border-slate-200 bg-white text-slate-700">{sortedFilteredGigs.length} visible</Badge>
                  <Badge className="border-amber-200 bg-amber-100 text-amber-700">{pendingCount} pending</Badge>
                  <Badge className="border-blue-200 bg-blue-100 text-blue-700">{approvedCount} approved</Badge>
                  <Badge className="border-green-200 bg-green-100 text-green-700">{completedCount} completed</Badge>
                </div>
                <TabsList className="grid h-11 w-full grid-cols-5 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm sm:h-12">
                  {(['all', 'pending', 'approved', 'completed', 'cancelled'] as const).map((status) => (
                    <TabsTrigger
                      key={status}
                      value={status}
                      className="rounded-xl px-1 text-[11px] font-medium capitalize transition-all duration-200 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-2 sm:text-sm"
                    >
                      {status === 'all' ? 'All' : statusLabels[status]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            }
          />

          {/* Gigs List or Empty State */}
          {sortedFilteredGigs.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-10 w-10 text-slate-400" />}
              title="No gigs found"
              description={filter === 'all' ? "You don't have any gigs yet. New booking requests will appear here." : `No gigs found with "${statusLabels[filter as keyof typeof statusLabels]}" status.`}
              iconInCircle
              iconWrapperClassName="bg-slate-100"
              className="py-20"
              titleClassName="text-xl"
            />
          ) : (
            <div
              ref={gigsSectionRef}
              className="flex flex-col gap-6"
              style={isDesktopViewport && desktopViewportSectionHeight ? { minHeight: `${desktopViewportSectionHeight}px` } : undefined}
            >
              <div
                ref={gigRailContainerRef}
                className="-mx-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:py-0"
              >
                <div
                  ref={gigRailRef}
                  onScroll={handleGigRailScroll}
                  className="flex snap-x snap-mandatory gap-4 overscroll-x-contain overflow-x-auto scroll-px-[12vw] pl-[12vw] pr-[12vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:pl-0 lg:pr-0 lg:scroll-px-0 xl:grid-cols-4"
                >
                  {visibleGigs.map((gig, index) => {
                    const canMessage = gigMessageEligibility[gig.id] === true
                    return (
                      <div
                        key={gig.id}
                        ref={index === 0 ? firstGigCardRef : undefined}
                        data-contractor-gig-slide="true"
                        className="block w-[76vw] min-w-[16.25rem] max-w-[17.5rem] shrink-0 snap-center snap-always lg:w-auto lg:min-w-0 lg:max-w-none"
                      >
                        <Card className="group flex h-[var(--rail-card-height,24rem)] flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg sm:h-full">
                   {/* Header Section */}
                  <div className="flex min-h-0 flex-1 flex-col p-4 pb-4 sm:p-5 sm:pb-4 lg:p-5 lg:pb-4">
                    <div className="flex min-h-0 flex-1 flex-col gap-4">
                      <div className="flex min-h-0 flex-1 flex-col min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2.5">
                          <StatusBadge status={gig.status} size="compact" />
                          {hasMultipleServices(gig) && (
                            <Badge variant="secondary" className="rounded-full border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary sm:px-3 sm:text-xs">
                              <Package className="mr-1 h-3 w-3" />
                              {gig.services?.length} services
                            </Badge>
                          )}
                          <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 lg:hidden">
                            <span className="text-[10px] uppercase tracking-[0.12em] text-green-600">Earn</span>
                            <span className="text-sm font-bold text-green-700">${getNetPayout(gig).toFixed(2)}</span>
                          </div>
                          <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium lg:hidden ${gig.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : gig.paymentStatus === 'escrow'
                              ? 'bg-blue-100 text-blue-700'
                              : gig.paymentStatus === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                            {gig.paymentStatus}
                          </div>
                        </div>

                        <h3 className="mb-2 line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-5 text-slate-900 transition-colors group-hover:text-primary sm:min-h-0 sm:text-lg sm:leading-6 lg:text-xl">
                          {getServiceNames(gig)}
                        </h3>

                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-600">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Schedule</div>
                          <div className="mt-1 flex items-start gap-2 font-medium text-slate-900">
                            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="line-clamp-2">{getGigDateTimeRange(gig)}</span>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-700">
                          <div className="rounded-xl bg-blue-50 px-3 py-2.5 ring-1 ring-blue-200">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">Client</div>
                            <div className="mt-1 truncate font-semibold text-slate-900">{gig.clientName}</div>
                          </div>
                          <div className="rounded-xl bg-purple-50 px-3 py-2.5 ring-1 ring-purple-200">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-700">Pets</div>
                            <div className="mt-1 truncate font-semibold text-slate-900">{gig.pets.length > 0 ? gig.pets.join(', ') : 'No pets listed'}</div>
                          </div>
                          <div className="rounded-xl bg-green-50 px-3 py-2.5 ring-1 ring-green-200">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-green-700">Your earnings</div>
                            <div className="mt-1 font-semibold text-slate-900">${getNetPayout(gig).toFixed(2)}</div>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Payment</div>
                            <div className="mt-1 truncate font-semibold capitalize text-slate-900">{gig.paymentStatus}</div>
                          </div>
                        </div>

                        {gig.couponCode ? (
                          <div className="mt-3 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3">
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-green-700">Coupon applied</p>
                                <p className="truncate font-medium text-green-700">{gig.couponCode}</p>
                              </div>
                              <span className="shrink-0 text-sm font-semibold text-green-700">-${(gig.couponDiscount || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        ) : null}
                    </div>
                  </div>
                  </div>

                  {/* Actions Section */}
                  <div className="mt-auto border-t border-slate-200/80 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5 lg:px-6 lg:pb-6">
                    <div className="space-y-3">
                      {gig.status === 'pending' && (
                        <Button
                          disabled={actionLoading?.gigId === gig.id}
                          onClick={() => handleAccept(gig.id)}
                          variant="petCta"
                          size="pill"
                          className="w-full justify-center bg-green-600 text-white shadow-sm hover:bg-green-700"
                        >
                          {actionLoading?.gigId === gig.id && actionLoading.action === 'accept' ? (
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                              Accepting...
                            </div>
                          ) : (
                            'Accept Booking'
                          )}
                        </Button>
                      )}

                      {gig.status === 'approved' && !gig.contractorCompleted && (
                        <Button
                          disabled={actionLoading?.gigId === gig.id}
                          onClick={() => setConfirmCompleteGigId(gig.id)}
                          variant="petCta"
                          size="pill"
                          className="w-full justify-center"
                        >
                          {actionLoading?.gigId === gig.id && actionLoading.action === 'complete' ? (
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                              Marking Complete...
                            </div>
                          ) : (
                            'Mark Complete'
                          )}
                        </Button>
                      )}

                      {gig.status === 'approved' && gig.contractorCompleted ? (
                        <div className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                            <span className="font-medium">Awaiting client confirmation</span>
                          </div>
                          <span className="hidden text-xs text-blue-600 sm:inline">Booking closed after client confirms</span>
                        </div>
                      ) : null}

                       <div className="grid grid-cols-2 gap-2.5">
                         <Button
                           variant="outline"
                           onClick={() => setDetailGig(gig)}
                           size="pillSm"
                           className="w-full justify-center border-slate-200 bg-white/90 hover:border-primary hover:bg-primary/5"
                         >
                           View Details
                         </Button>

                         {canMessage ? (
                           <Link href={`/dashboard/messages/${gig.id}`} passHref className="block w-full">
                             <Button
                               variant="outline"
                               size="pillSm"
                               className="w-full justify-center border-slate-200 bg-white/90 hover:border-primary hover:bg-primary/5"
                             >
                               <MessageSquare className="mr-2 h-4 w-4" />
                               Message
                            </Button>
                          </Link>
                        ) : null}

                        {gig.status === 'pending' ? (
                           <Button
                              variant="outline"
                              disabled={actionLoading?.gigId === gig.id}
                              onClick={() => handleDecline(gig.id)}
                              size="pillSm"
                              className="w-full justify-center border-red-200 bg-red-50/60 text-red-600 hover:border-red-300 hover:bg-red-50"
                            >
                              {actionLoading?.gigId === gig.id && actionLoading.action === 'decline' ? 'Declining...' : 'Decline'}
                            </Button>
                        ) : null}

                        {gig.status === 'approved' && !gig.contractorCompleted ? (
                           <Button
                              variant="outline"
                              onClick={() => setCancelGigId(gig.id)}
                              disabled={actionLoading?.gigId === gig.id}
                              size="pillSm"
                              className="w-full justify-center border-red-200 bg-red-50/60 text-red-600 hover:border-red-300 hover:bg-red-50"
                            >
                             Cancel
                           </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="lg:hidden">
                <RailDots count={visibleGigs.length} activeIndex={gigRailDotIndex} className="mt-1 pb-1" />
              </div>

              {isDesktopViewport && sortedFilteredGigs.length > desktopGigsPerPage ? (
                <div
                  ref={desktopPaginationRef}
                  className="hidden lg:mt-auto lg:flex lg:items-center lg:justify-between lg:gap-4 lg:rounded-[1.35rem] lg:border lg:border-slate-200/80 lg:bg-white/92 lg:px-5 lg:py-4 lg:shadow-lg lg:backdrop-blur"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Page {activeDesktopPage} of {desktopPageCount}
                    </p>
                    <p className="text-xs text-slate-500">
                      Showing {visibleGigs.length} of {sortedFilteredGigs.length} gigs
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="pillSm"
                      onClick={() => setActiveDesktopPage((prev) => Math.max(prev - 1, 1))}
                      disabled={activeDesktopPage === 1}
                      className="min-w-[7rem]"
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-2">
                      {Array.from({ length: desktopPageCount }, (_, index) => {
                        const pageNumber = index + 1
                        const isCurrentPage = pageNumber === activeDesktopPage

                        return (
                          <Button
                            key={pageNumber}
                            type="button"
                            variant={isCurrentPage ? 'default' : 'outline'}
                            size="icon"
                            onClick={() => setActiveDesktopPage(pageNumber)}
                            className="h-10 w-10 rounded-2xl"
                            aria-label={`Go to page ${pageNumber}`}
                          >
                            {pageNumber}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="pillSm"
                      onClick={() => setActiveDesktopPage((prev) => Math.min(prev + 1, desktopPageCount))}
                      disabled={activeDesktopPage === desktopPageCount}
                      className="min-w-[7rem]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Tabs>

        {/* Gig Details Modal */}
        <Dialog open={!!detailGig} onOpenChange={() => setDetailGig(null)}>
          <ModalShell maxWidth="4xl" aria-labelledby="contractorGigDetailTitle">
            <div className="flex h-full min-h-0 flex-col">
              <ModalHeader
                eyebrow="Gig details"
                title="Gig Details"
                description="Review the client, pets, service details, and payment before taking action."
                titleId="contractorGigDetailTitle"
                onClose={() => setDetailGig(null)}
                closeAriaLabel="Close gig details"
              />

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
                {isDetailLoading ? (
                  <div className="flex min-h-[400px] flex-col items-center justify-center py-16">
                    <div className="mb-6 rounded-full bg-primary/10 p-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">Loading Details</h3>
                    <p className="text-sm text-slate-600">Fetching gig information and client details...</p>
                  </div>
                ) : detailGig ? (
                  <section className="space-y-6 sm:space-y-8">
                    <div className="flex flex-wrap items-center gap-2.5 rounded-[1.5rem] border border-slate-200/80 bg-gradient-to-r from-slate-50 to-blue-50 p-4 shadow-sm">
                      <StatusBadge status={detailGig.status} />
                      <div className={`rounded-full px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-sm ${detailGig.paymentStatus === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : detailGig.paymentStatus === 'escrow'
                          ? 'bg-blue-100 text-blue-800'
                          : detailGig.paymentStatus === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                        Payment: {detailGig.paymentStatus}
                      </div>
                    </div>

                {/* Client Information */}
                {clientProfile && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
                    {(() => {
                      const clientAddress = getClientLocationLabel(clientProfile)
                      const googleMapsUrl = getGoogleMapsUrl(clientAddress, clientLatLng)
                      const appleMapsUrl = getAppleMapsUrl(clientAddress, clientLatLng)

                      return (
                        <>
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
                            <span className="text-center sm:text-left">{clientAddress}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(clientProfile.emergencyContact?.name || clientProfile.petCareProvider?.name || clientProfile.emergencyClinic?.name) ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        {clientProfile.emergencyContact?.name ? (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-600">Emergency Contact</p>
                            <p className="mt-1 font-semibold">{clientProfile.emergencyContact.name}</p>
                            {clientProfile.emergencyContact.relationship ? <p>{clientProfile.emergencyContact.relationship}</p> : null}
                            {clientProfile.emergencyContact.phone ? <p>{clientProfile.emergencyContact.phone}</p> : null}
                          </div>
                        ) : null}

                        {clientProfile.petCareProvider?.name ? (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">Primary Care</p>
                            <p className="mt-1 font-semibold">{clientProfile.petCareProvider.name}</p>
                            {clientProfile.petCareProvider.phone ? <p>{clientProfile.petCareProvider.phone}</p> : null}
                            {clientProfile.petCareProvider.address ? <p>{clientProfile.petCareProvider.address}</p> : null}
                          </div>
                        ) : null}

                        {clientProfile.emergencyClinic?.name ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600">Emergency Clinic</p>
                            <p className="mt-1 font-semibold">{clientProfile.emergencyClinic.name}</p>
                            {clientProfile.emergencyClinic.phone ? <p>{clientProfile.emergencyClinic.phone}</p> : null}
                            {clientProfile.emergencyClinic.address ? <p>{clientProfile.emergencyClinic.address}</p> : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {(googleMapsUrl || appleMapsUrl || clientProfile) ? (
                      <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                        <a
                          href={getGoogleCalendarUrl(detailGig, detailGig.clientName, detailGig.pets, clientProfile)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button type="button" variant="outline" size="pillSm" className="w-full justify-center gap-1.5 px-2 text-[11px] sm:w-auto sm:gap-2 sm:px-4 sm:text-sm">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span className="sm:hidden">Calendar</span>
                            <span className="hidden sm:inline">Add to Google Calendar</span>
                          </Button>
                        </a>
                        {googleMapsUrl ? (
                          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="block">
                            <Button type="button" variant="outline" size="pillSm" className="w-full justify-center gap-1.5 px-2 text-[11px] sm:w-auto sm:gap-2 sm:px-4 sm:text-sm">
                              <MapPinned className="h-3.5 w-3.5" />
                              <span className="sm:hidden">Google</span>
                              <span className="hidden sm:inline">Open in Google Maps</span>
                            </Button>
                          </a>
                        ) : null}
                        {appleMapsUrl ? (
                          <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer" className="block">
                            <Button type="button" variant="outline" size="pillSm" className="w-full justify-center gap-1.5 px-2 text-[11px] sm:w-auto sm:gap-2 sm:px-4 sm:text-sm">
                              <MapIcon className="h-3.5 w-3.5" />
                              <span className="sm:hidden">Apple</span>
                              <span className="hidden sm:inline">Open in Apple Maps</span>
                            </Button>
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                        </>
                      )
                    })()}
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
                    <Package className="w-5 h-5 text-primary" />
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
                      {/* Coupon Information */}
                      {detailGig.couponCode && (
                        <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-slate-900">Coupon Applied</span>
                                <p className="text-xs text-green-600">Code: {detailGig.couponCode}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-green-600">-${(detailGig.couponDiscount || 0).toFixed(2)}</span>
                              <p className="text-xs text-green-600">Discount</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center gap-2">
                        <span className="font-semibold text-sm sm:text-base text-slate-900">Your Earnings</span>
                        <span className="font-bold text-green-600 text-lg sm:text-xl">${getNetPayout(detailGig).toFixed(2)}</span>
                      </div>

                      <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-200">
                        <p className="text-xs text-green-800">
                          💡 This is the amount you will receive. All fees are paid separately by the client.
                        </p>
                      </div>
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
                </div>
                  </section>
                ) : null}
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex w-full flex-col justify-end gap-2 sm:flex-row">
                  <Button variant="outline" onClick={() => setDetailGig(null)}>Close</Button>
                  {detailGig?.status === 'approved' && !detailGig.contractorCompleted && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setCancelGigId(detailGig.id)
                        setDetailGig(null)
                      }}
                      disabled={isCancelling}
                    >
                      Emergency Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </ModalShell>
        </Dialog>
        <Dialog open={!!confirmCompleteGigId} onOpenChange={(open) => !open && setConfirmCompleteGigId(null)}>
          <ModalShell maxWidth="lg" aria-labelledby="contractorGigCompleteTitle">
            <div className="flex h-full min-h-0 flex-col">
              <ModalHeader
                eyebrow="Confirm completion"
                title="Mark Gig Complete"
                description="Only confirm this after the service has actually been completed."
                titleId="contractorGigCompleteTitle"
                onClose={() => setConfirmCompleteGigId(null)}
                closeAriaLabel="Close completion confirmation modal"
                eyebrowClassName="text-green-600"
                className="border-green-100/70"
              />

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
                <div className="space-y-4">
                  <p className="text-sm text-slate-700">
                    Marking a gig complete tells the client the booking is finished and starts the payment confirmation flow.
                  </p>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Only continue if you have fully completed the service. If anything is still outstanding, choose Cancel and return later.
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-slate-200 bg-white/95 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setConfirmCompleteGigId(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="petCta"
                    onClick={async () => {
                      if (!confirmCompleteGigId) return
                      await handleMarkCompleted(confirmCompleteGigId)
                      setConfirmCompleteGigId(null)
                    }}
                    disabled={actionLoading?.gigId === confirmCompleteGigId && actionLoading.action === 'complete'}
                  >
                    {actionLoading?.gigId === confirmCompleteGigId && actionLoading.action === 'complete'
                      ? 'Marking Complete...'
                      : 'Yes, Mark Complete'}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </ModalShell>
        </Dialog>
        {/* Emergency Cancellation Dialog */}
        <Dialog open={!!cancelGigId} onOpenChange={(open) => !open && setCancelGigId(null)}>
          <ModalShell maxWidth="lg" aria-labelledby="contractorGigCancelTitle">
            <div className="flex h-full min-h-0 flex-col">
              <ModalHeader
                eyebrow="Emergency cancel"
                title="Emergency Gig Cancellation"
                description="Only use this if you truly cannot fulfill the booking."
                titleId="contractorGigCancelTitle"
                onClose={() => setCancelGigId(null)}
                closeAriaLabel="Close emergency cancellation modal"
                eyebrowClassName="text-red-600"
                className="border-red-100/70"
              />

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
                <div className="space-y-4">
                  <p className="text-sm text-slate-700">
                    You are about to cancel this gig. This action is <strong>irreversible</strong> and should only be used in case of:
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                    <li>Emergencies that prevent you from fulfilling the gig</li>
                    <li>Serious misunderstandings about service requirements</li>
                    <li>Safety concerns</li>
                  </ul>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                    <p className="font-medium text-amber-800">What happens when you cancel:</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-700">
                      <li>Any pending payment will be canceled</li>
                      <li>The client will be notified</li>
                      <li>The gig will be permanently marked as cancelled</li>
                      <li>Frequent cancellations may affect your contractor rating</li>
                    </ul>
                  </div>
                  {cancelError ? <div className="mt-2 text-sm text-destructive">{cancelError}</div> : null}
                </div>
              </div>

              <DialogFooter className="shrink-0 gap-2 border-t border-slate-200 px-4 py-4 sm:flex-row sm:px-6 sm:py-5">
                <Button variant="outline" onClick={() => setCancelGigId(null)} disabled={isCancelling}>
                  No, Keep Gig
                </Button>
                <Button variant="destructive" onClick={handleEmergencyCancel} disabled={isCancelling}>
                  {isCancelling ? 'Cancelling...' : 'Yes, Cancel Gig'}
                </Button>
              </DialogFooter>
            </div>
          </ModalShell>
        </Dialog>
      </DashboardPageContent>
    </DashboardPageShell>
  )
}

export default function ContractorGigsPage() {
  return (
    <Suspense fallback={null}>
      <ContractorGigsPageContent />
    </Suspense>
  )
}
