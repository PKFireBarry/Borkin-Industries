import type { Booking } from '@/types/booking'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { removeBooking, getBookingsForClient, setClientCompleted, saveBookingReview, updateBookingServices } from '@/lib/firebase/bookings'
import { BookingRequestForm } from './booking-request-form'
import { useUser } from '@clerk/nextjs'
import { getAllContractors, getContractorServiceOfferings } from '@/lib/firebase/contractors'
import type { Contractor } from '@/types/contractor'
import { getClientProfile } from '@/lib/firebase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Package, Clock, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { getAllPlatformServices } from '@/lib/firebase/services'
import type { PlatformService } from '@/types/service'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { isOpenBookingStatus } from '@/app/actions/messaging-actions'
import Link from 'next/link'

interface BookingListProps {
  bookings: Booking[]
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

export function BookingList({ bookings: initialBookings }: BookingListProps) {
  const { user } = useUser()
  const [bookings, setBookings] = useState<ExtendedBooking[]>(initialBookings as ExtendedBooking[])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRequestOpen, setIsRequestOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [detailBooking, setDetailBooking] = useState<ExtendedBooking | null>(null)
  const [petNames, setPetNames] = useState<string[]>([])
  const [reviewModal, setReviewModal] = useState<{ open: boolean; booking: ExtendedBooking | null }>({ open: false, booking: null })
  const [defaultMethod, setDefaultMethod] = useState<LocalPaymentMethod | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [editServicesModal, setEditServicesModal] = useState<{ open: boolean; booking: ExtendedBooking | null }>({ open: false, booking: null })
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
  const [pendingPaymentClientSecret, setPendingPaymentClientSecret] = useState<string | null>(null)
  const [pendingPaymentBookingId, setPendingPaymentBookingId] = useState<string | null>(null)
  const [releasePaymentError, setReleasePaymentError] = useState<string | null>(null)
  const [editModalForceOpen, setEditModalForceOpen] = useState(false);
  const [editModalWarning, setEditModalWarning] = useState<string | null>(null);
  const [bookingMessageEligibility, setBookingMessageEligibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchContractors() {
      const all = await getAllContractors()
      setContractors(all)
    }
    fetchContractors()
  }, [])

  useEffect(() => {
    async function fetchPetNames() {
      if (!detailBooking || !user) return
      const profile = await getClientProfile(user.id)
      if (!profile) return
      const names = detailBooking.petIds?.map(pid => profile.pets?.find(p => p.id === pid)?.name || pid) || []
      setPetNames(names)
    }
    fetchPetNames()
  }, [detailBooking, user])

  // Fetch default payment method when showing details
  useEffect(() => {
    async function fetchDefault() {
      if (!detailBooking || !user) return
      const profile = await getClientProfile(user.id)
      if (!profile?.stripeCustomerId) return
      try {
        const res = await fetch('/api/stripe/list-payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: profile.stripeCustomerId }),
        })
        if (res.ok) {
          const { paymentMethods } = await res.json()
          const card = (paymentMethods as LocalPaymentMethod[]).find(pm => pm.isDefault) || paymentMethods[0] || null
          setDefaultMethod(card)
        }
      } catch {
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
        setEditServices(editServicesModal.booking.services)
      } catch (err: any) {
        setEditServicesError('Failed to load contractor services')
      } finally {
        setIsEditServicesPending(false)
      }
    }
    fetchOfferings()
  }, [editServicesModal])

  // When modal opens, set initial dates and recalc
  useEffect(() => {
    if (editServicesModal.open && editServicesModal.booking) {
      setEditStartDate(editServicesModal.booking.startDate)
      setEditEndDate(editServicesModal.booking.endDate)
      setEditEndTime(editServicesModal.booking.time?.endTime || '17:00')
      setEditNumDays(editServicesModal.booking.numberOfDays || 1)
      setEditTotal(calcEditTotal(editServicesModal.booking.services, editServicesModal.booking.numberOfDays || 1))
    }
  }, [editServicesModal.open, editServicesModal.booking])

  // Recalc numDays and total when end date/time or services change
  useEffect(() => {
    if (!editStartDate || !editEndDate) return
    const start = new Date(editStartDate)
    const end = new Date(editEndDate)
    start.setUTCHours(0,0,0,0)
    end.setUTCHours(0,0,0,0)
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000*60*60*24)) + 1
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

  const contractorNameById = (id?: string) => {
    if (!id) return 'Unassigned'
    const c = contractors.find(c => c.id === id)
    return c ? c.name : id
  }

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
    setIsRequestOpen(false)
    if (!user) return
    setIsRefreshing(true)
    try {
      const latest = await getBookingsForClient(user.id)
      setBookings(latest)
      console.log('Bookings after edit:', latest.map(b => ({ id: b.id, startDate: b.startDate, endDate: b.endDate })));
    } catch (err) {
      // Optionally handle error
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleConfirmPayment(booking: ExtendedBooking, setIsPending: (v: boolean) => void, setError: (v: string | null) => void, setBookings: (fn: (prev: ExtendedBooking[]) => ExtendedBooking[]) => void) {
    setIsPending(true)
    setError(null)
    setReleasePaymentError(null)
    try {
      const res = await fetch('/api/stripe/capture-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: booking.paymentIntentId, bookingId: booking.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setReleasePaymentError(data.error || 'Failed to release payment. Please ensure payment is authorized.')
        setError(data.error || 'Failed to release payment. Please ensure payment is authorized.')
        return
      }
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, paymentStatus: 'paid', status: 'completed' } : b))
    } catch (err) {
      setReleasePaymentError('Failed to confirm payment')
      setError('Failed to confirm payment')
    } finally {
      setIsPending(false)
    }
  }

  async function handleClientComplete(bookingId: string) {
    setIsPending(true)
    setError(null)
    try {
      await setClientCompleted(bookingId, true)
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, clientCompleted: true } : b))
    } catch (err) {
      setError('Failed to mark as completed')
    } finally {
      setIsPending(false)
    }
  }

  // Add a helper for status badge
  function StatusBadge({ status }: { status: string }) {
    let color = 'bg-gray-200 text-gray-700'
    if (status === 'pending') color = 'bg-yellow-100 text-yellow-800'
    if (status === 'approved') color = 'bg-blue-100 text-blue-800'
    if (status === 'completed') color = 'bg-green-100 text-green-800'
    if (status === 'cancelled') color = 'bg-red-100 text-red-800'
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  // Helper to filter bookings by status
  const filterBookings = (status: string) => {
    const getSortDate = (b: ExtendedBooking) => b.startDate || b.date || '';
    if (status === 'all') return bookings.slice().sort((a, b) => new Date(getSortDate(b)).getTime() - new Date(getSortDate(a)).getTime());
    return bookings.filter(b => b.status === status).sort((a, b) => new Date(getSortDate(b)).getTime() - new Date(getSortDate(a)).getTime());
  }

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
  const formatServicePrice = (service: any, numberOfDays: number = 1) => {
    if (!service) return '';
    
    // Convert from cents to dollars if price is over 100
    // This handles the case where prices might be stored in cents in the database
    const isInCents = service.price > 100 && service.price % 100 === 0;
    const displayPrice = isInCents ? service.price / 100 : service.price;
    
    if (service.paymentType === 'one_time') {
      return `$${displayPrice.toFixed(2)}`;
    } else {
      const dailyRate = displayPrice;
      const totalPrice = dailyRate * numberOfDays;
      return `$${dailyRate.toFixed(2)}/day × ${numberOfDays} day${numberOfDays !== 1 ? 's' : ''} = $${totalPrice.toFixed(2)}`;
    }
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
    const reviewWithCreatedAt = {
      ...review,
      createdAt: new Date().toISOString() // Add the required createdAt field
    };
    await saveBookingReview(bookingId, reviewWithCreatedAt, contractorId || '');
    return reviewWithCreatedAt;
  }

  const handleSaveEditServices = async () => {
    if (!editServicesModal.booking || !user || !editStartDate || !editEndDate || !editEndTime) return
    setIsEditServicesPending(true)
    setEditServicesError(null)
    try {
      const updated = await updateBookingServices({
        bookingId: editServicesModal.booking.id,
        newServices: editServices,
        userId: user.id,
        newStartDate: editStartDate,
        newEndDate: editEndDate,
        newEndTime: editEndTime,
      })
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
          console.log('Bookings after edit:', latest.map(b => ({ id: b.id, startDate: b.startDate, endDate: b.endDate })));
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
      <>
        <div className="flex justify-end mb-4">
          <Button onClick={() => setIsRequestOpen(true)}>New Booking</Button>
        </div>
        <div className="text-muted-foreground">No bookings found.</div>
        <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Booking Request</DialogTitle>
            </DialogHeader>
            <BookingRequestForm onSuccess={handleRequestSuccess} />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <section className="w-full px-2 sm:px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsRequestOpen(true)}>New Booking</Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-4">
        <TabsList className="w-full flex flex-wrap gap-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        {['all', 'pending', 'approved', 'completed', 'cancelled'].map(tab => (
          <TabsContent key={tab} value={tab} className="w-full">
            <div className="grid gap-4 w-full">
              {filterBookings(tab).length === 0 ? (
                <div className="text-muted-foreground p-8 text-center">No bookings found.</div>
              ) : (
                filterBookings(tab).map((b) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const bookingDate = new Date(b.startDate);
                  bookingDate.setHours(0, 0, 0, 0);
                  const canEditServices = (b.status === 'approved') || (b.status === 'pending' && bookingDate >= today);
                  const canMessage = bookingMessageEligibility[b.id] === true;

                  return (
                    <Card
                      key={b.id}
                      className="w-full bg-white rounded-lg shadow-md border border-gray-200 flex flex-col gap-0 p-0 sm:p-0 md:p-0 lg:p-0 xl:p-0"
                    >
                      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 flex-wrap p-4 pb-2 border-b">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                            {hasMultipleServices(b) ? (
                              <Badge variant="outline" className="mr-2 bg-primary/10 text-primary">
                                <Package className="h-3 w-3 mr-1" />
                                {b.services?.length} services
                              </Badge>
                            ) : null}
                            <span className="truncate max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl">{getServiceNames(b)}</span>
                          </CardTitle>
                          <div className="text-sm text-gray-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-primary" />
                              {getBookingDateTimeRange(b)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-end gap-2 min-w-[120px] sm:min-w-[100px] mt-2 sm:mt-0">
                          <StatusBadge status={b.status} />
                          <span className={`capitalize text-xs${b.paymentStatus === 'cancelled' ? ' text-red-600' : ''}`}>{b.paymentStatus}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 pt-2">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <span className="text-xs text-muted-foreground">Contractor: <span className="font-medium text-foreground">{contractorNameById(b.contractorId)}</span></span>
                          <span className="text-xs text-muted-foreground">Pets: <span className="font-medium text-foreground">{b.petIds?.length ?? 0}</span></span>
                          {b.review && (
                            <span className="text-xs text-muted-foreground">Review: <span className="font-medium text-foreground">{b.review.rating}★</span> {b.review.comment}</span>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-end items-center w-full sm:w-auto mt-2 sm:mt-0">
                          <Button variant="outline" className="text-sm px-3 py-1 rounded-full shadow-sm w-full sm:w-auto" onClick={() => setDetailBooking(b)}>
                            Details
                          </Button>
                          {canMessage && (
                            <Link href={`/dashboard/messages/${b.id}`} passHref>
                              <Button variant="outline" className="text-sm px-3 py-1 rounded-full shadow-sm w-full sm:w-auto">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Message Contractor
                              </Button>
                            </Link>
                          )}
                          {canEditServices && (
                            <Button
                              variant="outline"
                              className="text-sm px-3 py-1 rounded-full shadow-sm w-full sm:w-auto"
                              onClick={() => setEditServicesModal({ open: true, booking: b })}
                            >
                              Edit Services
                            </Button>
                          )}
                          <Button 
                            variant="destructive" 
                            className="text-sm px-3 py-1 rounded-full shadow-sm w-full sm:w-auto" 
                            onClick={() => setCancelId(b.id)} 
                            disabled={isPending || !(['pending', 'approved'].includes(b.status))}
                          >
                            Cancel
                          </Button>
                          {b.status === 'approved' && b.paymentStatus === 'pending' && !b.clientCompleted && (
                            <Button
                              variant="default"
                              className="text-sm px-3 py-1 rounded-full shadow-sm w-full sm:w-auto"
                              onClick={() => handleClientComplete(b.id)}
                              disabled={isPending}
                            >
                              {isPending ? 'Marking...' : 'Mark as Completed'}
                            </Button>
                          )}
                          {b.status === 'approved' && b.paymentStatus === 'pending' && b.clientCompleted && !b.contractorCompleted && (
                            <span className="text-xs text-muted-foreground w-full sm:w-auto">Waiting for contractor...</span>
                          )}
                          {b.status === 'approved' && b.paymentStatus === 'pending' && b.clientCompleted && b.contractorCompleted && (
                            <Button
                              variant="default"
                              className="text-sm px-3 py-1 rounded-full shadow-sm w-full sm:w-auto"
                              onClick={() => handleConfirmPayment(b, setIsPending, setError, setBookings)}
                              disabled={isPending}
                            >
                              {isPending ? 'Confirming...' : 'Release Payment'}
                            </Button>
                          )}
                          {b.status === 'completed' && b.paymentStatus === 'paid' && !b.review && (
                            <Button
                              variant="default"
                              className="text-sm px-3 py-1 rounded-full shadow-sm w-full sm:w-auto"
                              onClick={() => setReviewModal({ open: true, booking: b })}
                            >
                              Leave Review
                            </Button>
                          )}
                          {releasePaymentError && (
                            <div className="text-xs text-red-600 w-full text-right">{releasePaymentError}</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Emergency Booking Cancellation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              You are about to cancel this booking. This action is <strong>irreversible</strong> and should only be used in case of:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Emergencies that prevent you from fulfilling the booking</li>
              <li>Serious misunderstandings about service requirements</li>
              <li>Safety concerns</li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
              <p className="font-medium text-amber-800">What happens when you cancel:</p>
              <ul className="list-disc pl-5 text-amber-700 mt-1">
                <li>Any pending payment will be canceled</li>
                <li>The contractor will be notified</li>
                <li>The booking will be permanently deleted</li>
                <li>Frequent cancellations may affect your account standing</li>
              </ul>
            </div>
            {error && <div className="text-destructive text-sm mt-2">{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)} disabled={isPending}>
              No, Keep Booking
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
              {isPending ? 'Cancelling...' : 'Yes, Cancel Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Booking Request</DialogTitle>
          </DialogHeader>
          <BookingRequestForm onSuccess={handleRequestSuccess} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!detailBooking} onOpenChange={() => setDetailBooking(null)}>
        <DialogContent className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {detailBooking && (
            <section className="space-y-6">
              {/* Status & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b pb-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold shadow-sm
                    ${detailBooking.status === 'completed' ? 'bg-green-100 text-green-800' :
                      detailBooking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      detailBooking.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-200 text-gray-700'}`}
                  >
                    {detailBooking.status?.charAt(0).toUpperCase() + detailBooking.status?.slice(1)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">Payment Status</span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800 capitalize shadow-sm">
                    {detailBooking.paymentStatus}
                  </span>
                </div>
                {/* Date, Time, and Duration (responsive) */}
                <div className="col-span-1 sm:col-span-2 mt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 bg-muted/50 rounded-md px-4 py-3 w-full">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground">Date & Time</span>
                      <span className="font-bold text-base flex items-center gap-2 break-words">
                        <Clock className="w-4 h-4 text-primary shrink-0" />
                        {getBookingDateTimeRange(detailBooking)}
                      </span>
                    </div>
                    <div className="flex flex-col flex-none sm:border-l sm:border-border sm:pl-6">
                      <span className="text-xs text-muted-foreground">Duration</span>
                      <span className="font-semibold text-base">{detailBooking.numberOfDays} day{detailBooking.numberOfDays !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Contractor Info (separate row) */}
              <div className="border-b pb-4">
                <span className="text-xs text-muted-foreground">Contractor</span>
                <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
                  {/* Contractor profile image */}
                  {(() => {
                    const contractor = contractors.find(c => c.id === detailBooking?.contractorId)
                    return contractor?.profileImage ? (
                      <img
                        src={contractor.profileImage}
                        alt={contractor.name}
                        className="w-16 h-16 rounded-full border object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold border flex-shrink-0">
                        {contractor?.name?.charAt(0) ?? "?"}
                      </div>
                    )
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lg truncate">{detailBooking?.contractorName || contractorNameById(detailBooking?.contractorId)}</div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                      <div>
                        <span className="text-xs text-muted-foreground block">Phone</span>
                        <span className="font-medium text-base block break-all">
                          {detailBooking?.contractorPhone || (contractors.find(c => c.id === detailBooking?.contractorId)?.phone ?? 'N/A')}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Location</span>
                        <span className="font-medium text-base block">
                          {(() => {
                            const contractor = contractors.find(c => c.id === detailBooking?.contractorId)
                            if (contractor?.city || contractor?.state) {
                              return `${contractor.city || ''}${contractor.city && contractor.state ? ', ' : ''}${contractor.state || ''}`
                            }
                            return 'N/A'
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Pets Info (separate row) */}
              <div className="border-b pb-4">
                <span className="text-xs text-muted-foreground">Pets</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {petNames.length > 0 ? petNames.map(name => (
                    <span key={name} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium shadow-sm">{name}</span>
                  )) : <span className="text-muted-foreground text-sm">None</span>}
                </div>
              </div>
              {/* Services & Payment */}
              <div className="border-b pb-4">
                <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary"/>
                  Services & Payment
                </h3>
                <div className="space-y-3">
                  {detailBooking.services.map((service, idx) => {
                    const platformService = platformServices.find(ps => ps.id === service.serviceId);
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-muted/50 rounded-md px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-semibold text-base">{platformService?.name || service.name || service.serviceId}</span>
                          <span className="text-xs text-muted-foreground">
                            {service.paymentType === 'one_time' ? 'One-time payment' : 'Daily rate'}
                          </span>
                        </div>
                        <div className="text-right mt-2 sm:mt-0">
                          <span className="font-bold text-lg">{formatServicePrice(service, detailBooking.numberOfDays || 1)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center border-t pt-3 mt-2">
                    <span className="font-semibold text-base">Total Payment</span>
                    <span className="font-bold text-primary text-xl">${formatAmount(detailBooking.paymentAmount || 0)}</span>
                  </div>
                </div>
              </div>
              {/* Duration & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">Payment Method</span>
                  <span className="font-medium text-base">{defaultMethod ? `${defaultMethod.brand?.toUpperCase?.() ?? ''} •••• ${defaultMethod.last4 ?? ''}` : 'Not specified'}</span>
                </div>
              </div>
              {/* Booking ID & Calendar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t pt-4 mt-2">
                <div>
                  <span className="text-xs text-muted-foreground">Booking ID</span>
                  <div className="font-mono break-all text-xs mt-1">{detailBooking?.id ?? ''}</div>
                </div>
                <div className="flex justify-end mt-2 sm:mt-0">
                  <a
                    href={getGoogleCalendarUrl(detailBooking, contractorNameById(detailBooking.contractorId), petNames)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Button variant="outline" className="text-sm px-3 py-1 rounded-full shadow-sm">Add to Google Calendar</Button>
                  </a>
                </div>
              </div>
            </section>
          )}
          <DialogFooter>
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setDetailBooking(null)}>Close</Button>
              {detailBooking?.status === 'pending' || detailBooking?.status === 'approved' ? (
                <Button 
                  variant="destructive" 
                  onClick={() => { 
                    setCancelId(detailBooking.id); 
                    setDetailBooking(null); 
                  }} 
                  disabled={isPending}
                >
                  Cancel Booking
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={reviewModal.open} onOpenChange={open => setReviewModal({ open, booking: open ? reviewModal.booking : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
          </DialogHeader>
          {reviewModal.booking && (
            <ReviewForm
              booking={reviewModal.booking}
              onClose={() => setReviewModal({ open: false, booking: null })}
              onSaved={async (review) => {
                const reviewWithCreatedAt = await saveReview(reviewModal.booking!.id, review, reviewModal.booking!.contractorId);
                setBookings(prev => prev.map(b => b.id === reviewModal.booking!.id ? { ...b, review: reviewWithCreatedAt } : b));
                setReviewModal({ open: false, booking: null });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={editServicesModal.open || editModalForceOpen}
        onOpenChange={open => {
          if (pendingPaymentClientSecret) {
            setEditModalWarning('You must complete payment authorization to finish updating your booking.');
            setEditModalForceOpen(true);
            return;
          }
          setEditServicesModal({ open, booking: open ? editServicesModal.booking : null });
          setEditModalForceOpen(false);
          setEditModalWarning(null);
        }}
      >
        <DialogContent className="w-full max-w-screen-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          {editModalWarning && (
            <div className="text-xs text-red-600 mb-2">{editModalWarning}</div>
          )}
          {editServicesModal.booking && (
            <section className="space-y-6">
              <div className="text-sm mb-2">
                {editServicesModal.booking.status === 'pending'
                  ? 'You can edit services, end date, and end time.'
                  : 'You can only edit the end date and end time for this booking.'}
              </div>
              {editServicesError && <div className="text-red-600 text-xs mb-2">{editServicesError}</div>}
              {/* Dates and Duration - Responsive, balanced for desktop */}
              <div className="flex flex-col md:flex-row md:items-end gap-4 mb-2 w-full">
                <div className="flex flex-col flex-1 min-w-0">
                  <label className="block text-xs font-medium mb-1">End Date</label>
                  <Input
                    type="date"
                    value={editEndDate || ''}
                    min={editStartDate || new Date().toISOString().split('T')[0]}
                    onChange={e => {
                      if (editStartDate && e.target.value < editStartDate) return;
                      setEditEndDate(e.target.value)
                    }}
                  />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <label className="block text-xs font-medium mb-1">End Time</label>
                  <Input type="time" value={editEndTime || ''} onChange={e => setEditEndTime(e.target.value)} />
                </div>
                <div className="flex flex-col flex-none md:pl-4 md:items-end">
                  <span className="text-xs text-muted-foreground">Duration</span>
                  <span className="font-semibold text-base">{editNumDays} day{editNumDays !== 1 ? 's' : ''}</span>
                </div>
              </div>
              {/* Services List - Responsive Grid, balanced for desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 w-full">
                {editServicesOptions.map((offering: any) => {
                  const checked = editServices.some((s: any) => s.serviceId === offering.serviceId)
                  const platformService = platformServices.find(ps => ps.id === offering.serviceId)
                  const isEditable = editServicesModal.booking?.status === 'pending'
                  return (
                    <label key={offering.serviceId} className={`flex flex-col items-start gap-1 p-3 border rounded-md cursor-pointer transition-colors duration-100 min-w-0 ${checked ? 'bg-primary/10 border-primary' : 'hover:bg-accent'}${!isEditable ? ' opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex items-center w-full min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (!isEditable) return
                            setEditServices(prev => checked ? prev.filter((s: any) => s.serviceId !== offering.serviceId) : [...prev, offering])
                          }}
                          className="accent-primary h-4 w-4 mr-2"
                          disabled={!isEditable}
                        />
                        <span className="font-medium truncate">{platformService?.name || offering.serviceId}</span>
                        <span className="text-xs text-muted-foreground ml-2">${(offering.price / 100).toFixed(2)}{offering.paymentType === 'daily' ? '/day' : ''}</span>
                      </div>
                      {platformService?.description && (
                        <span className="text-xs text-muted-foreground ml-6 break-words">{platformService.description}</span>
                      )}
                    </label>
                  )
                })}
              </div>
              {/* Total and Actions - Responsive, centered for desktop */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2 w-full">
                <div className="text-right text-sm font-semibold flex-1">
                  Total: <span className="text-primary text-lg font-bold">${(editTotal/100).toFixed(2)}</span>
                </div>
                <DialogFooter className="flex flex-col md:flex-row gap-2 w-full md:w-auto justify-end">
                  <Button variant="outline" onClick={() => setEditServicesModal({ open: false, booking: null })} disabled={isEditServicesPending || !!pendingPaymentClientSecret || !editServicesModal.booking} className="w-full md:w-auto">Cancel</Button>
                  <Button
                    onClick={handleSaveEditServices}
                    disabled={isEditServicesPending || !!pendingPaymentClientSecret || !editServicesModal.booking}
                    className="w-full md:w-auto"
                  >
                    Save Changes
                  </Button>
                </DialogFooter>
              </div>
              {/* Payment Reauth (if needed) */}
              {pendingPaymentClientSecret && editServicesModal.booking && pendingPaymentBookingId === editServicesModal.booking.id && (
                <div className="mt-4">
                  <Elements stripe={stripePromise} options={{ clientSecret: pendingPaymentClientSecret }}>
                    <PaymentReauthForm
                      clientSecret={pendingPaymentClientSecret}
                      onSuccess={async () => {
                        setPendingPaymentClientSecret(null)
                        setPendingPaymentBookingId(null)
                        setEditModalForceOpen(false)
                        setEditModalWarning(null)
                        // Refetch all bookings to update UI everywhere
                        if (user) {
                          const latest = await getBookingsForClient(user.id)
                          setBookings(latest)
                          console.log('Bookings after edit:', latest.map(b => ({ id: b.id, startDate: b.startDate, endDate: b.endDate })));
                        }
                      }}
                      onError={msg => setEditServicesError(msg)}
                    />
                  </Elements>
                </div>
              )}
            </section>
          )}
        </DialogContent>
      </Dialog>
    </section>
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
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Rating</label>
        <select value={rating} onChange={e => setRating(Number(e.target.value))} className="w-full border rounded px-2 py-1">
          {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Comment (optional)</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} className="w-full border rounded px-2 py-1" rows={3} />
      </div>
      {error && <div className="text-destructive text-sm">{error}</div>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Submit Review'}</Button>
      </DialogFooter>
    </form>
  )
} 