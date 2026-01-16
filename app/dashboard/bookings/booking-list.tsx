import type { Booking } from '@/types/booking'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { removeBooking, getBookingsForClient, setClientCompleted, saveBookingReview, updateBookingServices } from '@/lib/firebase/bookings'

import { useUser } from '@clerk/nextjs'
import { getAllContractors, getContractorServiceOfferings } from '@/lib/firebase/contractors'
import type { Contractor } from '@/types/contractor'
import { getClientProfile } from '@/lib/firebase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Package, Clock, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
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

interface BookingListProps {
  bookings: Booking[]
  onNewBooking?: () => void
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

export function BookingList({ bookings: initialBookings, onNewBooking }: BookingListProps) {
  const { user } = useUser()
  const [bookings, setBookings] = useState<ExtendedBooking[]>(initialBookings as ExtendedBooking[])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [detailBooking, setDetailBooking] = useState<ExtendedBooking | null>(null)
  const [petNames, setPetNames] = useState<string[]>([])
  const [reviewModal, setReviewModal] = useState<{ open: boolean; booking: ExtendedBooking | null }>({ open: false, booking: null })
  const [paymentConfirmModal, setPaymentConfirmModal] = useState<{ open: boolean; booking: ExtendedBooking | null }>({ open: false, booking: null })
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

  // Coupon state for edit services modal
  const [editCouponCode, setEditCouponCode] = useState('')
  const [editAppliedCoupon, setEditAppliedCoupon] = useState<Coupon | null>(null)
  const [editCouponError, setEditCouponError] = useState<string | null>(null)
  const [isValidatingEditCoupon, setIsValidatingEditCoupon] = useState(false)
  const [editOriginalPrice, setEditOriginalPrice] = useState<number | null>(null)
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

  // When modal opens, set initial dates and recalc
  useEffect(() => {
    if (editServicesModal.open && editServicesModal.booking) {
      setEditStartDate(editServicesModal.booking.startDate)
      setEditEndDate(editServicesModal.booking.endDate)
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
  }, [editServicesModal.open, editServicesModal.booking])

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

  // Add a helper for status badge
  function StatusBadge({ status }: { status: string }) {
    const getStatusStyles = (status: string) => {
      switch (status) {
        case 'completed':
          return 'bg-green-100 text-green-800 border-green-200'
        case 'pending':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        case 'approved':
          return 'bg-blue-100 text-blue-800 border-blue-200'
        case 'cancelled':
          return 'bg-red-100 text-red-800 border-red-200'
        default:
          return 'bg-slate-100 text-slate-800 border-slate-200'
      }
    }

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getStatusStyles(status)}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    )
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
      <div className="space-y-8">
        {/* New Booking Button */}
        <div className="flex justify-center">
          <button
            onClick={() => onNewBooking?.()}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl hover:from-blue-700 hover:to-indigo-700 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-xl"></div>
            <span className="relative flex items-center space-x-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create New Booking</span>
            </span>
          </button>
        </div>

        {/* Empty State */}
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">No bookings yet</h3>
          <p className="text-slate-600 mb-8 max-w-md mx-auto">
            Start by creating your first booking to connect with our professional pet care providers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => onNewBooking?.()}
              className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Get Started
            </button>
            <a
              href="/dashboard/contractors"
              className="inline-flex items-center px-6 py-3 text-base font-medium text-slate-700 bg-white rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors duration-200"
            >
              Browse Contractors
            </a>
          </div>
        </div>


      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-slate-900">All Bookings</h2>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>{bookings.length} total</span>
          </div>
        </div>
        <button
          onClick={() => onNewBooking?.()}
          className="inline-flex items-center px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Booking
        </button>
      </div>

      {/* Modern Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-slate-100/80 backdrop-blur-sm rounded-2xl p-1 h-12 sm:h-14">
          <TabsTrigger
            value="all"
            className="rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-slate-900 text-slate-600 hover:text-slate-900"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-slate-900 text-slate-600 hover:text-slate-900"
          >
            Pending
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-slate-900 text-slate-600 hover:text-slate-900"
          >
            Approved
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-slate-900 text-slate-600 hover:text-slate-900"
          >
            Completed
          </TabsTrigger>
          <TabsTrigger
            value="cancelled"
            className="rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-slate-900 text-slate-600 hover:text-slate-900"
          >
            Cancelled
          </TabsTrigger>
        </TabsList>

        {['all', 'pending', 'approved', 'completed', 'cancelled'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-8">
            <div className="space-y-4">
              {filterBookings(tab).length === 0 ? (
                <div className="text-center py-16">
                  <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No {tab === 'all' ? '' : tab} bookings</h3>
                  <p className="text-slate-600">
                    {tab === 'all'
                      ? 'Create your first booking to get started.'
                      : `You don't have any ${tab} bookings at the moment.`
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {filterBookings(tab).map((b) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const bookingDate = new Date(b.startDate);
                    bookingDate.setHours(0, 0, 0, 0);
                    const canEditServices = (b.status === 'approved' && canEditBookingDates(b)) || (b.status === 'pending' && bookingDate >= today);
                    const canMessage = bookingMessageEligibility[b.id] === true;

                    return (
                      <Card
                        key={b.id}
                        className="group relative bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 hover:border-slate-300/60 overflow-hidden"
                      >
                        {/* Status Indicator Bar */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${b.status === 'completed' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                            b.status === 'pending' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                              b.status === 'approved' ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                                'bg-gradient-to-r from-slate-300 to-slate-400'
                          }`}></div>

                        <CardHeader className="pb-4">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                {hasMultipleServices(b) && (
                                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 font-medium px-3 py-1">
                                    <Package className="h-3 w-3 mr-1" />
                                    {b.services?.length} services
                                  </Badge>
                                )}
                                <StatusBadge status={b.status} />
                              </div>
                              <CardTitle className="text-xl font-bold text-slate-900 mb-2 line-clamp-2">
                                {getServiceNames(b)}
                              </CardTitle>
                              <div className="flex items-center text-slate-600 mb-3">
                                <Clock className="w-4 h-4 mr-2 text-blue-500" />
                                <span className="font-medium">{getBookingDateTimeRange(b)}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 lg:min-w-[140px]">
                              <div className="text-right">
                                <div className="text-2xl font-bold text-slate-900">
                                  ${formatAmount(b.paymentAmount || 0)}
                                </div>
                                <div className={`text-sm font-medium capitalize ${b.paymentStatus === 'paid' ? 'text-green-600' :
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

                        <CardContent className="pt-0">
                          {/* Contractor & Pet Info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-slate-50/50 rounded-xl">
                            <div>
                              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Contractor</div>
                              <div className="font-semibold text-slate-900">{contractorNameById(b.contractorId)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Pets</div>
                              <div className="font-semibold text-slate-900">{b.petIds?.length ?? 0} pet{(b.petIds?.length ?? 0) !== 1 ? 's' : ''}</div>
                            </div>
                          </div>

                          {/* Review Display */}
                          {b.review && (
                            <div className="mb-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <svg
                                      key={i}
                                      className={`w-4 h-4 ${i < (b.review?.rating || 0) ? 'text-yellow-400' : 'text-slate-300'}`}
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
                                <p className="text-sm text-slate-600 italic">"{b.review.comment}"</p>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setDetailBooking(b)}
                              className="flex-1 sm:flex-none bg-white hover:bg-slate-50 border-slate-300 text-slate-700 font-medium rounded-xl px-6 py-2.5 transition-all duration-200 hover:shadow-md"
                            >
                              View Details
                            </Button>

                            {canMessage && (
                              <Link href={`/dashboard/messages/${b.id}`} passHref>
                                <Button
                                  variant="outline"
                                  className="flex-1 sm:flex-none bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 font-medium rounded-xl px-6 py-2.5 transition-all duration-200 hover:shadow-md"
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
                                className="flex-1 sm:flex-none bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700 font-medium rounded-xl px-6 py-2.5 transition-all duration-200 hover:shadow-md"
                              >
                                Edit Services
                              </Button>
                            )}

                            {(['pending', 'approved'].includes(b.status)) && (
                              <Button
                                variant="destructive"
                                onClick={() => setCancelId(b.id)}
                                disabled={isPending}
                                className="flex-1 sm:flex-none bg-red-50 hover:bg-red-100 border-red-200 text-red-700 font-medium rounded-xl px-6 py-2.5 transition-all duration-200 hover:shadow-md disabled:opacity-50"
                              >
                                Cancel
                              </Button>
                            )}

                            {b.status === 'approved' && b.paymentStatus === 'pending' && !b.clientCompleted && (
                              <Button
                                onClick={() => handleClientComplete(b.id)}
                                disabled={isPending}
                                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl px-6 py-2.5 transition-all duration-200 hover:shadow-md disabled:opacity-50"
                              >
                                {isPending ? 'Marking...' : 'Mark Complete'}
                              </Button>
                            )}

                            {b.status === 'approved' && b.paymentStatus === 'pending' && b.clientCompleted && !b.contractorCompleted && (
                              <div className="flex-1 sm:flex-none px-6 py-2.5 bg-yellow-50 border border-yellow-200 rounded-xl">
                                <span className="text-sm text-yellow-700 font-medium">Waiting for contractor...</span>
                              </div>
                            )}

                            {b.status === 'approved' && b.paymentStatus === 'pending' && b.clientCompleted && b.contractorCompleted && (
                              <Button
                                onClick={() => setPaymentConfirmModal({ open: true, booking: b })}
                                disabled={isPending}
                                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl px-6 py-2.5 transition-all duration-200 hover:shadow-md disabled:opacity-50"
                              >
                                Release Payment
                              </Button>
                            )}

                            {b.status === 'completed' && b.paymentStatus === 'paid' && !b.review && (
                              <Button
                                onClick={() => setReviewModal({ open: true, booking: b })}
                                className="flex-1 sm:flex-none bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-xl px-6 py-2.5 transition-all duration-200 hover:shadow-md"
                              >
                                Leave Review
                              </Button>
                            )}
                          </div>

                          {releasePaymentError && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                              <p className="text-sm text-red-600 font-medium">{releasePaymentError}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-xl font-bold text-red-600">Cancel Booking</DialogTitle>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <DialogTitle className="text-2xl font-bold text-slate-900">Cancel Booking</DialogTitle>
            <p className="text-slate-600 mt-2">This action cannot be undone</p>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-slate-700 mb-4">
                You are about to cancel this booking. This should only be done in case of:
              </p>
              <div className="grid grid-cols-1 gap-3 text-left">
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-sm text-slate-700">Emergencies that prevent you from fulfilling the booking</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-sm text-slate-700">Serious misunderstandings about service requirements</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-sm text-slate-700">Safety concerns</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-amber-800 mb-2">What happens when you cancel:</p>
                  <ul className="space-y-1 text-sm text-amber-700">
                    <li>• Any pending payment will be canceled</li>
                    <li>• The contractor will be notified immediately</li>
                    <li>• The booking will be permanently deleted</li>
                    <li>• Frequent cancellations may affect your account standing</li>
                  </ul>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              variant="outline"
              onClick={() => setCancelId(null)}
              disabled={isPending}
              className="flex-1 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 font-medium rounded-xl px-6 py-3"
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl px-6 py-3 disabled:opacity-50"
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
        </DialogContent>
      </Dialog>
      <Dialog open={!!detailBooking} onOpenChange={() => setDetailBooking(null)}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl font-bold text-slate-900">Booking Details</DialogTitle>
            <p className="text-slate-600 mt-1">Complete information about your booking</p>
          </DialogHeader>
          {detailBooking && (
            <section className="space-y-8">
              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-200/60">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{getServiceNames(detailBooking)}</h3>
                    <p className="text-slate-600 text-sm">Booking #{detailBooking.id.slice(-8)}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <StatusBadge status={detailBooking.status} />
                  <span className={`text-sm font-medium capitalize ${detailBooking.paymentStatus === 'paid' ? 'text-green-600' :
                      detailBooking.paymentStatus === 'pending' ? 'text-yellow-600' :
                        detailBooking.paymentStatus === 'cancelled' ? 'text-red-600' :
                          'text-slate-500'
                    }`}>
                    Payment: {detailBooking.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Date & Time Section */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900">Schedule</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-2">Date & Time</p>
                    <p className="text-base font-semibold text-slate-900">{getBookingDateTimeRange(detailBooking)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-2">Duration</p>
                    <p className="text-base font-semibold text-slate-900">{detailBooking.numberOfDays} day{detailBooking.numberOfDays !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
              {/* Contractor Info */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900">Contractor</h4>
                </div>
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  {/* Contractor profile image */}
                  {(() => {
                    const contractor = contractors.find(c => c.id === detailBooking?.contractorId)
                    return contractor?.profileImage ? (
                      <img
                        src={contractor.profileImage}
                        alt={contractor.name}
                        className="w-20 h-20 rounded-2xl border-2 border-slate-200 object-cover flex-shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-2xl font-bold border-2 border-slate-200 flex-shrink-0 shadow-sm">
                        {contractor?.name?.charAt(0) ?? "?"}
                      </div>
                    )
                  })()}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xl font-bold text-slate-900 mb-3">{detailBooking?.contractorName || contractorNameById(detailBooking?.contractorId)}</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">Phone</p>
                          <p className="text-base font-semibold text-slate-900">
                            {detailBooking?.contractorPhone || (contractors.find(c => c.id === detailBooking?.contractorId)?.phone ?? 'N/A')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">Location</p>
                          <p className="text-base font-semibold text-slate-900">
                            {(() => {
                              const contractor = contractors.find(c => c.id === detailBooking?.contractorId)
                              if (contractor?.city || contractor?.state) {
                                return `${contractor.city || ''}${contractor.city && contractor.state ? ', ' : ''}${contractor.state || ''}`
                              }
                              return 'N/A'
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Pets Info */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900">Pets</h4>
                </div>
                <div className="flex flex-wrap gap-3">
                  {petNames.length > 0 ? petNames.map(name => (
                    <div key={name} className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-4 py-2 rounded-xl">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-blue-800 font-semibold">{name}</span>
                    </div>
                  )) : (
                    <p className="text-slate-500 italic">No pets specified</p>
                  )}
                </div>
              </div>
              {/* Services & Payment */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900">Services & Payment</h4>
                </div>
                <div className="space-y-4">
                  {detailBooking.services.map((service, idx) => {
                    const platformService = platformServices.find(ps => ps.id === service.serviceId);
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{platformService?.name || service.name || service.serviceId}</p>
                            <p className="text-sm text-slate-500">
                              {service.paymentType === 'one_time' ? 'One-time payment' : 'Daily rate'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right mt-3 sm:mt-0">
                          <p className="text-lg font-bold text-slate-900">{formatServicePrice(service, detailBooking.numberOfDays || 1)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {/* Coupon Information */}
                  {detailBooking.couponCode && (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 mt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-lg font-bold text-slate-900">Coupon Applied</span>
                            <p className="text-sm text-green-600">Code: {detailBooking.couponCode}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {detailBooking.originalPrice && detailBooking.couponDiscount !== undefined && (
                            <>
                              <span className={`text-lg font-bold ${detailBooking.couponDiscount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {detailBooking.couponDiscount > 0 ? '-' : '+'}${formatAmount(Math.abs(detailBooking.couponDiscount))}
                              </span>
                              <p className={`text-xs ${detailBooking.couponDiscount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {detailBooking.couponDiscount > 0 ? 'Discount' : 'Price Increase'}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 mt-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <span className="text-lg font-bold text-slate-900">Total Payment</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">${formatAmount(detailBooking.paymentAmount || 0)}</span>
                  </div>
                </div>
              </div>
              {/* Payment Method & Actions */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900">Payment & Actions</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-2">Payment Method</p>
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {defaultMethod ? `${defaultMethod.brand?.toUpperCase?.() ?? ''} •••• ${defaultMethod.last4 ?? ''}` : 'Not specified'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-2">Booking ID</p>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <code className="text-sm font-mono text-slate-700">#{detailBooking?.id.slice(-12) ?? ''}</code>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <a
                    href={getGoogleCalendarUrl(detailBooking, contractorNameById(detailBooking.contractorId), petNames)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                    </svg>
                    <span>Add to Google Calendar</span>
                  </a>
                </div>
              </div>
            </section>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => setDetailBooking(null)}
              className="flex-1 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 font-medium rounded-xl px-6 py-3"
            >
              Close
            </Button>
            {(detailBooking?.status === 'pending' || detailBooking?.status === 'approved') && (
              <Button
                variant="destructive"
                onClick={() => {
                  setCancelId(detailBooking.id);
                  setDetailBooking(null);
                }}
                disabled={isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl px-6 py-3 disabled:opacity-50"
              >
                Cancel Booking
              </Button>
            )}
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
                await saveReview(reviewModal.booking!.id, review, reviewModal.booking!.contractorId);
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
        <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl mx-auto max-h-[95vh] overflow-y-auto bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-2xl">
          <DialogHeader className="pb-6 border-b border-slate-200/60">
            <DialogTitle className="text-2xl font-bold text-slate-900">Edit Booking Services</DialogTitle>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900">Edit Booking</DialogTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {editServicesModal.booking?.status === 'pending'
                    ? 'Update services, dates, and times for your booking'
                    : 'Adjust end date and time for your booking'}
                </p>
              </div>
            </div>
          </DialogHeader>

          {editModalWarning && (
            <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm font-medium text-amber-800">{editModalWarning}</span>
              </div>
            </div>
          )}

          {editServicesModal.booking && (
            <div className="space-y-8">
              {editServicesError && (
                <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-red-800">{editServicesError}</span>
                  </div>
                </div>
              )}

              {/* Re-approval Warning for Approved Bookings with Date Changes */}
              {editServicesModal.booking?.status === 'approved' &&
               (editStartDate !== editServicesModal.booking?.startDate || editEndDate !== editServicesModal.booking?.endDate) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-amber-800">Re-Approval Required</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Changing the dates of an approved booking will require your contractor to re-approve the booking.
                        The booking status will be moved back to Pending until the contractor confirms the new dates.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Date & Time Section */}
              <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Schedule</h3>
                    <p className="text-sm text-slate-600">Adjust your service dates and times</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Calendar Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">Select Service Dates</h4>
                        <p className="text-sm text-slate-600">Choose your service start and end dates</p>
                      </div>
                    </div>

                    <DateRangePicker
                      value={{ startDate: editStartDate, endDate: editEndDate }}
                      onChange={(range) => {
                        if (range.startDate) setEditStartDate(range.startDate)
                        if (range.endDate) setEditEndDate(range.endDate)
                      }}
                      minDate={new Date().toISOString().split('T')[0]}
                      className="w-full"
                    />
                  </div>

                  {/* Time & Summary Section */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900">Time Details</h4>
                          <p className="text-sm text-slate-600">Set your service end time</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">End Time</label>
                        <Input
                          type="time"
                          value={editEndTime || ''}
                          onChange={e => setEditEndTime(e.target.value)}
                          className="bg-white border-slate-300 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Service Summary */}
                    <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-200/60">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900">Service Summary</h4>
                          <p className="text-sm text-slate-600">Updated booking details</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white/80 rounded-xl">
                          <span className="text-sm font-medium text-slate-700">Duration</span>
                          <span className="font-bold text-blue-800">{editNumDays} day{editNumDays !== 1 ? 's' : ''}</span>
                        </div>

                        {editAppliedCoupon && editOriginalPrice && (
                          <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-xl">
                            <span className="text-sm font-medium text-green-700">Original Price</span>
                            <span className="font-bold text-green-800 line-through">${editOriginalPrice.toFixed(2)}</span>
                          </div>
                        )}

                        {editAppliedCoupon && (
                          <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-xl">
                            <span className="text-sm font-medium text-green-700">Coupon Discount</span>
                            <span className="font-bold text-green-800">-${(editOriginalPrice! - (editTotal / 100)).toFixed(2)}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center p-3 bg-white/80 rounded-xl">
                          <span className="text-sm font-medium text-slate-700">Updated Total</span>
                          <span className="text-xl font-bold text-blue-900">${(editTotal / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coupon Section */}
              {editServicesModal.booking?.status === 'pending' && (
                <div className="p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl border border-green-200/60 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Have a Coupon?</h3>
                      <p className="text-sm text-slate-600">Enter your coupon code to get a discount</p>
                    </div>
                  </div>

                  {!editAppliedCoupon ? (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          type="text"
                          placeholder="Enter coupon code"
                          value={editCouponCode}
                          onChange={(e) => setEditCouponCode(e.target.value.toUpperCase())}
                          maxLength={8}
                          className="bg-white border-green-300 focus:border-green-500 focus:ring-green-500 rounded-xl"
                          disabled={isValidatingEditCoupon}
                        />
                      </div>
                      <Button
                        onClick={handleApplyEditCoupon}
                        disabled={!editCouponCode.trim() || isValidatingEditCoupon}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all duration-200"
                      >
                        {isValidatingEditCoupon ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Validating...</span>
                          </div>
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-white/80 rounded-xl border border-green-200/40">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-green-800">{editAppliedCoupon.name}</p>
                          <p className="text-sm text-green-600">Code: {editAppliedCoupon.code}</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleRemoveEditCoupon}
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50 rounded-xl"
                      >
                        Remove
                      </Button>
                    </div>
                  )}

                  {editCouponError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <p className="text-red-800 text-sm">{editCouponError}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Services Section */}
              {editServicesModal.booking?.status === 'pending' && (
                <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Services</h3>
                      <p className="text-sm text-slate-600">Choose the services you need</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {editServicesOptions.map((offering: any) => {
                      const checked = editServices.some((s: any) => s.serviceId === offering.serviceId)
                      const platformService = platformServices.find(ps => ps.id === offering.serviceId)

                      return (
                        <div
                          key={offering.serviceId}
                          className={`group relative p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${checked
                              ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-lg transform scale-105'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:bg-slate-50'
                            }`}
                          onClick={() => {
                            const serviceToAdd = {
                              ...offering,
                              paymentType: offering.paymentType === 'per_day' ? 'daily' : offering.paymentType,
                              name: platformService?.name || offering.serviceId
                            };
                            setEditServices(prev =>
                              checked
                                ? prev.filter((s: any) => s.serviceId !== offering.serviceId)
                                : [...prev, serviceToAdd]
                            )
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`mt-0.5 w-5 h-5 border-2 rounded-md transition-all duration-200 flex items-center justify-center ${checked
                                ? 'bg-emerald-600 border-emerald-600'
                                : 'bg-white border-slate-300 group-hover:border-emerald-400'
                              }`}>
                              {checked && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
                                {platformService?.name || offering.serviceId}
                              </h4>
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-emerald-600">
                                  ${(offering.price / 100).toFixed(2)}{(offering.paymentType === 'daily' || offering.paymentType === 'per_day') ? '/day' : ''}
                                </span>
                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                  {(offering.paymentType === 'daily' || offering.paymentType === 'per_day') ? 'Daily rate' : 'One-time fee'}
                                </span>
                              </div>
                              {platformService?.description && (
                                <p className="text-sm text-slate-600 mt-2">{platformService.description}</p>
                              )}
                            </div>
                          </div>
                          {checked && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setEditServicesModal({ open: false, booking: null })}
                  disabled={isEditServicesPending || !!pendingPaymentClientSecret || !editServicesModal.booking}
                  className="bg-white hover:bg-slate-50 border-slate-300 text-slate-700 font-medium rounded-xl px-8 py-3"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEditServices}
                  disabled={isEditServicesPending || !!pendingPaymentClientSecret || !editServicesModal.booking}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isEditServicesPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>

              {/* Payment Reauth (if needed) */}
              {pendingPaymentClientSecret && editServicesModal.booking && pendingPaymentBookingId === editServicesModal.booking.id && (
                <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0h-2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-800">Payment Authorization Required</h4>
                      <p className="text-sm text-amber-700">Please confirm your payment method to complete the booking update</p>
                    </div>
                  </div>
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
                        }
                      }}
                      onError={msg => setEditServicesError(msg)}
                    />
                  </Elements>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Modal */}
      <Dialog open={paymentConfirmModal.open} onOpenChange={open => setPaymentConfirmModal({ open, booking: open ? paymentConfirmModal.booking : null })}>
        <DialogContent className="w-full max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Release Payment</DialogTitle>
          </DialogHeader>
          {paymentConfirmModal.booking && (
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-primary">
                  ${formatAmount(paymentConfirmModal.booking.paymentAmount || 0)}
                </div>
                <p className="text-sm text-muted-foreground">
                  You're about to release payment to the contractor
                </p>
              </div>

              {/* Booking Details */}
              <div className="space-y-4 border-t border-b py-4">
                {/* Date */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Service Date</span>
                  <span className="text-sm text-right">
                    {getBookingDateTimeRange(paymentConfirmModal.booking)}
                  </span>
                </div>

                {/* Contractor */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Contractor</span>
                  <span className="text-sm text-right">
                    {paymentConfirmModal.booking.contractorName || contractorNameById(paymentConfirmModal.booking.contractorId)}
                  </span>
                </div>

                {/* Services */}
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium">Services</span>
                  <div className="text-sm text-right max-w-[60%]">
                    {paymentConfirmModal.booking.services?.map((service, idx) => {
                      const platformService = platformServices.find(ps => ps.id === service.serviceId);
                      return (
                        <div key={idx} className="mb-1">
                          <div className="font-medium">
                            {platformService?.name || service.name || service.serviceId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatServicePrice(service, paymentConfirmModal.booking?.numberOfDays || 1)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Payment Method</span>
                  <span className="text-sm text-right">
                    {defaultMethod ? `${defaultMethod.brand?.toUpperCase?.()} •••• ${defaultMethod.last4}` : 'Default card'}
                  </span>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${formatAmount((paymentConfirmModal.booking.paymentAmount || 0) - (paymentConfirmModal.booking.platformFee || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span>${formatAmount(paymentConfirmModal.booking.platformFee || 0)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total</span>
                  <span>${formatAmount(paymentConfirmModal.booking.paymentAmount || 0)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPaymentConfirmModal({ open: false, booking: null })}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleConfirmPaymentFromModal(paymentConfirmModal.booking!)}
                  disabled={isPending}
                >
                  {isPending ? 'Processing...' : 'Release Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
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
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Rating</label>
        <select value={rating} onChange={e => setRating(Number(e.target.value))} className="w-full border rounded px-2 py-1">
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
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