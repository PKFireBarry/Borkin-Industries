import type { Booking } from '@/types/booking'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { removeBooking, getBookingsForClient, setClientCompleted, saveBookingReview, updateBookingServices } from '@/lib/firebase/bookings'

import { useUser } from '@clerk/nextjs'
import { getAllContractors, getContractorServiceOfferings, getContractorProfile } from '@/lib/firebase/contractors'
import type { Contractor, Availability } from '@/types/contractor'
import { getClientProfile } from '@/lib/firebase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, FileText, MessageSquare, Package, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker, EndDatePicker } from '@/components/ui/date-range-picker'
import { getAllPlatformServices } from '@/lib/firebase/services'
import type { PlatformService } from '@/types/service'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { isOpenBookingStatus } from '@/app/actions/messaging-actions'
import { validateCoupon } from '@/lib/firebase/coupons'
import type { Coupon } from '@/types/coupon'
import Link from 'next/link'
import { toast } from 'sonner'
import { ModalHeader } from '../components/modal-header'
import { EmptyState } from '../components/empty-state'
import { ModalShell } from '../components/modal-shell'
import { MobileStepFooter } from '../components/mobile-step-footer'
import { StatusBadge as DashboardStatusBadge } from '../components/status-badge'
import { useSwipeSteps } from '@/hooks/use-swipe-steps'
import { cn } from '@/lib/utils'

interface BookingListProps {
  bookings: Booking[]
  onNewBooking?: () => void
  initialBookingId?: string | null
  emailAction?: string | null
  activeTab: BookingTab
}

// Local type for payment methods
interface LocalPaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

// Extend the Booking type to include optional fields needed in this component
interface ExtendedBooking extends Booking {
  stripeFee?: number;
  netPayout?: number;
  date?: string; // For backward compatibility
  time?: {
    startTime: string;
    endTime: string;
  };
}

interface EditableService {
  serviceId: string;
  name?: string;
  price: number; // In CENTS
  paymentType: 'one_time' | 'daily';
  description?: string;
}

const BOOKING_TABS = ['all', 'pending', 'approved', 'completed', 'cancelled'] as const
type BookingTab = (typeof BOOKING_TABS)[number]
const DEFAULT_DESKTOP_BOOKINGS_PER_PAGE = 4
const DEFAULT_DESKTOP_PAGINATION_HEIGHT = 88
const DESKTOP_BOOKINGS_BOTTOM_BUFFER = 24
const DESKTOP_BOOKINGS_FIT_SAFETY_BUFFER = 16

// Helper to recalc total
function calcEditTotal(services: any[], numDays: number) {
  let total = 0
  services.forEach(service => {
    if (service.paymentType === 'one_time') {
      total += service.price
    } else {
      total += service.price * numDays
    }
  })
  return total
}

// Helper to check if booking can be edited (48-hour restriction for approved bookings)
function canEditBookingDates(booking: ExtendedBooking): boolean {
  if (booking.status !== 'approved') return true
  const bookingStartDate = new Date(booking.startDate)
  const now = new Date()
  const hoursUntilBooking = (bookingStartDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  return hoursUntilBooking >= 48
}

function normalizeDateOnly(dateValue?: string | null) {
  if (!dateValue) return null

  const match = dateValue.match(/^\d{4}-\d{2}-\d{2}/)
  if (match) return match[0]

  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString().split('T')[0]
}

function getBookingSortTimestamp(dateValue?: string | null) {
  const normalizedDate = normalizeDateOnly(dateValue)
  if (normalizedDate) {
    const [year, month, day] = normalizedDate.split('-').map(Number)
    return new Date(year, month - 1, day).getTime()
  }

  if (!dateValue) return 0

  const parsed = new Date(dateValue)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

function getUpcomingBookingTimestamp(booking: ExtendedBooking) {
  return getBookingSortTimestamp(booking.startDate || booking.date)
}

function getHistoricalBookingTimestamp(booking: ExtendedBooking) {
  return getBookingSortTimestamp(booking.endDate || booking.startDate || booking.date)
}

function getAllBookingsPriority(booking: ExtendedBooking) {
  const needsClientCompletion =
    booking.status === 'approved' &&
    booking.paymentStatus === 'pending' &&
    booking.contractorCompleted === true &&
    booking.clientCompleted !== true

  if (needsClientCompletion) return 0
  if (booking.status === 'pending') return 1
  if (booking.status === 'approved') return 2
  if (booking.status === 'completed') return 3
  if (booking.status === 'cancelled') return 4

  return 5
}

// Update getGoogleCalendarUrl to use robust local date parsing
function getGoogleCalendarUrl(booking: ExtendedBooking, contractorName: string, petNames: string[]): string {
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
  const title = `Pet Care for ${petNames.join(', ') || 'your pet'} with ${contractorName}`;
  const description = [
    `Contractor: ${contractorName}`,
    `Pets: ${petNames.join(', ')}`,
    booking.services && booking.services.length > 0 ? `Services: ${booking.services.map(s => s.name || s.serviceId).join(', ')}` : '',
    `Booking ID: ${booking.id}`,
  ].filter(Boolean).join('\n');
  const startDate = parseLocalDate(booking.startDate);
  const endDate = parseLocalDate(booking.endDate);
  let startTime = booking.time?.startTime;
  let endTime = booking.time?.endTime;
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

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function PaymentReauthForm({ clientSecret, onSuccess, onError }: { clientSecret: string, onSuccess: () => void, onError: (msg: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mountError, setMountError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for Stripe/Elements to be ready
    if (stripe && elements) {
      setIsLoading(false);
      setMountError(null);
    } else if (!stripe || !elements) {
      setIsLoading(true);
    }
  }, [stripe, elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    if (!stripe || !elements) {
      setError('Payment form is not ready. Please wait...');
      setIsSubmitting(false);
      return;
    }
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {},
      redirect: 'if_required',
    });
    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
      onError(stripeError.message || 'Payment failed');
    } else {
      onSuccess();
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return <div className="flex flex-col items-center justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mb-2"></div><div className="text-xs text-muted-foreground">Loading payment form…</div></div>;
  }
  if (mountError) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="text-xs text-red-600 mb-2">{mountError}</div>
        <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <div className="text-red-600 text-xs">{error}</div>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Processing...' : 'Authorize Payment'}
      </Button>
    </form>
  );
}

export function BookingList({ bookings: initialBookings, onNewBooking, initialBookingId, emailAction, activeTab }: BookingListProps) {
  const { user } = useUser()
  const [bookings, setBookings] = useState<ExtendedBooking[]>(initialBookings as ExtendedBooking[])
  const [activeDesktopPage, setActiveDesktopPage] = useState(1)
  const [desktopBookingsPerPage, setDesktopBookingsPerPage] = useState(DEFAULT_DESKTOP_BOOKINGS_PER_PAGE)
  const [desktopPaginationHeight, setDesktopPaginationHeight] = useState(DEFAULT_DESKTOP_PAGINATION_HEIGHT)
  const [desktopViewportSectionHeight, setDesktopViewportSectionHeight] = useState<number | null>(null)
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [detailBooking, setDetailBooking] = useState<ExtendedBooking | null>(null)
  const [detailStep, setDetailStep] = useState(0)
  const [petNames, setPetNames] = useState<string[]>([])
  const [reviewModal, setReviewModal] = useState<{ open: boolean; booking: ExtendedBooking | null }>({ open: false, booking: null })
  const [paymentConfirmModal, setPaymentConfirmModal] = useState<{ open: boolean; booking: ExtendedBooking | null }>({ open: false, booking: null })
  const [defaultMethod, setDefaultMethod] = useState<LocalPaymentMethod | null>(null)
  const [editServicesModal, setEditServicesModal] = useState<{ open: boolean; booking: ExtendedBooking | null }>({ open: false, booking: null })
  const [editStep, setEditStep] = useState(0)
  const [editSuccess, setEditSuccess] = useState(false)
  const [editServices, setEditServices] = useState<any[]>([])
  const [editServicesOptions, setEditServicesOptions] = useState<any[]>([])
  const [isEditServicesPending, setIsEditServicesPending] = useState(false)
  const [editServicesError, setEditServicesError] = useState<string | null>(null)
  const [editStartDate, setEditStartDate] = useState<string | null>(null)
  const [editEndDate, setEditEndDate] = useState<string | null>(null)
  const [editEndTime, setEditEndTime] = useState<string | null>(null)
  const [editNumDays, setEditNumDays] = useState<number>(1)
  const [editTotal, setEditTotal] = useState<number>(0)
  const [platformServices, setPlatformServices] = useState<PlatformService[]>([])

  // Coupon state for edit services modal
  const [editCouponCode, setEditCouponCode] = useState('')
  const [editAppliedCoupon, setEditAppliedCoupon] = useState<Coupon | null>(null)
  const [editCouponError, setEditCouponError] = useState<string | null>(null)
  const [isValidatingEditCoupon, setIsValidatingEditCoupon] = useState(false)
  const [editOriginalPrice, setEditOriginalPrice] = useState<number | null>(null)
  const [pendingPaymentClientSecret, setPendingPaymentClientSecret] = useState<string | null>(null)
  const [pendingPaymentBookingId, setPendingPaymentBookingId] = useState<string | null>(null)
  const [releasePaymentError, setReleasePaymentError] = useState<string | null>(null)
  const [handledEmailAction, setHandledEmailAction] = useState<string | null>(null)
  const [editModalForceOpen, setEditModalForceOpen] = useState(false);
  const [editModalWarning, setEditModalWarning] = useState<string | null>(null);
  const [bookingMessageEligibility, setBookingMessageEligibility] = useState<Record<string, boolean>>({});
  const [contractorAvailability, setContractorAvailability] = useState<Availability | null>(null);
  const [hasHandledInitialBookingId, setHasHandledInitialBookingId] = useState(false)
  const activeTabSectionRef = useRef<HTMLDivElement | null>(null)
  const activeTabGridRef = useRef<HTMLDivElement | null>(null)
  const activeTabFirstCardRef = useRef<HTMLDivElement | null>(null)
  const activePaginationRef = useRef<HTMLDivElement | null>(null)
  const detailScrollRef = useRef<HTMLDivElement | null>(null)
  const editScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setBookings(initialBookings as ExtendedBooking[])
  }, [initialBookings])

  useEffect(() => {
    if (!emailAction || handledEmailAction === emailAction) return

    const emailActionMessages: Record<string, { type: 'success' | 'error' | 'info'; message: string }> = {
      'payment-released': {
        type: 'success',
        message: 'Payment released and booking completed!',
      },
      'payment-release-failed': {
        type: 'error',
        message: 'We could not release payment from the email link. Please open the booking in your dashboard and try again.',
      },
      'payment-reauth-required': {
        type: 'error',
        message: 'Your payment method needs to be updated before payment can be released.',
      },
      'already-completed': {
        type: 'info',
        message: 'This booking has already been completed.',
      },
      'invalid-link': {
        type: 'error',
        message: 'That email link is invalid or has expired.',
      },
      'booking-not-found': {
        type: 'error',
        message: 'We could not find that booking.',
      },
      'not-ready': {
        type: 'info',
        message: 'This booking is not ready for payment release yet.',
      },
    }

    const actionFeedback = emailActionMessages[emailAction]
    if (!actionFeedback) return

    setHandledEmailAction(emailAction)
    if (actionFeedback.type === 'success') {
      toast.success(actionFeedback.message)
    } else if (actionFeedback.type === 'error') {
      toast.error(actionFeedback.message)
    } else {
      toast.info(actionFeedback.message)
    }
  }, [emailAction, handledEmailAction])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const updateViewport = (event?: MediaQueryListEvent) => {
      setIsDesktopViewport(event ? event.matches : mediaQuery.matches)
    }

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    async function fetchContractors() {
      const all = await getAllContractors()
      setContractors(all)
    }
    fetchContractors()
  }, [])

  useEffect(() => {
    if (!initialBookingId || bookings.length === 0 || detailBooking || hasHandledInitialBookingId) return
    const matchedBooking = bookings.find((booking) => booking.id === initialBookingId)
    if (matchedBooking) {
      setDetailBooking(matchedBooking)
      setHasHandledInitialBookingId(true)
    }
  }, [initialBookingId, bookings, detailBooking, hasHandledInitialBookingId])

  useEffect(() => {
    if (!detailBooking) {
      setDetailStep(0)
      return
    }

    const modalScrollContainer = detailScrollRef.current?.closest('.booking-detail-scroll')
    if (modalScrollContainer instanceof HTMLElement) {
      modalScrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [detailBooking, detailStep])

  useEffect(() => {
    if (!editServicesModal.open) {
      setEditStep(0)
      return
    }

    const modalScrollContainer = editScrollRef.current?.closest('.edit-booking-scroll')
    if (modalScrollContainer instanceof HTMLElement) {
      modalScrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [editServicesModal.open, editStep])

  const { onTouchStart: handleDetailTouchStart, onTouchMove: handleDetailTouchMove, onTouchEnd: handleDetailTouchEnd } = useSwipeSteps({
    step: detailStep,
    maxStep: 5,
    threshold: 50,
    maxVerticalDelta: 40,
    onNext: () => setDetailStep((prev) => Math.min(prev + 1, 5)),
    onPrevious: () => setDetailStep((prev) => Math.max(prev - 1, 0)),
  })

  useEffect(() => {
    async function fetchPetNames() {
      if (!detailBooking || !user) return
      try {
        const profile = await getClientProfile(user.id)
        if (profile?.pets) {
          // If profile exists with pets, map pet IDs to names
          const names = detailBooking.petIds?.map(pid => profile.pets?.find(p => p.id === pid)?.name || pid) || []
          setPetNames(names)
        } else {
          // Fallback: use pet IDs as display names if profile is incomplete
          setPetNames(detailBooking.petIds || [])
        }
      } catch (error) {
        console.warn('Failed to fetch pet names, using pet IDs as fallback:', error)
        // Fallback: use pet IDs as display names
        setPetNames(detailBooking.petIds || [])
      }
    }
    fetchPetNames()
  }, [detailBooking, user])

  // Fetch default payment method when showing details
  useEffect(() => {
    async function fetchDefault() {
      if (!detailBooking || !user) return
      try {
        const profile = await getClientProfile(user.id)
        if (!profile?.stripeCustomerId) {
          setDefaultMethod(null)
          return
        }
        const res = await fetch('/api/stripe/list-payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: profile.stripeCustomerId }),
        })
        if (res.ok) {
          const { paymentMethods } = await res.json()
          const card = (paymentMethods as LocalPaymentMethod[]).find(pm => pm.isDefault) || paymentMethods[0] || null
          setDefaultMethod(card)
        } else {
          setDefaultMethod(null)
        }
      } catch (error) {
        console.warn('Failed to fetch payment methods:', error)
        setDefaultMethod(null)
      }
    }
    fetchDefault()
  }, [detailBooking, user])

  // Fetch contractor's offerings when opening edit modal
  useEffect(() => {
    async function fetchOfferings() {
      if (!editServicesModal.open || !editServicesModal.booking) return
      setEditServicesError(null)
      setIsEditServicesPending(true)
      try {
        const offerings = await getContractorServiceOfferings(editServicesModal.booking.contractorId)
        setEditServicesOptions(offerings)

        // Enhance existing services with platform service names if missing
        const servicesWithNames = editServicesModal.booking.services.map(service => ({
          ...service,
          name: service.name || platformServices.find(ps => ps.id === service.serviceId)?.name || service.serviceId
        }))
        setEditServices(servicesWithNames)
      } catch (err: any) {
        setEditServicesError('Failed to load contractor services')
      } finally {
        setIsEditServicesPending(false)
      }
    }
    fetchOfferings()
  }, [editServicesModal, platformServices])

  // When modal opens, set initial dates and recalc (only on open, not on booking ref changes)
  const editModalBookingId = editServicesModal.booking?.id
  useEffect(() => {
    if (editServicesModal.open && editServicesModal.booking) {
      setEditStartDate(normalizeDateOnly(editServicesModal.booking.startDate))
      setEditEndDate(normalizeDateOnly(editServicesModal.booking.endDate))
      setEditEndTime(editServicesModal.booking.time?.endTime || '17:00')
      setEditNumDays(editServicesModal.booking.numberOfDays || 1)

      // Calculate original total and set it
      const originalTotal = calcEditTotal(editServicesModal.booking.services, editServicesModal.booking.numberOfDays || 1)
      setEditTotal(originalTotal)
      setEditOriginalPrice(originalTotal / 100) // Convert to dollars

      // Handle existing coupon if present
      if (editServicesModal.booking.couponCode) {
        setEditAppliedCoupon({
          id: '',
          code: editServicesModal.booking.couponCode,
          name: 'Applied Coupon',
          type: 'percentage', // Default type, could be enhanced
          value: 0,
          isActive: true,
          createdAt: '',
          updatedAt: '',
          usageCount: 0
        })
        setEditCouponCode(editServicesModal.booking.couponCode)
      } else {
        setEditAppliedCoupon(null)
        setEditCouponCode('')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editServicesModal.open, editModalBookingId])

  // Fetch contractor availability when edit modal opens
  useEffect(() => {
    async function fetchAvailability() {
      if (!editServicesModal.open || !editServicesModal.booking?.contractorId) {
        setContractorAvailability(null)
        return
      }
      try {
        const profile = await getContractorProfile(editServicesModal.booking.contractorId)
        if (profile?.availability) {
          setContractorAvailability(profile.availability)
        } else {
          setContractorAvailability(null)
        }
      } catch (error) {
        console.warn('Failed to fetch contractor availability:', error)
        setContractorAvailability(null)
      }
    }
    fetchAvailability()
  }, [editServicesModal.open, editServicesModal.booking?.contractorId])

  // Derive unavailable dates for calendar overlay
  const unavailableDatesForCalendar = useMemo(() => {
    if (!contractorAvailability) return [] as string[]
    const direct = contractorAvailability.unavailableDates || []
    const daily = contractorAvailability.dailyAvailability || []
    const isFullDay = (start: string, end: string) => start === '00:00' && (end === '23:59' || end === '24:00')
    const fullDayFromDaily = daily
      .filter(d => d.isFullyUnavailable || (d.unavailableSlots || []).some(s => isFullDay(s.startTime, s.endTime)))
      .map(d => d.date)
    return Array.from(new Set([...direct, ...fullDayFromDaily]))
  }, [contractorAvailability])

  // Recalc numDays and total when end date/time or services change
  useEffect(() => {
    if (!editStartDate || !editEndDate) return
    const start = new Date(editStartDate)
    const end = new Date(editEndDate)
    start.setUTCHours(0, 0, 0, 0)
    end.setUTCHours(0, 0, 0, 0)
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const numDays = diff > 0 ? diff : 1
    setEditNumDays(numDays)
    setEditTotal(calcEditTotal(editServices, numDays))
  }, [editStartDate, editEndDate, editEndTime, editServices])

  useEffect(() => {
    async function fetchPlatformServices() {
      try {
        const services = await getAllPlatformServices()
        setPlatformServices(services)
      } catch (err) {
        // Optionally handle error
      }
    }
    fetchPlatformServices()
  }, [])

  useEffect(() => {
    const checkEligibility = async () => {
      const eligibility: Record<string, boolean> = {};
      for (const booking of bookings) {
        eligibility[booking.id] = await isOpenBookingStatus(booking.status);
      }
      setBookingMessageEligibility(eligibility);
    };
    if (bookings.length > 0) {
      checkEligibility();
    }
  }, [bookings]);

  // Sync editServicesModal booking with latest bookings data
  // This ensures the modal reflects updates when the page data changes
  useEffect(() => {
    if (editServicesModal.open && editServicesModal.booking) {
      const updatedBooking = bookings.find(b => b.id === editServicesModal.booking?.id);
      if (updatedBooking && updatedBooking !== editServicesModal.booking) {
        // Update the modal's booking reference with the latest data
        setEditServicesModal(prev => ({
          ...prev,
          booking: updatedBooking
        }));
      }
    }
  }, [bookings, editServicesModal.open, editServicesModal.booking?.id]);

  const contractorNameById = (id?: string) => {
    if (!id) return 'Unassigned'
    const c = contractors.find(c => c.id === id)
    return c ? c.name : id
  }

  // Coupon validation and application for edit modal
  const handleApplyEditCoupon = async () => {
    if (!editCouponCode.trim() || !editServicesModal.booking?.contractorId || !editOriginalPrice) {
      return;
    }

    setIsValidatingEditCoupon(true);
    setEditCouponError(null);

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editCouponCode.trim(),
          contractorId: editServicesModal.booking.contractorId,
          bookingAmount: editOriginalPrice * 100 // Convert to cents
        })
      });

      const result = await response.json();

      if (result.isValid && result.coupon) {
        setEditAppliedCoupon(result.coupon);
        setEditCouponError(null);

        // Apply coupon logic using the validation result
        if (result.coupon.type === 'fixed_price') {
          // For fixed_price coupons, result.finalPrice is the per-day price in cents
          const fixedPricePerDayInCents = result.finalPrice;
          const fixedPricePerDayInDollars = fixedPricePerDayInCents / 100;
          const totalFixedPrice = fixedPricePerDayInDollars * editNumDays;
          setEditTotal(totalFixedPrice * 100); // Convert to cents
        } else if (result.coupon.type === 'percentage') {
          // For percentage coupons, result.finalPrice is the total discounted amount in cents
          setEditTotal(result.finalPrice);
        }
      } else {
        setEditAppliedCoupon(null);
        setEditCouponError(result.error || 'Invalid coupon code');
        setEditCouponCode(''); // Clear invalid code
        // Reset to original price
        if (editOriginalPrice !== null) {
          setEditTotal(editOriginalPrice * 100); // Convert to cents
        }
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setEditCouponError('Failed to validate coupon. Please try again.');
      setEditCouponCode('');
    } finally {
      setIsValidatingEditCoupon(false);
    }
  };

  const handleRemoveEditCoupon = () => {
    setEditAppliedCoupon(null);
    setEditCouponCode('');
    setEditCouponError(null);
    // Reset to original price
    if (editOriginalPrice !== null) {
      setEditTotal(editOriginalPrice * 100); // Convert to cents
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return
    setIsPending(true)
    setError(null)
    try {
      // Find the booking to cancel
      const booking = bookings.find((b) => b.id === cancelId)
      if (!booking) throw new Error('Booking not found')

      // Whether the booking is pending or approved, attempt to cancel the payment intent
      if (booking.paymentIntentId) {
        const res = await fetch('/api/stripe/cancel-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: booking.paymentIntentId }),
        })
        const data = await res.json()
        console.log('[handleCancel] cancel-payment-intent response:', data)
        if (!res.ok) {
          throw new Error(data.error || 'Failed to cancel payment')
        }
        if (data.status !== 'canceled') {
          throw new Error(`Stripe PaymentIntent not canceled. Status: ${data.status}`)
        }
      }

      // Send contractor notification for approved/completed bookings
      if (booking.status === 'approved' || booking.status === 'completed') {
        try {
          const response = await fetch('/api/notifications/client-cancelled-booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              booking: {
                id: booking.id,
                clientId: booking.clientId,
                contractorId: booking.contractorId,
                services: booking.services,
                startDate: booking.startDate,
                endDate: booking.endDate,
                paymentAmount: booking.paymentAmount || 0,
                status: 'cancelled',
                paymentStatus: booking.paymentStatus,
                petIds: booking.petIds,
                numberOfDays: booking.numberOfDays,
                platformFee: booking.platformFee,
                stripeFee: booking.stripeFee,
                netPayout: booking.netPayout,
                paymentIntentId: booking.paymentIntentId,
                createdAt: booking.createdAt,
                updatedAt: new Date().toISOString(),
                contractorName: booking.contractorName,
                contractorPhone: booking.contractorPhone,
                time: booking.time
              }
            })
          })

          if (response.ok) {
            console.log('Contractor notification sent successfully for client cancellation')
          } else {
            const errorText = await response.text()
            console.error('Failed to send contractor notification for client cancellation:', response.status, errorText)
          }
        } catch (emailError) {
          console.error('Error sending contractor notification for client cancellation:', emailError)
          // Don't throw - we don't want email failures to break the cancellation process
        }
      }

      await removeBooking(cancelId)
      setBookings((prev) => prev.filter((b) => b.id !== cancelId))
      setCancelId(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel booking')
    } finally {
      setIsPending(false)
    }
  }

  const handleRequestSuccess = async () => {
    if (!user) return
    setIsRefreshing(true)
    try {
      const latest = await getBookingsForClient(user.id)
      setBookings(latest)
    } catch (err) {
      // Optionally handle error
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleConfirmPayment(booking: ExtendedBooking, setIsActionPending: (v: boolean) => void, setActionError: (v: string | null) => void, updateBookingsList: (fn: (prev: ExtendedBooking[]) => ExtendedBooking[]) => void) {
    setIsActionPending(true)
    setActionError(null)

    // First, try to capture payment if it's still authorized
    if (booking.paymentIntentId && booking.paymentStatus === 'pending') {
      try {
        const captureRes = await fetch('/api/stripe/capture-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: booking.paymentIntentId,
            bookingId: booking.id
          }),
        });
        const captureData = await captureRes.json();

        if (!captureRes.ok) {
          if (captureData.error === 'payment_intent_authentication_failure') {
            // Need re-authentication
            setPendingPaymentClientSecret(captureData.clientSecret);
            setPendingPaymentBookingId(booking.id);
            setIsActionPending(false);
            return; // Stop here, user needs to re-auth
          }
          throw new Error(captureData.error || 'Failed to capture payment.');
        }
        // Payment captured successfully, now update booking and release if needed
        updateBookingsList(prev => prev.map(b => b.id === booking.id ? { ...b, paymentStatus: 'paid', status: 'completed' } : b));
        toast.success('Payment captured and booking completed!');

      } catch (_err: any) {
        const message = _err.message || 'Error processing payment.';
        setActionError(message);
        toast.error(message);
        setIsActionPending(false);
        return;
      }
    } else {
      // If payment was already processed or no PI, just mark as completed or handle accordingly
      // This path might be taken if payment was handled outside this flow or if it's a no-charge booking
      updateBookingsList(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'completed' } : b));
      toast.success('Booking marked as completed!');
    }

    setIsActionPending(false);
  }

  async function handleClientComplete(bookingId: string) {
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking) return

    setIsPending(true)
    setError(null)
    try {
      await setClientCompleted(booking.id, true)
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, clientCompleted: true } : b))
      toast.success('Marked as completed! Waiting for contractor confirmation.')
    } catch (_err: any) {
      const message = _err.message || 'Failed to mark booking as completed.'
      setError(message)
      toast.error(message)
    } finally {
      setIsPending(false)
    }
  }

  async function handleConfirmPaymentFromModal(booking: ExtendedBooking) {
    setPaymentConfirmModal({ open: false, booking: null })
    setIsPending(true)
    setError(null)
    try {
      // Capture payment - this will confirm and capture if needed
      const captureRes = await fetch('/api/stripe/capture-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: booking.paymentIntentId,
          bookingId: booking.id
        }),
      });

      if (!captureRes.ok) {
        const errData = await captureRes.json();

        if (errData.needsReauth) {
          // Payment method needs re-authorization
          setReleasePaymentError('Payment method requires re-authorization. Please update your payment method in the booking details and try again.');
          toast.error('Payment method requires re-authorization. Please update your payment method and try again.');
        } else {
          setReleasePaymentError(errData.error || 'Failed to capture payment.');
          toast.error(errData.error || 'Failed to process payment.');
        }
      } else {
        setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, paymentStatus: 'paid', status: 'completed' } : b));
        toast.success('Payment released and booking completed!');
        setReleasePaymentError(null);
      }

    } catch (_err: any) {
      const message = _err.message || 'Failed to process payment.'
      setError(message)
      toast.error(message)
    } finally {
      setIsPending(false)
    }
  }

  const bookingsByTab = useMemo(() => {
    const nextBookingsByTab = {} as Record<BookingTab, ExtendedBooking[]>

    BOOKING_TABS.forEach((tab) => {
      if (tab === 'all') {
        nextBookingsByTab[tab] = bookings.slice().sort((left, right) => {
          const priorityDifference = getAllBookingsPriority(left) - getAllBookingsPriority(right)
          if (priorityDifference !== 0) return priorityDifference

          const priority = getAllBookingsPriority(left)
          const leftTimestamp = priority >= 3 ? getHistoricalBookingTimestamp(left) : getUpcomingBookingTimestamp(left)
          const rightTimestamp = priority >= 3 ? getHistoricalBookingTimestamp(right) : getUpcomingBookingTimestamp(right)

          if (priority >= 3) {
            return rightTimestamp - leftTimestamp
          }

          return leftTimestamp - rightTimestamp
        })

        return
      }

      nextBookingsByTab[tab] = bookings
        .filter((booking) => booking.status === tab)
        .sort((left, right) => getHistoricalBookingTimestamp(right) - getHistoricalBookingTimestamp(left))
    })

    return nextBookingsByTab
  }, [bookings])

  useEffect(() => {
    setActiveDesktopPage(1)
  }, [activeTab])

  useEffect(() => {
    if (!isDesktopViewport) return

    const maxPage = getDesktopPageCount(activeTab)
    if (activeDesktopPage > maxPage) {
      setActiveDesktopPage(maxPage)
    }
  }, [activeDesktopPage, activeTab, bookingsByTab, isDesktopViewport])

  const getVisibleBookings = (tab: BookingTab) => {
    const filteredBookings = bookingsByTab[tab] ?? []

    if (!isDesktopViewport) {
      return filteredBookings
    }

    const startIndex = (activeDesktopPage - 1) * desktopBookingsPerPage
    return filteredBookings.slice(startIndex, startIndex + desktopBookingsPerPage)
  }

  const getDesktopPageCount = (tab: BookingTab) => {
    const totalBookings = bookingsByTab[tab]?.length ?? 0
    return Math.max(1, Math.ceil(totalBookings / desktopBookingsPerPage))
  }

  const activeTabBookings = bookingsByTab[activeTab] ?? []
  const visibleActiveTabBookings = getVisibleBookings(activeTab)
  const desktopPageCount = getDesktopPageCount(activeTab)

  useEffect(() => {
    if (!isDesktopViewport) return

    const updateDesktopBookingsPerPage = () => {
      const sectionTop = activeTabSectionRef.current?.getBoundingClientRect().top
      const firstCardHeight = activeTabFirstCardRef.current?.getBoundingClientRect().height
      const paginationHeight = activePaginationRef.current?.getBoundingClientRect().height

      if (typeof sectionTop !== 'number') return

      const sectionHeight = Math.max(0, window.innerHeight - sectionTop - DESKTOP_BOOKINGS_BOTTOM_BUFFER)
      setDesktopViewportSectionHeight((previousHeight) => (previousHeight === sectionHeight ? previousHeight : sectionHeight))

      if (typeof paginationHeight === 'number') {
        setDesktopPaginationHeight((previousHeight) => (previousHeight === paginationHeight ? previousHeight : paginationHeight))
      }

      if (typeof firstCardHeight !== 'number') return

      const computedGridStyles = activeTabGridRef.current ? window.getComputedStyle(activeTabGridRef.current) : null
      const gridGap = Number.parseFloat(computedGridStyles?.rowGap ?? computedGridStyles?.gap ?? '16') || 16
      const availableHeight = Math.max(
        0,
        sectionHeight - desktopPaginationHeight - DESKTOP_BOOKINGS_FIT_SAFETY_BUFFER
      )
      const nextPageSize = Math.max(1, Math.floor((availableHeight + gridGap) / (firstCardHeight + gridGap)))

      setDesktopBookingsPerPage((previousPageSize) => (previousPageSize === nextPageSize ? previousPageSize : nextPageSize))
    }

    const frameId = window.requestAnimationFrame(updateDesktopBookingsPerPage)
    window.addEventListener('resize', updateDesktopBookingsPerPage)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateDesktopBookingsPerPage)
    }
  }, [activeDesktopPage, activeTab, activeTabBookings.length, desktopPaginationHeight, isDesktopViewport])

  useEffect(() => {
    if (!isDesktopViewport) {
      setDesktopViewportSectionHeight(null)
    }
  }, [isDesktopViewport])

  // Refactored date/time display helper
  function getBookingDateTimeRange(b: ExtendedBooking) {
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
    const start = parseLocalDate(b.startDate);
    const end = parseLocalDate(b.endDate);
    const startTime = b.time?.startTime;
    const endTime = b.time?.endTime;
    if (!start || !end) return '';
    const startStr = `${start.toLocaleDateString()}${startTime ? ', ' + startTime : ''}`;
    const endStr = `${end.toLocaleDateString()}${endTime ? ', ' + endTime : ''}`;
    return `${startStr} — ${endStr}`;
  }

  // Helper function to format service price
  const formatServicePrice = (service: { price: number; paymentType: 'one_time' | 'daily' }, numberOfDays: number = 1) => {
    if (!service || typeof service.price === 'undefined') return '';

    const priceInDollars = service.price / 100;

    if (service.paymentType === 'one_time') {
      return `$${priceInDollars.toFixed(2)}`;
    }
    // For 'daily' or 'per_day' types
    const dailyRateInDollars = priceInDollars;
    const totalPriceInDollars = dailyRateInDollars * (numberOfDays > 0 ? numberOfDays : 1);

    if (numberOfDays > 0) {
      return `$${dailyRateInDollars.toFixed(2)}/day × ${numberOfDays} day${numberOfDays !== 1 ? 's' : ''} = $${totalPriceInDollars.toFixed(2)}`;
    }
    // If numberOfDays is not applicable or 0, just show base rate
    return `$${dailyRateInDollars.toFixed(2)}${service.paymentType === 'daily' ? '/day' : ''}`;
  };

  // Helper to convert price to dollars (assume all values are in dollars, never cents)
  const formatAmount = (amount: number) => {
    return amount.toFixed(2);
  };

  // Helper to check if a booking has multiple services
  const hasMultipleServices = (booking: ExtendedBooking) => {
    return booking.services && booking.services.length > 1;
  };

  // Helper to get service names
  const getServiceNames = (booking: ExtendedBooking) => {
    if (!booking.services || booking.services.length === 0) {
      return booking.serviceType || 'N/A';
    }

    // If we have only one service, show its name
    if (booking.services.length === 1) {
      return booking.services[0].name || booking.services[0].serviceId;
    }

    // If we have multiple services, show the first one with a +N indicator
    return `${booking.services[0].name || booking.services[0].serviceId} +${booking.services.length - 1} more`;
  };

  // Helper to save booking review
  async function saveReview(bookingId: string, review: { rating: number, comment?: string }, contractorId?: string) {
    setIsPending(true) // Keep state updates local to this handler
    setError(null)
    try {
      const reviewWithCreatedAt = {
        ...review,
        createdAt: new Date().toISOString()
      };
      await saveBookingReview(bookingId, reviewWithCreatedAt, contractorId || '') // Call firebase function

      // Update client-side state with the new review object that includes createdAt
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, review: reviewWithCreatedAt } : b))
      setReviewModal({ open: false, booking: null }) // Close modal
      toast.success('Review submitted successfully!')
    } catch (_err: any) {
      const message = _err.message || 'Failed to submit review.'
      setError(message)
      toast.error(message)
    } finally {
      setIsPending(false)
    }
  }

  const handleSaveEditServices = async () => {
    if (!editServicesModal.booking || !user || !editStartDate || !editEndDate || !editEndTime) return
    setIsEditServicesPending(true)
    setEditServicesError(null)

    // Store previous data for notification if services or dates have changed
    const previousServices = editServicesModal.booking.services
    const previousStartDate = editServicesModal.booking.startDate
    const previousEndDate = editServicesModal.booking.endDate
    const previousEndTime = editServicesModal.booking.time?.endTime

    console.log('=== EDIT SERVICES DEBUG ===')
    console.log('Previous dates from booking:', {
      startDate: previousStartDate,
      endDate: previousEndDate,
      endTime: previousEndTime
    })
    console.log('New dates from form:', {
      startDate: editStartDate,
      endDate: editEndDate,
      endTime: editEndTime
    })
    console.log('============================')

    const servicesChanged = editServicesModal.booking.status === 'pending' &&
      JSON.stringify(previousServices) !== JSON.stringify(editServices)
    const datesChanged = editStartDate !== previousStartDate ||
      editEndDate !== previousEndDate ||
      editEndTime !== previousEndTime

    const shouldSendNotification = servicesChanged || datesChanged

    try {
      const updated = await updateBookingServices({
        bookingId: editServicesModal.booking.id,
        newServices: editServices,
        userId: user.id,
        newStartDate: editStartDate,
        newEndDate: editEndDate,
        newEndTime: editEndTime,
        // Add coupon information if present
        ...(editAppliedCoupon && editOriginalPrice && {
          couponCode: editAppliedCoupon.code,
          couponDiscount: editOriginalPrice - (editTotal / 100),
          originalPrice: editOriginalPrice
        })
      })

      // Send notification if services or dates were changed
      if (shouldSendNotification) {
        try {
          await fetch('/api/notifications/services-updated', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bookingId: editServicesModal.booking.id,
              previousServices: previousServices,
              previousBookingData: {
                startDate: previousStartDate,
                endDate: previousEndDate,
                endTime: previousEndTime
              },
              statusReverted: updated.statusReverted,
              previousStatus: editServicesModal.booking.status
            }),
          })
          console.log('Booking updated notification sent successfully')
        } catch (notificationError) {
          console.error('Failed to send booking updated notification:', notificationError)
          // Don't throw - we don't want notification failures to break the booking update
        }
      }

      // Show toast when status was reverted to pending for re-approval
      if (updated.statusReverted) {
        toast.info('Booking dates changed - your booking has been moved to Pending status and requires contractor re-approval.')
      }

      if (updated.paymentRequiresAction && updated.paymentClientSecret) {
        setPendingPaymentClientSecret(updated.paymentClientSecret)
        setPendingPaymentBookingId(updated.id)
        setEditModalForceOpen(true)
        setEditModalWarning('You must complete payment authorization to finish updating your booking.')
      } else {
        // No payment action required, close modal and update UI
        setEditServicesModal({ open: false, booking: null })
        setEditModalForceOpen(false)
        setEditModalWarning(null)
        setPendingPaymentClientSecret(null)
        setPendingPaymentBookingId(null)
        // Refetch all bookings to update UI everywhere
        if (user) {
          const latest = await getBookingsForClient(user.id)
          setBookings(latest)
        }
      }
    } catch (err: any) {
      setEditServicesError(err.message || 'Failed to update booking')
    } finally {
      setIsEditServicesPending(false)
    }
  }

  if (!bookings.length) {
    return (
      <div className="space-y-6 sm:space-y-8">
        {/* New Booking Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => onNewBooking?.()}
            variant="petCta"
            size="pill"
            className="h-11 px-5 text-sm sm:h-12 sm:px-6 sm:text-base"
          >
            <span className="flex items-center space-x-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create New Booking</span>
            </span>
          </Button>
        </div>

        {/* Empty State */}
        <EmptyState
          icon={<Calendar className="h-8 w-8 text-blue-600" />}
          title="No bookings yet"
          description="Start by creating your first booking to connect with our professional pet care providers."
          iconInCircle
          iconWrapperClassName="bg-gradient-to-br from-blue-100 to-indigo-100"
          titleClassName="text-xl font-bold sm:text-2xl"
          descriptionClassName="max-w-md text-sm sm:text-base"
          actionsClassName="sm:gap-4"
        >
          <Button onClick={() => onNewBooking?.()} variant="petCta" size="pill">
            Get Started
          </Button>
          <a
            href="/dashboard/contractors"
            className="inline-flex h-10 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 sm:h-11"
          >
            Browse Contractors
          </a>
        </EmptyState>


      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {BOOKING_TABS.map((tab) => {
        const bookingsForTab = bookingsByTab[tab] ?? []
        const visibleBookingsForTab = tab === activeTab ? visibleActiveTabBookings : bookingsForTab
        const isActiveDesktopTab = tab === activeTab && isDesktopViewport
        const activeDesktopSectionStyle = isActiveDesktopTab && desktopViewportSectionHeight
          ? { minHeight: `${desktopViewportSectionHeight}px`, maxHeight: `${desktopViewportSectionHeight}px` }
          : undefined

        return (
        <TabsContent key={tab} value={tab} className="mt-4 sm:mt-6">
            <div
              ref={isActiveDesktopTab ? activeTabSectionRef : null}
              className={cn(
                'space-y-3 sm:space-y-4',
                isActiveDesktopTab && 'lg:flex lg:flex-col lg:space-y-4'
              )}
              style={activeDesktopSectionStyle}
            >
              {bookingsForTab.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-7 w-7 text-slate-400" />}
                  title={`No ${tab === 'all' ? '' : `${tab} `}bookings`}
                  description={tab === 'all' ? 'Create your first booking to get started.' : `You don't have any ${tab} bookings at the moment.`}
                  iconInCircle
                  iconWrapperClassName="bg-slate-100"
                />
              ) : (
                <div
                  ref={isActiveDesktopTab ? activeTabGridRef : null}
                  className={cn('grid gap-3 sm:gap-4', isActiveDesktopTab && 'lg:flex-none lg:auto-rows-min lg:content-start')}
                >
                  {visibleBookingsForTab.map((b, index) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const bookingDate = new Date(b.startDate);
                    bookingDate.setHours(0, 0, 0, 0);
                    const canEditServices = (b.status === 'approved' && canEditBookingDates(b)) || (b.status === 'pending' && bookingDate >= today);
                    const canMessage = bookingMessageEligibility[b.id] === true;

                    return (
                      <Card
                        key={b.id}
                        ref={isActiveDesktopTab && index === 0 ? activeTabFirstCardRef : null}
                        className="group relative overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white/95 shadow-sm transition-all duration-200 hover:border-slate-300/80 hover:shadow-md"
                      >
                        {/* Status Indicator Bar */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${b.status === 'completed' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                          b.status === 'pending' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                            b.status === 'approved' ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                              'bg-gradient-to-r from-slate-300 to-slate-400'
                          }`}></div>

                        <CardHeader className="px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                {hasMultipleServices(b) && (
                                  <Badge variant="secondary" className="border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 sm:px-3 sm:text-xs">
                                    <Package className="mr-1 h-3 w-3" />
                                    {b.services?.length} services
                                  </Badge>
                                )}
                                <DashboardStatusBadge status={b.status} />
                              </div>
                              <CardTitle className="mb-1.5 line-clamp-2 text-base font-bold text-slate-900 sm:text-lg">
                                {getServiceNames(b)}
                              </CardTitle>
                              <div className="flex items-start text-slate-600">
                                <Clock className="mr-2 mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500 sm:h-4 sm:w-4" />
                                <span className="text-xs font-medium leading-5 sm:text-sm">{getBookingDateTimeRange(b)}</span>
                              </div>
                            </div>
                            <div className="flex flex-row items-center justify-between gap-3 rounded-2xl bg-slate-50/80 px-3 py-2.5 sm:min-w-[140px] sm:flex-col sm:items-end sm:bg-transparent sm:px-0 sm:py-0">
                              <div className="text-left sm:text-right">
                                <div className="text-lg font-bold text-slate-900 sm:text-2xl">
                                  ${formatAmount(b.paymentAmount || 0)}
                                </div>
                                <div className={`text-xs font-medium capitalize sm:text-sm ${b.paymentStatus === 'paid' ? 'text-green-600' :
                                  b.paymentStatus === 'pending' ? 'text-yellow-600' :
                                    b.paymentStatus === 'cancelled' ? 'text-red-600' :
                                      'text-slate-500'
                                  }`}>
                                  {b.paymentStatus}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-5">
                          {/* Contractor & Pet Info */}
                          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50/80 p-3 sm:mb-5 sm:gap-4 sm:p-4">
                            <div className="min-w-0">
                              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">Contractor</div>
                              <div className="truncate text-sm font-semibold text-slate-900 sm:text-base">{contractorNameById(b.contractorId)}</div>
                            </div>
                            <div className="min-w-0">
                              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">Pets</div>
                              <div className="truncate text-sm font-semibold text-slate-900 sm:text-base">{b.petIds?.length ?? 0} pet{(b.petIds?.length ?? 0) !== 1 ? 's' : ''}</div>
                            </div>
                          </div>

                          {/* Review Display */}
                          {b.review && (
                            <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3 sm:mb-5 sm:p-4">
                              <div className="mb-2 flex items-center gap-2">
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <svg
                                      key={i}
                                      className={`h-4 w-4 ${i < (b.review?.rating || 0) ? 'text-yellow-400' : 'text-slate-300'}`}
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  ))}
                                </div>
                                <span className="text-sm font-medium text-slate-700">Your Review</span>
                              </div>
                              {b.review?.comment && (
                                <p className="text-xs italic text-slate-600 sm:text-sm">"{b.review.comment}"</p>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2.5">
                            <Button
                              variant="outline"
                              onClick={() => setDetailBooking(b)}
                              size="pillSm"
                              className="min-w-[8.25rem] flex-1 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 sm:flex-none sm:text-sm"
                            >
                              View Details
                            </Button>

                            {canMessage && (
                              <Link href={`/dashboard/messages/${b.id}`} passHref>
                                <Button
                                  variant="outline"
                                  size="pillSm"
                                  className="min-w-[7.5rem] flex-1 border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100 sm:flex-none sm:text-sm"
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Message
                                </Button>
                              </Link>
                            )}

                            {canEditServices && (
                              <Button
                                variant="outline"
                                onClick={() => setEditServicesModal({ open: true, booking: b })}
                                size="pillSm"
                                className="min-w-[8rem] flex-1 border-indigo-200 bg-indigo-50 text-xs font-medium text-indigo-700 hover:bg-indigo-100 sm:flex-none sm:text-sm"
                              >
                                Edit Services
                              </Button>
                            )}

                            {(['pending', 'approved'].includes(b.status)) && (
                              <Button
                                variant="destructive"
                                onClick={() => setCancelId(b.id)}
                                disabled={isPending}
                                size="pillSm"
                                className="min-w-[6.5rem] flex-1 border-red-200 bg-red-50 text-xs font-medium text-red-700 hover:bg-red-100 sm:flex-none sm:text-sm disabled:opacity-50"
                              >
                                Cancel
                              </Button>
                            )}

                            {b.status === 'approved' && b.paymentStatus === 'pending' && !b.clientCompleted && (
                              <Button
                                onClick={() => handleClientComplete(b.id)}
                                disabled={isPending}
                                size="pillSm"
                                className="min-w-[8rem] flex-1 text-xs font-medium sm:flex-none sm:text-sm disabled:opacity-50"
                              >
                                {isPending ? 'Marking...' : 'Mark Complete'}
                              </Button>
                            )}

                            {b.status === 'approved' && b.paymentStatus === 'pending' && b.clientCompleted && !b.contractorCompleted && (
                              <div className="flex-1 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-2 text-center sm:flex-none sm:px-4">
                                <span className="text-xs font-medium text-yellow-700 sm:text-sm">Waiting for contractor...</span>
                              </div>
                            )}

                            {b.status === 'approved' && b.paymentStatus === 'pending' && b.clientCompleted && b.contractorCompleted && (
                              <Button
                                onClick={() => setPaymentConfirmModal({ open: true, booking: b })}
                                disabled={isPending}
                                size="pillSm"
                                className="min-w-[8rem] flex-1 text-xs font-medium sm:flex-none sm:text-sm disabled:opacity-50"
                              >
                                Release Payment
                              </Button>
                            )}

                            {b.status === 'completed' && b.paymentStatus === 'paid' && !b.review && (
                              <Button
                                onClick={() => setReviewModal({ open: true, booking: b })}
                                size="pillSm"
                                className="min-w-[7.5rem] flex-1 bg-yellow-500 text-xs font-medium hover:bg-yellow-600 sm:flex-none sm:text-sm"
                              >
                                Leave Review
                              </Button>
                            )}
                          </div>

                          {releasePaymentError && (
                            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                              <p className="text-xs font-medium text-red-600 sm:text-sm">{releasePaymentError}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              {tab === activeTab && isDesktopViewport && bookingsForTab.length > desktopBookingsPerPage ? (
                <div
                  ref={activePaginationRef}
                  className="hidden lg:mt-auto lg:flex lg:items-center lg:justify-between lg:gap-4 lg:rounded-[1.35rem] lg:border lg:border-slate-200/80 lg:bg-white/92 lg:px-5 lg:py-4 lg:shadow-lg lg:backdrop-blur"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Page {activeDesktopPage} of {desktopPageCount}
                    </p>
                    <p className="text-xs text-slate-500">
                      Showing {visibleBookingsForTab.length} of {bookingsForTab.length} bookings
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
        </TabsContent>
      )})}
      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <ModalShell maxWidth="lg">
          <div className="h-full overflow-y-auto p-4 sm:max-h-[95vh] sm:p-6">
            <ModalHeader
              eyebrow="Booking cancellation"
              eyebrowClassName="text-red-600"
              title="Cancel Booking"
              description="This action cannot be undone."
              descriptionAlwaysVisible
              onClose={() => setCancelId(null)}
              closeAriaLabel="Close cancel booking modal"
              className="px-0 pb-4 pt-0 sm:px-0"
            />
            <div className="mx-auto mb-4 mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 sm:h-16 sm:w-16">
              <svg className="h-6 w-6 text-red-600 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="space-y-5">
            <div className="text-center">
              <p className="mb-4 text-sm text-slate-700">
                You are about to cancel this booking. This should only be done in case of:
              </p>
              <div className="grid grid-cols-1 gap-3 text-left">
                <div className="flex items-center space-x-3 rounded-xl bg-slate-50 p-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-slate-700 sm:text-sm">Emergencies that prevent you from fulfilling the booking</span>
                </div>
                <div className="flex items-center space-x-3 rounded-xl bg-slate-50 p-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-slate-700 sm:text-sm">Serious misunderstandings about service requirements</span>
                </div>
                <div className="flex items-center space-x-3 rounded-xl bg-slate-50 p-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-slate-700 sm:text-sm">Safety concerns</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3 sm:p-4">
              <div className="flex items-start space-x-3">
                <svg className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="mb-2 text-sm font-semibold text-amber-800">What happens when you cancel:</p>
                  <ul className="space-y-1 text-xs text-amber-700 sm:text-sm">
                    <li>• Any pending payment will be canceled</li>
                    <li>• The contractor will be notified immediately</li>
                    <li>• The booking will be permanently deleted</li>
                    <li>• Frequent cancellations may affect your account standing</li>
                  </ul>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-medium text-red-600 sm:text-sm">{error}</p>
              </div>
            )}
            </div>
            <DialogFooter className="flex flex-col gap-3 pt-5 sm:flex-row sm:pt-6">
            <Button
              variant="outline"
              onClick={() => setCancelId(null)}
              disabled={isPending}
              className="flex-1 rounded-xl border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isPending}
              className="flex-1 rounded-xl bg-red-600 px-6 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Cancelling...</span>
                </div>
              ) : (
                'Yes, Cancel Booking'
              )}
            </Button>
            </DialogFooter>
          </div>
        </ModalShell>
      </Dialog>
      <Dialog open={!!detailBooking} onOpenChange={() => setDetailBooking(null)}>
        <ModalShell maxWidth="4xl">
          <DialogTitle className="sr-only">Booking Details</DialogTitle>
          <DialogDescription className="sr-only">Complete information about your booking.</DialogDescription>
          {detailBooking && (() => {
            const contractor = contractors.find(c => c.id === detailBooking.contractorId)
            const detailSteps = [
              { key: 'overview', label: 'Overview' },
              { key: 'schedule', label: 'Schedule' },
              { key: 'contractor', label: 'Contractor' },
              { key: 'pets', label: 'Pets' },
              { key: 'services', label: 'Services' },
              { key: 'payment', label: 'Payment' },
            ] as const

            const activeStep = detailSteps[detailStep] || detailSteps[0]

            return (
              <div className="flex h-full min-h-0 flex-col">
                <div className="booking-detail-scroll flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-6 sm:pb-6 sm:pt-6" ref={detailScrollRef} onTouchStart={handleDetailTouchStart} onTouchMove={handleDetailTouchMove} onTouchEnd={handleDetailTouchEnd}>
                  <section className="space-y-4 sm:space-y-6">
                    <div className="sm:hidden">
                      <div className="flex items-start justify-between gap-3 rounded-[1.5rem] border border-slate-200/80 bg-gradient-to-br from-white via-blue-50/70 to-indigo-50/70 p-3.5 shadow-sm">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">Booking details</p>
                          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{activeStep.label}</h2>
                          <p className="mt-1 text-xs text-slate-600">Booking #{detailBooking.id.slice(-8)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDetailBooking(null)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
                          aria-label="Close booking details"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        {detailSteps.map((step, index) => {
                          const isActive = index === detailStep

                          return (
                            <div key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                              <div
                                className={isActive
                                  ? 'flex h-8 w-8 items-center justify-center rounded-full border border-blue-600 bg-blue-600 text-[11px] font-semibold text-white'
                                  : 'flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-500'}
                              >
                                {index + 1}
                              </div>
                              <span className={isActive ? 'text-[10px] font-medium text-slate-900' : 'text-[10px] font-medium text-slate-500'}>{step.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white via-blue-50/70 to-indigo-50/70 p-6 shadow-sm sm:block">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Booking details</p>
                          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{getServiceNames(detailBooking)}</h2>
                          <p className="mt-2 text-sm text-slate-600">Complete information about your booking</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDetailBooking(null)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
                          aria-label="Close booking details"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className={detailStep !== 0 ? 'hidden sm:block' : ''}>
                      <div className="rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-r from-slate-50 to-blue-50 p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm sm:h-11 sm:w-11">
                              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900 sm:text-lg">{getServiceNames(detailBooking)}</h3>
                              <p className="text-xs text-slate-600 sm:text-sm">Booking #{detailBooking.id.slice(-8)}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:items-end">
                            <DashboardStatusBadge status={detailBooking.status} />
                            <span className={`text-xs font-medium capitalize sm:text-sm ${detailBooking.paymentStatus === 'paid' ? 'text-green-600' : detailBooking.paymentStatus === 'pending' ? 'text-yellow-600' : detailBooking.paymentStatus === 'cancelled' ? 'text-red-600' : 'text-slate-500'}`}>
                              Payment: {detailBooking.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={detailStep !== 1 ? 'hidden sm:block' : ''}>
                      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 sm:h-10 sm:w-10">
                            <Clock className="h-4.5 w-4.5 text-blue-600 sm:h-5 sm:w-5" />
                          </div>
                          <h4 className="text-base font-semibold text-slate-900 sm:text-lg">Schedule</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                          <div>
                            <p className="mb-1.5 text-xs font-medium text-slate-500 sm:text-sm">Date & Time</p>
                            <p className="text-sm font-semibold text-slate-900 sm:text-base">{getBookingDateTimeRange(detailBooking)}</p>
                          </div>
                          <div>
                            <p className="mb-1.5 text-xs font-medium text-slate-500 sm:text-sm">Duration</p>
                            <p className="text-sm font-semibold text-slate-900 sm:text-base">{detailBooking.numberOfDays} day{detailBooking.numberOfDays !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={detailStep !== 2 ? 'hidden sm:block' : ''}>
                      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 sm:h-10 sm:w-10">
                            <svg className="h-4.5 w-4.5 text-green-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <h4 className="text-base font-semibold text-slate-900 sm:text-lg">Contractor</h4>
                        </div>
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                          {contractor?.profileImage ? (
                            <img src={contractor.profileImage} alt={contractor.name} className="h-16 w-16 rounded-2xl border-2 border-slate-200 object-cover shadow-sm sm:h-20 sm:w-20" />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 text-xl font-bold shadow-sm sm:h-20 sm:w-20 sm:text-2xl">
                              {contractor?.name?.charAt(0) ?? '?'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h5 className="mb-3 text-lg font-bold text-slate-900 sm:text-xl">{detailBooking.contractorName || contractorNameById(detailBooking.contractorId)}</h5>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <p className="text-xs font-medium text-slate-500 sm:text-sm">Phone</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{detailBooking.contractorPhone || (contractor?.phone ?? 'N/A')}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-500 sm:text-sm">Location</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{contractor?.city || contractor?.state ? `${contractor?.city || ''}${contractor?.city && contractor?.state ? ', ' : ''}${contractor?.state || ''}` : 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={detailStep !== 3 ? 'hidden sm:block' : ''}>
                      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 sm:h-10 sm:w-10">
                            <svg className="h-4.5 w-4.5 text-orange-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </div>
                          <h4 className="text-base font-semibold text-slate-900 sm:text-lg">Pets</h4>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {petNames.length > 0 ? petNames.map(name => (
                            <div key={name} className="flex items-center gap-2 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5">
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              <span className="text-sm font-semibold text-blue-800">{name}</span>
                            </div>
                          )) : (
                            <p className="text-sm italic text-slate-500">No pets specified</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={detailStep !== 4 ? 'hidden sm:block' : ''}>
                      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-5 flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 sm:h-10 sm:w-10">
                            <Package className="h-4.5 w-4.5 text-emerald-600 sm:h-5 sm:w-5" />
                          </div>
                          <h4 className="text-base font-semibold text-slate-900 sm:text-lg">Services & Payment</h4>
                        </div>
                        <div className="space-y-4">
                          {detailBooking.services.map((service, idx) => {
                            const platformService = platformServices.find(ps => ps.id === service.serviceId)
                            return (
                              <div key={idx} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 sm:text-base">{platformService?.name || service.name || service.serviceId}</p>
                                  <p className="text-xs text-slate-500 sm:text-sm">{service.paymentType === 'one_time' ? 'One-time payment' : 'Daily rate'}</p>
                                </div>
                                <p className="text-base font-bold text-slate-900 sm:text-lg">{formatServicePrice(service, detailBooking.numberOfDays || 1)}</p>
                              </div>
                            )
                          })}
                          {detailBooking.couponCode ? (
                            <div className="rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="text-sm font-bold text-slate-900 sm:text-base">Coupon Applied</p>
                                  <p className="text-xs text-green-600 sm:text-sm">Code: {detailBooking.couponCode}</p>
                                </div>
                                <div className="text-right">
                                  {detailBooking.originalPrice && detailBooking.couponDiscount !== undefined ? (
                                    <>
                                      <p className={`text-base font-bold sm:text-lg ${detailBooking.couponDiscount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {detailBooking.couponDiscount > 0 ? '-' : '+'}${formatAmount(Math.abs(detailBooking.couponDiscount))}
                                      </p>
                                      <p className={`text-xs ${detailBooking.couponDiscount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {detailBooking.couponDiscount > 0 ? 'Discount' : 'Price Increase'}
                                      </p>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ) : null}
                          <div className="mt-2 flex items-center justify-between rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4">
                            <span className="text-base font-bold text-slate-900 sm:text-lg">Total Payment</span>
                            <span className="text-xl font-bold text-blue-600 sm:text-2xl">${formatAmount(detailBooking.paymentAmount || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={detailStep !== 5 ? 'hidden sm:block' : ''}>
                      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 sm:h-10 sm:w-10">
                            <svg className="h-4.5 w-4.5 text-indigo-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                          <h4 className="text-base font-semibold text-slate-900 sm:text-lg">Payment & Actions</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                          <div>
                            <p className="mb-1.5 text-xs font-medium text-slate-500 sm:text-sm">Payment Method</p>
                            <div className="rounded-xl bg-slate-50 p-3">
                              <span className="text-sm font-semibold text-slate-900 sm:text-base">{defaultMethod ? `${defaultMethod.brand?.toUpperCase?.() ?? ''} •••• ${defaultMethod.last4 ?? ''}` : 'Not specified'}</span>
                            </div>
                          </div>
                          <div>
                            <p className="mb-1.5 text-xs font-medium text-slate-500 sm:text-sm">Booking ID</p>
                            <div className="rounded-xl bg-slate-50 p-3">
                              <code className="text-sm font-mono text-slate-700">#{detailBooking.id.slice(-12) ?? ''}</code>
                            </div>
                          </div>
                        </div>
                        <div className="mt-6 border-t border-slate-200 pt-6">
                          <a
                            href={getGoogleCalendarUrl(detailBooking, contractorNameById(detailBooking.contractorId), petNames)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl sm:px-6 sm:py-3"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                            </svg>
                            <span>Add to Google Calendar</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <MobileStepFooter
                  step={detailStep}
                  maxStep={5}
                  onBack={() => setDetailStep((prev) => Math.max(prev - 1, 0))}
                  onNext={() => setDetailStep((prev) => Math.min(prev + 1, 5))}
                  onClose={() => setDetailBooking(null)}
                  canGoNext={detailStep < 5}
                  nextDisabled={detailStep === 5}
                />
              </div>
            )
          })()}
        </ModalShell>
      </Dialog>
      <Dialog open={reviewModal.open} onOpenChange={open => setReviewModal({ open, booking: open ? reviewModal.booking : null })}>
        <ModalShell maxWidth="lg">
          <div className="flex h-full min-h-0 flex-col">
            <ModalHeader
              eyebrow="Completed booking"
              title="Leave a Review"
              onClose={() => setReviewModal({ open: false, booking: null })}
              closeAriaLabel="Close leave review modal"
            />
            {reviewModal.booking && (
              <ReviewForm
                booking={reviewModal.booking}
                onClose={() => setReviewModal({ open: false, booking: null })}
                onSaved={async (review) => {
                  await saveReview(reviewModal.booking!.id, review, reviewModal.booking!.contractorId);
                }}
              />
            )}
          </div>
        </ModalShell>
      </Dialog>
      <Dialog
        open={editServicesModal.open || editModalForceOpen}
        onOpenChange={open => {
          if (pendingPaymentClientSecret) {
            setEditModalWarning('You must complete payment authorization to finish updating your booking.')
            setEditModalForceOpen(true)
            return
          }
          setEditServicesModal({ open, booking: open ? editServicesModal.booking : null })
          setEditModalForceOpen(false)
          setEditModalWarning(null)
        }}
      >
        <ModalShell maxWidth="4xl">
          <DialogTitle className="sr-only">Edit Booking</DialogTitle>
          <DialogDescription className="sr-only">
            {editServicesModal.booking?.status === 'pending'
              ? 'Update services, dates, and times for your booking.'
              : 'Adjust end date and time for your booking.'}
          </DialogDescription>

          {editServicesModal.booking && (() => {
            const editSteps = [
              { key: 'schedule', label: 'Schedule' },
              ...(editServicesModal.booking.status === 'pending' ? [{ key: 'services', label: 'Services' } as const] : []),
              { key: 'review', label: 'Review' },
              { key: 'confirm', label: 'Confirm' },
            ]

            const activeEditStep = editSteps[editStep] || editSteps[0]
            const currentStepKey = activeEditStep?.key
            const canAdvanceEditStep = (() => {
              if (currentStepKey === 'schedule') return !!editStartDate && !!editEndDate && !!editEndTime
              if (currentStepKey === 'services') return editServices.length > 0
              if (currentStepKey === 'review') return true
              return true
            })()

            return (
              <div className="flex h-full min-h-0 flex-col">
                <div className="edit-booking-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-6 sm:pb-6 sm:pt-6" ref={editScrollRef}>
                  <div className="space-y-4 sm:space-y-6">
                    <div className="hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white via-emerald-50/70 to-blue-50/50 p-6 shadow-sm sm:block">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Edit booking</p>
                          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Edit your booking</h2>
                          <p className="mt-2 text-sm text-slate-600">
                            {editServicesModal.booking.status === 'pending'
                              ? 'Update services, dates, and times for your booking'
                              : 'Adjust end date and time for your booking'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditServicesModal({ open: false, booking: null })}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
                          aria-label="Close edit booking modal"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white via-emerald-50/70 to-blue-50/50 p-4 shadow-sm sm:hidden">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Edit booking</p>
                          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{activeEditStep?.label}</h2>
                          <p className="mt-1 text-sm text-slate-600">Adjust your booking one step at a time.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditServicesModal({ open: false, booking: null })}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
                          aria-label="Close edit booking modal"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                    </div>

                    {editModalWarning ? (
                      <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                        <span className="text-sm font-medium text-amber-800">{editModalWarning}</span>
                      </div>
                    ) : null}

                    {editServicesError ? (
                      <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-4">
                        <span className="text-sm font-medium text-red-800">{editServicesError}</span>
                      </div>
                    ) : null}

                    <div className={currentStepKey !== 'schedule' ? 'hidden sm:block' : ''}>
                      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5 flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 sm:h-10 sm:w-10">
                            <svg className="h-4.5 w-4.5 text-purple-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Schedule</h3>
                            <p className="text-sm text-slate-600">Adjust your service dates and times.</p>
                          </div>
                        </div>

                        {editServicesModal.booking.status === 'approved' && (editStartDate !== editServicesModal.booking.startDate || editEndDate !== editServicesModal.booking.endDate) ? (
                          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm text-amber-800">Changing the dates of an approved booking will move it back to pending until the contractor re-approves it.</p>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
                          <div>
                            <DateRangePicker
                              value={{ startDate: editStartDate, endDate: editEndDate }}
                              onChange={(range) => {
                                setEditStartDate(range.startDate)
                                setEditEndDate(range.endDate)
                              }}
                              minDate={new Date().toISOString().split('T')[0]}
                              unavailableDates={unavailableDatesForCalendar}
                              className="w-full"
                              compact
                            />
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700">End Time</label>
                              <Input
                                type="time"
                                value={editEndTime || ''}
                                onChange={e => setEditEndTime(e.target.value)}
                                className="mt-2 rounded-xl border-slate-300 bg-white focus:border-purple-500 focus:ring-purple-500"
                              />
                            </div>

                            <div className="rounded-[1.4rem] border border-blue-200/60 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between rounded-xl bg-white/80 px-3 py-2">
                                  <span className="text-sm font-medium text-slate-700">Duration</span>
                                  <span className="text-sm font-bold text-blue-800">{editNumDays} day{editNumDays !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex justify-between rounded-xl bg-white/80 px-3 py-2">
                                  <span className="text-sm font-medium text-slate-700">Updated Total</span>
                                  <span className="text-base font-bold text-blue-900">${(editTotal / 100).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {editServicesModal.booking.status === 'pending' ? (
                      <div className={currentStepKey !== 'services' ? 'hidden sm:block' : ''}>
                        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5 flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 sm:h-10 sm:w-10">
                            <Package className="h-4.5 w-4.5 text-emerald-600 sm:h-5 sm:w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Services</h3>
                            <p className="text-sm text-slate-600">Choose the services you want to keep on this booking.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                          {editServicesOptions.map((offering: any) => {
                            const checked = editServices.some((s: any) => s.serviceId === offering.serviceId)
                            const platformService = platformServices.find(ps => ps.id === offering.serviceId)

                            return (
                              <div
                                key={offering.serviceId}
                                className={`group relative cursor-pointer rounded-[1.25rem] border p-3 transition-all duration-200 ${checked ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                                onClick={() => {
                                  const serviceToAdd = {
                                    ...offering,
                                    paymentType: offering.paymentType === 'per_day' ? 'daily' : offering.paymentType,
                                    name: platformService?.name || offering.serviceId
                                  }
                                  setEditServices(prev => checked ? prev.filter((s: any) => s.serviceId !== offering.serviceId) : [...prev, serviceToAdd])
                                }}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className={`mt-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-md border-2 ${checked ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white group-hover:border-emerald-400'}`}>
                                    {checked ? (
                                      <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : null}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="mb-1 text-sm font-semibold text-slate-900 transition-colors group-hover:text-emerald-700 sm:text-[15px]">{platformService?.name || offering.serviceId}</h4>
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-sm font-bold text-emerald-600 sm:text-base">${(offering.price / 100).toFixed(2)}{(offering.paymentType === 'daily' || offering.paymentType === 'per_day') ? '/day' : ''}</span>
                                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500 sm:text-xs">{(offering.paymentType === 'daily' || offering.paymentType === 'per_day') ? 'Daily rate' : 'One-time fee'}</span>
                                    </div>
                                    {platformService?.description ? <p className="mt-2 text-xs text-slate-600 sm:text-sm">{platformService.description}</p> : null}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        </div>
                      </div>
                    ) : null}

                    <div className={currentStepKey !== 'review' ? 'hidden sm:block' : ''}>
                      <div className="space-y-4">
                        <div className="rounded-[1.75rem] border border-blue-200/60 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-5 shadow-sm sm:p-6">
                          <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 sm:h-10 sm:w-10">
                              <svg className="h-4.5 w-4.5 text-blue-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Review changes</h3>
                              <p className="text-sm text-slate-600">Check pricing and schedule before continuing.</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between rounded-xl bg-white/80 px-3 py-2">
                              <span className="text-sm font-medium text-slate-700">Duration</span>
                              <span className="text-sm font-bold text-blue-800">{editNumDays} day{editNumDays !== 1 ? 's' : ''}</span>
                            </div>
                            {editAppliedCoupon && editOriginalPrice ? (
                              <div className="flex justify-between rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                                <span className="text-sm font-medium text-green-700">Original Price</span>
                                <span className="text-sm font-bold text-green-800 line-through">${editOriginalPrice.toFixed(2)}</span>
                              </div>
                            ) : null}
                            {editAppliedCoupon ? (
                              <div className="flex justify-between rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                                <span className="text-sm font-medium text-green-700">Coupon Discount</span>
                                <span className="text-sm font-bold text-green-800">-${(editOriginalPrice! - (editTotal / 100)).toFixed(2)}</span>
                              </div>
                            ) : null}
                            <div className="flex justify-between rounded-xl bg-white/80 px-3 py-2">
                              <span className="text-sm font-medium text-slate-700">Updated Total</span>
                              <span className="text-base font-bold text-blue-900">${(editTotal / 100).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {editServicesModal.booking.status === 'pending' ? (
                          <div className="rounded-[1.75rem] border border-green-200/60 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 shadow-sm sm:p-6">
                            <div className="mb-4 flex items-center gap-3 sm:mb-6">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 sm:h-10 sm:w-10">
                                <svg className="h-4.5 w-4.5 text-green-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Have a Coupon?</h3>
                                <p className="text-xs text-slate-600 sm:text-sm">Enter your coupon code to update the booking total.</p>
                              </div>
                            </div>

                            {!editAppliedCoupon ? (
                              <div className="flex flex-col gap-3 sm:flex-row">
                                <div className="flex-1">
                                  <Input
                                    type="text"
                                    placeholder="Enter coupon code"
                                    value={editCouponCode}
                                    onChange={(e) => setEditCouponCode(e.target.value.toUpperCase())}
                                    maxLength={8}
                                    className="rounded-xl border-green-300 bg-white text-sm focus:border-green-500 focus:ring-green-500"
                                    disabled={isValidatingEditCoupon}
                                  />
                                </div>
                                <Button type="button" onClick={handleApplyEditCoupon} disabled={!editCouponCode.trim() || isValidatingEditCoupon} className="h-10 rounded-xl bg-green-600 px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-700 sm:h-11 sm:px-6">
                                  {isValidatingEditCoupon ? 'Validating...' : 'Apply'}
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between rounded-xl border border-green-200/40 bg-white/80 p-3">
                                <div>
                                  <p className="text-sm font-semibold text-green-800">{editAppliedCoupon.name}</p>
                                  <p className="text-xs text-green-600 sm:text-sm">Code: {editAppliedCoupon.code}</p>
                                </div>
                                <Button type="button" onClick={handleRemoveEditCoupon} variant="outline" className="h-9 rounded-xl border-red-300 px-3 text-xs text-red-600 hover:bg-red-50 sm:text-sm">
                                  Remove
                                </Button>
                              </div>
                            )}

                            {editCouponError ? (
                              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                                <p className="text-sm text-red-800">{editCouponError}</p>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className={currentStepKey !== 'confirm' ? 'hidden sm:block' : ''}>
                      <div className="space-y-4">
                        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 text-center shadow-sm sm:p-6">
                          {editSuccess ? (
                            <div className="relative overflow-hidden rounded-[1.5rem] border border-green-200 bg-gradient-to-br from-green-50 via-white to-emerald-100 px-4 py-8">
                              <div className="absolute left-6 top-6 h-2 w-2 animate-ping rounded-full bg-pink-400" />
                              <div className="absolute right-8 top-10 h-2.5 w-2.5 animate-ping rounded-full bg-blue-400 [animation-delay:150ms]" />
                              <div className="absolute bottom-8 left-10 h-2.5 w-2.5 animate-ping rounded-full bg-amber-400 [animation-delay:300ms]" />
                              <div className="absolute bottom-10 right-10 h-2 w-2 animate-ping rounded-full bg-green-400 [animation-delay:450ms]" />
                              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <h3 className="mt-4 text-lg font-semibold text-slate-900">Changes saved</h3>
                              <p className="mt-2 text-sm text-slate-600">Your booking updates were applied successfully.</p>
                            </div>
                          ) : (
                            <>
                              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <h3 className="mt-4 text-lg font-semibold text-slate-900">Ready to save?</h3>
                              <p className="mt-2 text-sm text-slate-600">Tap Save Changes only when the updated services, dates, and pricing look correct.</p>

                              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setEditServicesModal({ open: false, booking: null })}
                                  disabled={isEditServicesPending || !!pendingPaymentClientSecret || !editServicesModal.booking}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  onClick={handleSaveEditServices}
                                  disabled={isEditServicesPending || !!pendingPaymentClientSecret || !editServicesModal.booking}
                                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                                >
                                  {isEditServicesPending ? 'Saving...' : 'Save Changes'}
                                </Button>
                              </div>
                            </>
                          )}
                        </div>

                        {pendingPaymentClientSecret && editServicesModal.booking && pendingPaymentBookingId === editServicesModal.booking.id ? (
                          <div className="rounded-[1.75rem] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm">
                            <div className="mb-4">
                              <h4 className="font-semibold text-amber-800">Payment Authorization Required</h4>
                              <p className="text-sm text-amber-700">Please confirm your payment method to complete the booking update.</p>
                            </div>
                            <Elements stripe={stripePromise} options={{ clientSecret: pendingPaymentClientSecret }}>
                              <PaymentReauthForm
                                clientSecret={pendingPaymentClientSecret}
                                onSuccess={async () => {
                                  setPendingPaymentClientSecret(null)
                                  setPendingPaymentBookingId(null)
                                  setEditModalForceOpen(false)
                                  setEditModalWarning(null)
                                  if (user) {
                                    const latest = await getBookingsForClient(user.id)
                                    setBookings(latest)
                                  }
                                }}
                                onError={msg => setEditServicesError(msg)}
                              />
                            </Elements>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <MobileStepFooter
                  step={editStep}
                  maxStep={editSteps.length - 1}
                  onBack={() => setEditStep((prev) => Math.max(prev - 1, 0))}
                  onNext={() => setEditStep((prev) => Math.min(prev + 1, editSteps.length - 1))}
                  canGoNext={canAdvanceEditStep}
                  backDisabled={isEditServicesPending}
                  nextDisabled={isEditServicesPending}
                  hideNextOnFinal={currentStepKey === 'confirm'}
                  backButtonClassName="min-w-[7.5rem] flex-none"
                  nextButtonClassName="min-w-[8.5rem] flex-none"
                />
              </div>
            )
          })()}
        </ModalShell>
      </Dialog>

      {/* Payment Confirmation Modal */}
      <Dialog open={paymentConfirmModal.open} onOpenChange={open => setPaymentConfirmModal({ open, booking: open ? paymentConfirmModal.booking : null })}>
        <ModalShell maxWidth="lg">
          <div className="flex h-full min-h-0 flex-col">
            <ModalHeader
              eyebrow="Booking payment"
              title="Release Payment"
              onClose={() => setPaymentConfirmModal({ open: false, booking: null })}
              closeAriaLabel="Close release payment modal"
            />
            {paymentConfirmModal.booking && (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                  <div className="space-y-4 sm:space-y-5">
                    <div className="rounded-[1.6rem] border border-blue-200/70 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 text-center shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Ready to release</p>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">
                        ${formatAmount(paymentConfirmModal.booking.paymentAmount || 0)}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">You're about to release payment to the contractor</p>
                    </div>

                    <div className="space-y-3 rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-700">Service Date</span>
                        <span className="text-right text-sm text-slate-900">{getBookingDateTimeRange(paymentConfirmModal.booking)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-700">Contractor</span>
                        <span className="text-right text-sm text-slate-900">{paymentConfirmModal.booking.contractorName || contractorNameById(paymentConfirmModal.booking.contractorId)}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-medium text-slate-700">Services</span>
                        <div className="max-w-[60%] text-right text-sm">
                          {paymentConfirmModal.booking.services?.map((service, idx) => {
                            const platformService = platformServices.find(ps => ps.id === service.serviceId)
                            return (
                              <div key={idx} className="mb-1">
                                <div className="font-medium text-slate-900">{platformService?.name || service.name || service.serviceId}</div>
                                <div className="text-xs text-slate-500">{formatServicePrice(service, paymentConfirmModal.booking?.numberOfDays || 1)}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-700">Payment Method</span>
                        <span className="text-right text-sm text-slate-900">{defaultMethod ? `${defaultMethod.brand?.toUpperCase?.()} •••• ${defaultMethod.last4}` : 'Default card'}</span>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-[1.6rem] border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-4 text-sm shadow-sm sm:p-5">
                      <div className="flex justify-between text-slate-700">
                        <span>Subtotal</span>
                        <span>${formatAmount((paymentConfirmModal.booking.paymentAmount || 0) - (paymentConfirmModal.booking.platformFee || 0))}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Platform Fee</span>
                        <span>${formatAmount(paymentConfirmModal.booking.platformFee || 0)}</span>
                      </div>
                      <div className="flex justify-between border-t border-amber-200 pt-2 font-semibold text-slate-900">
                        <span>Total</span>
                        <span>${formatAmount(paymentConfirmModal.booking.paymentAmount || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 border-t border-slate-200/80 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:px-6 sm:pb-6 sm:pt-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      variant="outline"
                      className="h-11 flex-1 rounded-2xl border-slate-200 bg-white sm:h-12"
                      onClick={() => setPaymentConfirmModal({ open: false, booking: null })}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="petCta"
                      size="pill"
                      className="h-11 flex-1 rounded-2xl sm:h-12"
                      onClick={() => handleConfirmPaymentFromModal(paymentConfirmModal.booking!)}
                      disabled={isPending}
                    >
                      {isPending ? 'Processing...' : 'Release Payment'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </ModalShell>
      </Dialog>


    </div>
  )
}

function ReviewForm({ booking, onClose, onSaved }: { booking: ExtendedBooking, onClose: () => void, onSaved: (review: { rating: number, comment?: string }) => void }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      onSubmit={async e => {
        e.preventDefault()
        setIsPending(true)
        setError(null)
        try {
          await onSaved({ rating, comment })
        } catch (err) {
          setError('Failed to save review')
        } finally {
          setIsPending(false)
        }
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="space-y-4">
          <div className="rounded-[1.6rem] border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Reviewing</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{booking.contractorName || 'Your contractor'}</p>
            <p className="mt-1 text-sm text-slate-600">Share a quick rating and any notes about how the visit went.</p>
          </div>

          <div className="space-y-2.5">
            <label className="block text-sm font-semibold text-slate-700">Rating</label>
            <Select value={String(rating)} onValueChange={(value) => setRating(Number(value))}>
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white text-sm">
                <SelectValue placeholder="Select a rating" />
              </SelectTrigger>
              <SelectContent>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} Star{n > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5">
            <label className="block text-sm font-semibold text-slate-700">Comment (optional)</label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="min-h-28 rounded-2xl border-slate-200 bg-white resize-none"
              rows={4}
              placeholder="Anything other clients should know about this contractor or visit?"
            />
          </div>

          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
        </div>
      </div>
      <div className="shrink-0 border-t border-slate-200/80 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:px-6 sm:pb-6 sm:pt-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" size="pill" onClick={onClose} className="h-11 flex-1 rounded-2xl border-slate-200 bg-white sm:h-12">
            Cancel
          </Button>
          <Button type="submit" variant="petCta" size="pill" disabled={isPending} className="h-11 flex-1 rounded-2xl sm:h-12">
            {isPending ? 'Saving...' : 'Submit Review'}
          </Button>
        </div>
      </div>
    </form>
  )
}
