'use client'

import type { Booking } from '@/types/booking'
import type { Client } from '@/types/client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { removeBooking, getBookingsForClient, setClientCompleted, saveBookingReview } from '@/lib/firebase/bookings'
import { BookingRequestForm } from './booking-request-form'
import { useUser } from '@clerk/nextjs'
import { getAllContractors } from '@/lib/firebase/contractors'
import type { Contractor } from '@/types/contractor'
import { getClientProfile } from '@/lib/firebase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Package, Clock } from 'lucide-react'

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
    } catch (err) {
      // Optionally handle error
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleConfirmPayment(booking: ExtendedBooking, setIsPending: (v: boolean) => void, setError: (v: string | null) => void, setBookings: (fn: (prev: ExtendedBooking[]) => ExtendedBooking[]) => void) {
    setIsPending(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/capture-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: booking.paymentIntentId, bookingId: booking.id }),
      })
      if (!res.ok) throw new Error('Failed to capture payment')
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, paymentStatus: 'paid', status: 'completed' } : b))
    } catch (err) {
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

  // Helper to safely format date
  const safeDateString = (date?: string) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleString();
    } catch {
      return '';
    }
  };

  const getBookingStartDate = (b: ExtendedBooking | null) => (b?.startDate ?? b?.date ?? '') || '';
  const getBookingEndDate = (b: ExtendedBooking | null) => (b?.endDate ?? '') || '';

  // Add a function to format the date and time
  const formatDateTime = (date: string | undefined, time?: {startTime?: string, endTime?: string}) => {
    if (!date) return '';
    
    const formattedDate = safeDateString(date);
    if (!time) return formattedDate;
    
    const { startTime, endTime } = time;
    if (startTime && endTime) {
      return `${formattedDate}, ${startTime} - ${endTime}`;
    } else if (startTime) {
      return `${formattedDate}, ${startTime}`;
    }
    
    return formattedDate;
  };

  // Update getBookingDisplayDate function to include time
  const getBookingDisplayDate = (b: ExtendedBooking) => {
    const start = b.startDate || b.date || '';
    const end = b.endDate || '';
    
    if (start && end) {
      if (b.time?.startTime && b.time?.endTime) {
        return `${formatDateTime(start, b.time)} — ${formatDateTime(end, b.time)}`;
      }
      return `${safeDateString(start)} — ${safeDateString(end)}`;
    }
    
    if (start) {
      if (b.time?.startTime) {
        return formatDateTime(start, b.time);
      }
      return safeDateString(start);
    }
    
    return '';
  };

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

  // Helper to convert price in cents to dollars if needed
  const formatAmount = (amount: number) => {
    // Check if the amount appears to be in cents (typically large round numbers)
    const isInCents = amount > 100 && amount % 100 === 0;
    const displayAmount = isInCents ? amount / 100 : amount;
    return displayAmount.toFixed(2);
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

  // Add helper function to calculate hours between start and end time
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
                filterBookings(tab).map((b) => (
                  <Card key={b.id} className="w-full">
                    <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                      <div>
                        <CardTitle className="text-lg flex items-center">
                          {hasMultipleServices(b) ? (
                            <Badge variant="outline" className="mr-2 bg-primary/10 text-primary">
                              <Package className="h-3 w-3 mr-1" />
                              {b.services?.length} services
                            </Badge>
                          ) : null}
                          {getServiceNames(b)}
                        </CardTitle>
                        <div className="text-sm text-gray-500">{getBookingDisplayDate(b)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2 min-w-[120px]">
                        <StatusBadge status={b.status} />
                        <span className={`capitalize text-xs${b.paymentStatus === 'cancelled' ? ' text-red-600' : ''}`}>{b.paymentStatus}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Contractor: <span className="font-medium text-foreground">{contractorNameById(b.contractorId)}</span></span>
                        <span className="text-xs text-muted-foreground">Pets: <span className="font-medium text-foreground">{b.petIds?.length ?? 0}</span></span>
                        {b.review && (
                          <span className="text-xs text-muted-foreground">Review: <span className="font-medium text-foreground">{b.review.rating}★</span> {b.review.comment}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button variant="outline" className="text-sm px-2 py-1" onClick={() => setDetailBooking(b)}>
                          Details
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="text-sm px-2 py-1" 
                          onClick={() => setCancelId(b.id)} 
                          disabled={isPending || !(['pending', 'approved'].includes(b.status))}
                        >
                          Cancel
                        </Button>
                        {b.status === 'approved' && b.paymentStatus === 'pending' && !b.clientCompleted && (
                          <Button
                            variant="default"
                            className="text-sm px-2 py-1"
                            onClick={() => handleClientComplete(b.id)}
                            disabled={isPending}
                          >
                            {isPending ? 'Marking...' : 'Mark as Completed'}
                          </Button>
                        )}
                        {b.status === 'approved' && b.paymentStatus === 'pending' && b.clientCompleted && !b.contractorCompleted && (
                          <span className="text-xs text-muted-foreground">Waiting for contractor...</span>
                        )}
                        {b.status === 'approved' && b.paymentStatus === 'pending' && b.clientCompleted && b.contractorCompleted && (
                          <Button
                            variant="default"
                            className="text-sm px-2 py-1"
                            onClick={() => handleConfirmPayment(b, setIsPending, setError, setBookings)}
                            disabled={isPending}
                          >
                            {isPending ? 'Confirming...' : 'Release Payment'}
                          </Button>
                        )}
                        {b.status === 'completed' && b.paymentStatus === 'paid' && !b.review && (
                          <Button
                            variant="default"
                            className="text-sm px-2 py-1"
                            onClick={() => setReviewModal({ open: true, booking: b })}
                          >
                            Leave Review
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
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
        <DialogContent className="w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {detailBooking && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">Booking Details</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Service Type</div>
                  <div className="font-medium text-base">
                    {detailBooking?.services && detailBooking.services.length > 0 ? (
                      <div className="space-y-1">
                        {detailBooking.services.map((service, idx) => (
                          <div key={idx} className="flex items-center">
                            <Package className="h-4 w-4 mr-1 text-primary" />
                            <span>{service.name || service.serviceId}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      detailBooking?.serviceType || 'N/A'
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-medium">
                    {detailBooking?.status?.charAt(0).toUpperCase() + detailBooking?.status?.slice(1)}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Date & Time</div>
                  <div className="font-medium text-base">
                    {detailBooking?.time?.startTime ? (
                      <>
                        {safeDateString(getBookingStartDate(detailBooking))}, {detailBooking.time.startTime} 
                        {detailBooking.time.endTime ? ` - ${detailBooking.time.endTime}` : ''}
                      </>
                    ) : (
                      getBookingDisplayDate(detailBooking)
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Payment Status</div>
                  <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-medium capitalize">
                    {detailBooking?.paymentStatus}
                  </span>
                </div>
              </div>
              
              {/* Add Duration Details section */}
              {detailBooking?.time?.startTime && detailBooking?.time?.endTime && (
                <div className="sm:col-span-2 border rounded-md p-4 mt-2 bg-muted/50">
                  <h3 className="text-sm font-semibold mb-2 flex items-center">
                    <Clock className="w-4 h-4 mr-1 text-primary" />
                    Duration Details
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Hours per day:</span>
                      <span className="font-medium ml-2">
                        {calculateHours(detailBooking.time.startTime, detailBooking.time.endTime)} hours
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total days:</span>
                      <span className="font-medium ml-2">
                        {detailBooking.numberOfDays || 1} day{(detailBooking.numberOfDays || 1) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Total service hours:</span>
                      <span className="font-medium ml-2">
                        {calculateHours(detailBooking.time.startTime, detailBooking.time.endTime) * (detailBooking.numberOfDays || 1)} hours
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Display service details and breakdown */}
              {detailBooking?.services && detailBooking.services.length > 0 && (
                <div className="border border-gray-200 rounded-md p-4 mt-4">
                  <h3 className="text-base font-semibold mb-3 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-primary"/>
                    Service Details
                  </h3>
                  <div className="space-y-3">
                    {detailBooking.services.map((service, idx) => (
                      <div key={idx} className="flex justify-between items-center pb-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{service.name || service.serviceId}</span>
                          <span className="text-xs text-muted-foreground">
                            {service.paymentType === 'one_time' ? 'One-time payment' : 'Daily rate'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatServicePrice(service, detailBooking.numberOfDays || 1)}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t pt-3 mt-2 flex justify-between items-center">
                      <div className="font-semibold">Total Payment:</div>
                      <div className="font-semibold text-primary text-lg">
                        ${formatAmount(detailBooking.paymentAmount || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="text-xs text-muted-foreground mb-1">Contractor</div>
                <div className="font-medium text-base">{contractorNameById(detailBooking?.contractorId)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Pets</div>
                <div className="flex flex-wrap gap-2">
                  {petNames.length > 0 ? petNames.map(name => (
                    <span key={name} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">{name}</span>
                  )) : <span className="text-muted-foreground text-xs">None</span>}
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="text-xs text-muted-foreground mb-2 font-semibold">Payment Information</div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Amount</div>
                    <div className="font-semibold text-base">${formatAmount(detailBooking?.paymentAmount || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Platform Fee (5%)</div>
                    <div className="font-semibold text-base text-red-600">-${formatAmount(detailBooking?.platformFee || (detailBooking?.paymentAmount || 0) * 0.05)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Stripe Fee</div>
                    <div className="font-semibold text-base text-red-600">-${formatAmount(detailBooking?.stripeFee || ((detailBooking?.paymentAmount || 0) * 0.029 + 0.3))}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground mb-1">Net to Contractor</div>
                    <div className="font-semibold text-base text-green-700">${formatAmount(detailBooking?.netPayout || ((detailBooking?.paymentAmount || 0) - (detailBooking?.platformFee || (detailBooking?.paymentAmount || 0) * 0.05) - ((detailBooking?.paymentAmount || 0) * 0.029 + 0.3)))}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground mb-1">Payment Method</div>
                    <div className="font-medium text-base">{defaultMethod ? `${defaultMethod.brand?.toUpperCase?.() ?? ''} •••• ${defaultMethod.last4 ?? ''}` : 'Not specified'}</div>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="text-xs text-muted-foreground mb-2 font-semibold">Booking Process</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Client Completed</div>
                    <div className="font-medium text-base">{detailBooking?.clientCompleted ? 'Yes' : 'No'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Contractor Completed</div>
                    <div className="font-medium text-base">{detailBooking?.contractorCompleted ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4 text-xs text-muted-foreground">
                <div className="mb-1">Booking ID</div>
                <div className="font-mono break-all mb-1">{detailBooking?.id ?? ''}</div>
              </div>
            </div>
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