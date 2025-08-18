'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateRangePicker } from '@/components/ui/date-range-picker'
// import { DatePicker, DateRangePicker } from '@/components/ui/date-picker'; // Future: Consider Shadcn date picker
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select'
import { useUser } from '@clerk/nextjs'
import { getClientProfile } from '@/lib/firebase/client'
import { addBooking, getGigsForContractor } from '@/lib/firebase/bookings' // This now expects startDate, endDate, serviceId
import { getAllContractors, getContractorServiceOfferings, getContractorProfile } from '@/lib/firebase/contractors'
import { getAllPlatformServices } from '@/lib/firebase/services'
import type { Contractor } from '@/types/contractor'
import type { Booking } from '@/types/booking'
import type { ContractorServiceOffering, PlatformService } from '@/types/service'
import type { Pet } from '@/types/client'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, X, AlertTriangle, Clock } from 'lucide-react'
import { calculateClientFeeBreakdown } from '@/lib/utils'
import { validateCoupon } from '@/lib/firebase/coupons'
import { Coupon } from '@/types/coupon'
import { checkBookingConflicts } from '@/lib/firebase/booking-conflicts'
import type { BookingConflict } from '@/lib/firebase/booking-conflicts'
import { calculateTotalDuration, calculateEndTime, formatDuration } from '@/lib/utils/booking-duration'


// REMOVED Unused constant
// const SERVICE_TYPES = [
//   'Dog Walking',
//   'Cat Sitting',
//   'Medication Administration',
//   'Overnight Stay',
// ]

// Helper function (can be moved to utils if used elsewhere client-side)
function calculateDays(startDateISO: string, endDateISO: string): number {
  if (!startDateISO || !endDateISO) return 0;
  const start = new Date(startDateISO);
  const end = new Date(endDateISO);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);
  if (end < start) return 0; // Or throw error, or handle negative days
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 0;
}

// ---- Time formatting helpers for 12-hour UI with AM/PM ----
type AmPm = 'AM' | 'PM'

const HOURS_12: string[] = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES_30: string[] = ['00', '30']

function to12HourParts(time: string): { hour12: string; minute: string; ampm: AmPm } {
  const [hh, mm] = time.split(':').map(Number)
  const ampm: AmPm = hh >= 12 ? 'PM' : 'AM'
  const hour12 = hh % 12 === 0 ? 12 : hh % 12
  return { hour12: String(hour12), minute: mm.toString().padStart(2, '0'), ampm }
}

function to24HourString(hour12: string, minute: string, ampm: AmPm): string {
  let h = parseInt(hour12, 10)
  if (ampm === 'AM') {
    h = h === 12 ? 0 : h
  } else {
    h = h === 12 ? 12 : h + 12
  }
  return `${h.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`
}

function formatTime12(time: string): string {
  const { hour12, minute, ampm } = to12HourParts(time)
  return `${hour12}:${minute} ${ampm}`
}

interface TimePickerProps {
  id: string
  value: string // HH:mm (24-hour) internal value
  onChange: (newValue: string) => void // HH:mm (24-hour)
  className?: string
  disabled?: boolean
}

function TimePicker({ id, value, onChange, className, disabled }: TimePickerProps) {
  const parts = to12HourParts(value)

  const handleChange = (next: Partial<{ hour12: string; minute: string; ampm: AmPm }>) => {
    const merged = {
      hour12: parts.hour12,
      minute: parts.minute,
      ampm: parts.ampm,
      ...next,
    }
    onChange(to24HourString(merged.hour12, merged.minute, merged.ampm))
  }

  return (
    <div id={id} className={className}>
      <div className="grid grid-cols-3 gap-2">
        <Select value={parts.hour12} onValueChange={(v) => handleChange({ hour12: v })} disabled={disabled}>
          <SelectTrigger className="bg-white border-slate-300 focus:border-purple-500 focus:ring-purple-500 rounded-xl" aria-label="Hour">
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent>
            {HOURS_12.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={parts.minute} onValueChange={(v) => handleChange({ minute: v })} disabled={disabled}>
          <SelectTrigger className="bg-white border-slate-300 focus:border-purple-500 focus:ring-purple-500 rounded-xl" aria-label="Minute">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent>
            {MINUTES_30.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={parts.ampm} onValueChange={(v: AmPm) => handleChange({ ampm: v })} disabled={disabled}>
          <SelectTrigger className="bg-white border-slate-300 focus:border-purple-500 focus:ring-purple-500 rounded-xl" aria-label="AM/PM">
            <SelectValue placeholder="AM/PM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Helper function to calculate hours between start and end time
function calculateHours(startTime: string, endTime: string): number {
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

// Interface for selected service
interface SelectedService {
  serviceId: string;
  price: number; // Price in cents
  paymentType: 'one_time' | 'daily';
  name: string;
}

export function BookingRequestForm({ onSuccess, preselectedContractorId }: { onSuccess: () => void; preselectedContractorId?: string | null }) {
  const { user } = useUser()
  const [pets, setPets] = useState<Pet[]>([])
  const [allContractors, setAllContractors] = useState<Contractor[]>([])
  const [selectedContractorId, setSelectedContractorId] = useState(preselectedContractorId || '')
  const [contractorServices, setContractorServices] = useState<ContractorServiceOffering[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [contractorAvailability, setContractorAvailability] = useState<Contractor['availability'] | null>(null)
  const [contractorBookings, setContractorBookings] = useState<Booking[]>([])
  
  // Updated to support multiple services
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
  
  const [selectedPets, setSelectedPets] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({
    startDate: null,
    endDate: null
  })
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [calculatedEndTime, setCalculatedEndTime] = useState<string | null>(null)
  const [totalServiceDuration, setTotalServiceDuration] = useState<number>(0)

  
  // Booking conflict validation state
  const [bookingConflicts, setBookingConflicts] = useState<BookingConflict[]>([])
  const [isValidatingBooking, setIsValidatingBooking] = useState(false)

  // Check if overnight stay is selected
  const hasOvernightStay = useMemo(() => {
    return selectedServices.some(service => 
      service.name.toLowerCase().includes('overnight') || 
      service.name.toLowerCase().includes('stay')
    );
  }, [selectedServices]);

  const [numberOfDays, setNumberOfDays] = useState<number>(0);
  const [hoursPerDay, setHoursPerDay] = useState<number>(0);
  const [calculatedTotalPrice, setCalculatedTotalPrice] = useState<number | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)
  const [originalPrice, setOriginalPrice] = useState<number | null>(null)

  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Remove MOCK_PLATFORM_SERVICES constant
  // Instead add a state to store platform services
  const [platformServices, setPlatformServices] = useState<PlatformService[]>([]);

  // Add useEffect to fetch platform services
  useEffect(() => {
    async function fetchPlatformServices() {
      try {
        const services = await getAllPlatformServices();
        setPlatformServices(services);
      } catch (err) {
        console.error("Error fetching platform services:", err);
      }
    }
    
    fetchPlatformServices();
  }, []);

  useEffect(() => {
    if (!user) return;
    async function fetchInitialData() {
      const profile = await getClientProfile(user!.id); // user is checked
      setPets(profile?.pets || []);
      const contractorsList = await getAllContractors();
      setAllContractors(contractorsList.filter(c => c.application?.status === 'approved'));
      if (preselectedContractorId) setSelectedContractorId(preselectedContractorId);
    }
    fetchInitialData();
  }, [user, preselectedContractorId]);

  useEffect(() => {
    if (!selectedContractorId) {
      setContractorServices([]);
      setSelectedServices([]); // Clear selected services when contractor changes
      setContractorAvailability(null)
      setContractorBookings([])
      return;
    }
    
    async function fetchContractorServices() {
      setIsLoadingServices(true);
      setError(null);
      try {
        // Directly fetch the offerings subcollection for the selected contractor
        const offerings = await getContractorServiceOfferings(selectedContractorId);
        setContractorServices(offerings || []);
        setSelectedServices([]); // Clear selected services when contractor changes
        // Fetch contractor availability for client-side conflict validation
        const contractorProfile = await getContractorProfile(selectedContractorId)
        setContractorAvailability(contractorProfile?.availability || null)
      } catch (err) {
        console.error("Error fetching contractor services:", err);
        setError("Could not load services for this contractor.");
        setContractorServices([]);
        setContractorAvailability(null)
      } finally {
        setIsLoadingServices(false);
      }
    }
    fetchContractorServices();
  }, [selectedContractorId]);

  // Fetch contractor bookings when contractor changes
  useEffect(() => {
    let isActive = true
    const loadBookings = async () => {
      if (!selectedContractorId) return
      try {
        const gigs = await getGigsForContractor(selectedContractorId)
        // Filter to approved or completed for overlay
        const filtered = (gigs || []).filter(b => b.status === 'approved' || b.status === 'completed')
        if (isActive) setContractorBookings(filtered)
      } catch (err) {
        console.error('Error fetching contractor bookings:', err)
        if (isActive) setContractorBookings([])
      }
    }
    loadBookings()
    return () => { isActive = false }
  }, [selectedContractorId])

  // Derive unavailable dates for the calendar overlay
  const unavailableDatesForCalendar = useMemo(() => {
    if (!contractorAvailability) return [] as string[]
    const direct = contractorAvailability.unavailableDates || []
    const daily = contractorAvailability.dailyAvailability || []
    const isFullDay = (start: string, end: string) => start === '00:00' && (end === '23:59' || end === '24:00')
    const fullDayFromDaily = daily
      .filter(d => d.isFullyUnavailable || (d.unavailableSlots || []).some(s => isFullDay(s.startTime, s.endTime)))
      .map(d => d.date)
    // Deduplicate
    return Array.from(new Set([...direct, ...fullDayFromDaily]))
  }, [contractorAvailability])

  // Function to recalculate coupon when base price changes
  const recalculateCoupon = async (basePrice: number) => {
    if (appliedCoupon && selectedContractorId) {
      try {
        const response = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: appliedCoupon.code,
            contractorId: selectedContractorId,
            bookingAmount: basePrice * 100 // Convert to cents
          })
        });

        const result = await response.json();

        if (result.isValid && result.coupon) {
          // Apply coupon logic using the validation result
          if (result.coupon.type === 'fixed_price') {
            // For fixed_price coupons, result.finalPrice is the per-day price in cents
            const fixedPricePerDayInCents = result.finalPrice;
            const fixedPricePerDayInDollars = fixedPricePerDayInCents / 100;
            const totalFixedPrice = fixedPricePerDayInDollars * numberOfDays;
            setCalculatedTotalPrice(totalFixedPrice);
          } else if (result.coupon.type === 'percentage') {
            // For percentage coupons, result.finalPrice is the total discounted amount in cents
            setCalculatedTotalPrice(result.finalPrice / 100);
          }
        } else {
          // Coupon is no longer valid, remove it
          setAppliedCoupon(null);
          setCouponCode('');
          setCouponError('Coupon is no longer valid');
          setCalculatedTotalPrice(basePrice);
        }
      } catch (error) {
        console.error('Error recalculating coupon:', error);
        // If there's an error, fall back to base price
        setCalculatedTotalPrice(basePrice);
      }
    } else {
      // No coupon applied, use base price
      setCalculatedTotalPrice(basePrice);
    }
  };

  // Update useEffect to calculate hours duration and handle coupon recalculation
  useEffect(() => {
    const days = calculateDays(dateRange.startDate || '', dateRange.endDate || '');
    setNumberOfDays(days);
    setHoursPerDay(calculateHours(startTime, endTime));
    
    // Only calculate if we have days and services
    if (days > 0 && selectedServices.length > 0) {
      let total = 0;
      
      // Calculate for each service based on its payment type
      selectedServices.forEach(service => {
        if (service.paymentType === 'one_time') {
          total += service.price;
        } else { // daily
          total += service.price * days;
        }
      });
      
      // Convert cents to dollars
      const basePrice = total / 100;
      setOriginalPrice(basePrice);
      
      // Recalculate coupon if one is applied
      recalculateCoupon(basePrice);
    } else {
      setCalculatedTotalPrice(null);
      setOriginalPrice(null);
    }
  }, [dateRange.startDate, dateRange.endDate, startTime, endTime, selectedServices, appliedCoupon, selectedContractorId, numberOfDays]);

  // Calculate total service duration and auto-set end time
  useEffect(() => {
    if (selectedServices.length > 0 && platformServices.length > 0) {
      // Get the platform services for the selected services to access duration
      const selectedPlatformServices = selectedServices.map(selected => 
        platformServices.find(ps => ps.id === selected.serviceId)
      ).filter(Boolean) as PlatformService[]
      
      const totalDuration = calculateTotalDuration(selectedPlatformServices)
      setTotalServiceDuration(totalDuration)
      
      // Calculate end time based on start time and total duration (applies to all services)
      const calculatedEnd = calculateEndTime(startTime, totalDuration)
      setCalculatedEndTime(calculatedEnd)
      setEndTime(calculatedEnd)
    } else {
      setTotalServiceDuration(0)
      setCalculatedEndTime(null)
    }
  }, [selectedServices, platformServices, startTime])

  

  // Validate booking conflicts when dates/times change
  useEffect(() => {
    if (!selectedContractorId || !dateRange.startDate || !dateRange.endDate) {
      setBookingConflicts([])
      return
    }

    const validateBooking = async () => {
      setIsValidatingBooking(true)
      try {
        let conflicts: BookingConflict[] = []
        // Unified conflict validation for all services using selected time slot
        const timeSlot = { startTime, endTime }
        conflicts = await checkBookingConflicts(
          selectedContractorId,
          dateRange.startDate!,
          dateRange.endDate!,
          timeSlot
        )
        setBookingConflicts(conflicts)
      } catch (error) {
        console.error('Error validating booking:', error)
      } finally {
        setIsValidatingBooking(false)
      }
    }

    const debounceTimer = setTimeout(validateBooking, 500)
    return () => clearTimeout(debounceTimer)
  }, [selectedContractorId, dateRange.startDate, dateRange.endDate, startTime, endTime])

  const handlePetToggle = (petId: string) => {
    setSelectedPets(prev =>
      prev.includes(petId) ? prev.filter(id => id !== petId) : [...prev, petId]
    );
  };

  const handleServiceToggle = (serviceOffering: ContractorServiceOffering) => {
    const serviceName = platformServices.find(ps => ps.id === serviceOffering.serviceId)?.name || serviceOffering.serviceId;
    
    setSelectedServices(prev => {
      // Check if the service is already selected
      const isAlreadySelected = prev.some(s => s.serviceId === serviceOffering.serviceId);
      
      if (isAlreadySelected) {
        // Remove the service if already selected
        return prev.filter(s => s.serviceId !== serviceOffering.serviceId);
      } else {
        // Add the service if not already selected
        return [
          ...prev,
          {
            serviceId: serviceOffering.serviceId,
            price: serviceOffering.price,
            paymentType: serviceOffering.paymentType,
            name: serviceName
          }
        ];
      }
    });
  };

  const getServiceName = (serviceId: string) => 
    platformServices.find(ps => ps.id === serviceId)?.name || serviceId;

  const formatPrice = (price: number, paymentType: 'one_time' | 'daily') => {
    const formattedPrice = `$${(price / 100).toFixed(2)}`;
    return paymentType === 'daily' ? `${formattedPrice}/day` : formattedPrice;
  };

  // Coupon validation and application
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !selectedContractorId || !originalPrice) {
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          contractorId: selectedContractorId,
          bookingAmount: originalPrice * 100 // Convert to cents
        })
      });

      const result = await response.json();

      if (result.isValid && result.coupon) {
        setAppliedCoupon(result.coupon);
        setCouponError(null);
        
        // Apply coupon logic using the validation result
        if (result.coupon.type === 'fixed_price') {
          // For fixed_price coupons, result.finalPrice is the per-day price in cents
          const fixedPricePerDayInCents = result.finalPrice;
          const fixedPricePerDayInDollars = fixedPricePerDayInCents / 100;
          const totalFixedPrice = fixedPricePerDayInDollars * numberOfDays;
          setCalculatedTotalPrice(totalFixedPrice);
        } else if (result.coupon.type === 'percentage') {
          // For percentage coupons, result.finalPrice is the total discounted amount in cents
          setCalculatedTotalPrice(result.finalPrice / 100);
        }
      } else {
        setAppliedCoupon(null);
        setCouponError(result.error || 'Invalid coupon code');
        setCouponCode(''); // Clear invalid code
        // Reset to original price
        if (originalPrice !== null) {
          setCalculatedTotalPrice(originalPrice);
        }
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setCouponError('Failed to validate coupon. Please try again.');
      setCouponCode('');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
    // Reset to original price
    if (originalPrice !== null) {
      setCalculatedTotalPrice(originalPrice);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    if (!user) return;
    if (!selectedContractorId) return setError('Please select a contractor.');
    if (selectedServices.length === 0) return setError('Please select at least one service.');
    if (!selectedPets.length) return setError('Please select at least one pet.');
    if (!dateRange.startDate || !dateRange.endDate) return setError('Please select a start and end date.');
    
    const days = calculateDays(dateRange.startDate, dateRange.endDate);
    if (days <= 0) return setError('End date must be after start date, for at least one day.');

    // Client-side availability validation against contractor's partial/full-day blocks
    const hasConflict = (() => {
      if (!contractorAvailability || !dateRange.startDate || !dateRange.endDate) return false
      const start = new Date(dateRange.startDate)
      const end = new Date(dateRange.endDate)
      start.setUTCHours(0,0,0,0)
      end.setUTCHours(0,0,0,0)
      const unavailableDates = contractorAvailability.unavailableDates || []
      const daily = contractorAvailability.dailyAvailability || []
      const overlaps = (a: {startTime:string,endTime:string}, b: {startTime:string,endTime:string}) => a.startTime < b.endTime && a.endTime > b.startTime
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().slice(0,10)
        if (unavailableDates.includes(iso)) return true
        const day = daily.find(x => x.date === iso)
        if (day?.isFullyUnavailable) return true
        const slots = day?.unavailableSlots || []
        if (slots.some(s => overlaps({ startTime, endTime }, { startTime: s.startTime, endTime: s.endTime }))) return true
      }
      return false
    })()

    if (hasConflict) {
      setError('Selected schedule conflicts with contractor availability. Please adjust dates or times.')
      return
    }

    // Check for booking conflicts with existing bookings
    if (bookingConflicts.length > 0) {
      const conflictDates = [...new Set(bookingConflicts.map(c => c.conflictDate))].join(', ')
      setError(`Booking conflicts with existing bookings on: ${conflictDates}. Please choose different dates or times.`)
      return
    }

    // Validate coupon again at submission time
    if (appliedCoupon) {
      try {
        const response = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: appliedCoupon.code,
            contractorId: selectedContractorId,
            bookingAmount: originalPrice! * 100 // Convert to cents
          })
        });

        const result = await response.json();
        if (!result.isValid) {
          setError('Coupon is no longer valid. Please remove it and try again.');
          return;
        }
      } catch (error) {
        console.error('Error validating coupon at submission:', error);
        setError('Failed to validate coupon. Please try again.');
        return;
      }
    }

    setIsPending(true);
    try {
      const profile = await getClientProfile(user.id);
      if (!profile?.stripeCustomerId) {
        setError('Payment profile not set up. Please add a payment method in your dashboard.');
        setIsPending(false);
        return;
      }

      // Calculate total price for all services (base amount)
      let baseServiceAmount = 0;
      selectedServices.forEach(service => {
        if (service.paymentType === 'one_time') {
          baseServiceAmount += service.price;
        } else {
          baseServiceAmount += service.price * days;
        }
      });

      // Use coupon-adjusted amount if coupon is applied
      const finalBaseAmountInDollars = calculatedTotalPrice || (baseServiceAmount / 100);
      
      // Calculate total amount including platform fee and processing fee
      // Client now pays: service amount + platform fee + processing fee
      const feeBreakdown = calculateClientFeeBreakdown(finalBaseAmountInDollars);
      const totalPaymentAmount = Math.round(feeBreakdown.totalAmount * 100); // Convert back to cents

      // Get client's default payment method
      let paymentMethodId: string | undefined = undefined;
      try {
        const pmRes = await fetch('/api/stripe/list-payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: profile.stripeCustomerId }),
        });
        if (pmRes.ok) {
          const { paymentMethods } = await pmRes.json();
          const defaultCard = paymentMethods.find((pm: any) => pm.isDefault) || paymentMethods[0];
          if (defaultCard) {
            paymentMethodId = defaultCard.id;
          }
        }
      } catch (err) {
        console.warn('Could not fetch payment methods:', err);
      }

      if (!paymentMethodId) {
        setError('No payment method found. Please add a payment method in your dashboard.');
        setIsPending(false);
        return;
      }

      // Data for addBooking
      const selectedContractor = allContractors.find(c => c.id === selectedContractorId);
      const bookingPayload = {
        clientId: user.id,
        contractorId: selectedContractorId,
        contractorName: selectedContractor?.name || '',
        contractorPhone: selectedContractor?.phone || '',
        petIds: selectedPets,
        services: selectedServices,
        startDate: new Date(`${dateRange.startDate}T${startTime}:00`).toISOString(),
        endDate: new Date(`${dateRange.endDate}T${endTime}:00`).toISOString(),
        stripeCustomerId: profile.stripeCustomerId,
        totalAmount: totalPaymentAmount, // Total amount client pays (including fees)
        baseServiceAmount: Math.round(finalBaseAmountInDollars * 100), // Base service amount contractor receives (coupon-adjusted)
        paymentMethodId: paymentMethodId, // Include payment method ID
        time: {
          startTime,
          endTime
        },
        // Add coupon information
        ...(appliedCoupon && originalPrice && {
          couponCode: appliedCoupon.code,
          couponDiscount: originalPrice - calculatedTotalPrice!, // Store the actual difference (positive = discount, negative = price increase)
          originalPrice: originalPrice
        })
      };

      console.log('[booking] Creating booking with payload:', bookingPayload);
      await addBooking(bookingPayload);
      setSuccess(true);
      setSelectedContractorId(preselectedContractorId || '');
      setSelectedServices([]);
      setSelectedPets([]);
      setDateRange({ startDate: null, endDate: null });
      onSuccess();
    } catch (err) {
      console.error("Booking creation error:", err);
      setError(err instanceof Error ? err.message : 'Failed to create booking. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  // Check if a service is selected
  const isServiceSelected = (serviceId: string) => {
    return selectedServices.some(s => s.serviceId === serviceId);
  };





  return (
    <div className="max-h-full overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
      {/* Pet Selection Section */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Select Pet(s)</h3>
            <p className="text-sm text-slate-600">Choose which pets need care</p>
          </div>
        </div>
        {pets.length === 0 && (
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
            <p className="text-yellow-800 font-medium">No pets found. Add pets in your dashboard first.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pets.map((pet) => (
            <label 
              key={pet.id} 
              className={`group relative p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                selectedPets.includes(pet.id)
                  ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg transform scale-105'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedPets.includes(pet.id)}
                  onChange={() => handlePetToggle(pet.id)}
                  className="w-5 h-5 text-orange-600 bg-white border-2 border-slate-300 rounded-md focus:ring-orange-500 focus:ring-2"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 group-hover:text-orange-700 transition-colors">
                    {pet.name}
                  </h4>
                  <p className="text-sm text-slate-500">{pet.breed || 'Pet'}</p>
                </div>
              </div>
              {selectedPets.includes(pet.id) && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </label>
          ))}
        </div>
      </div>
      
      {/* Contractor Selection */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Choose Contractor</h3>
            <p className="text-sm text-slate-600">Select your preferred pet care professional</p>
          </div>
        </div>
        <select
          id="contractorSelect"
          className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-slate-400"
          value={selectedContractorId}
          onChange={e => setSelectedContractorId(e.target.value)}
          required
          disabled={!!preselectedContractorId}
        >
          <option value="" disabled>Select a contractor</option>
          {allContractors.map(c => (
            <option key={c.id} value={c.id}>{c.name || c.email}</option>
          ))}
        </select>
      </div>
      
      {/* Services Selection */}
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
        
        {isLoadingServices && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="text-slate-600 ml-3">Loading services...</p>
          </div>
        )}
        
        {!isLoadingServices && contractorServices.length === 0 && selectedContractorId && (
          <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl">
            <p className="text-slate-600 font-medium">No services available for this contractor.</p>
          </div>
        )}
        
        {/* Selected services display */}
        {selectedServices.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Selected Services:</h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedServices.map(service => (
                <div key={service.serviceId} className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl">
                  <span className="font-medium text-emerald-800">
                    {service.name} ({formatPrice(service.price, service.paymentType)})
                  </span>
                  <button 
                    type="button" 
                    onClick={() => handleServiceToggle(contractorServices.find(s => s.serviceId === service.serviceId)!)}
                    className="text-emerald-600 hover:text-emerald-800 transition-colors p-1 rounded-full hover:bg-emerald-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {totalServiceDuration > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Total service duration: <strong>{formatDuration(totalServiceDuration)}</strong>
                  {calculatedEndTime && (
                    <span className="ml-2">
                      • End time will be automatically calculated based on your start time
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Service selection grid */}
        {!isLoadingServices && contractorServices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contractorServices.map(service => {
              const serviceName = getServiceName(service.serviceId);
              const checked = isServiceSelected(service.serviceId);
              
              return (
                <div 
                  key={service.serviceId} 
                  className={`group relative p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                    checked 
                      ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-lg transform scale-105' 
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:bg-slate-50'
                  }`}
                  onClick={() => handleServiceToggle(service)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`mt-0.5 w-5 h-5 border-2 rounded-md transition-all duration-200 flex items-center justify-center ${
                      checked 
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
                        {serviceName}
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-emerald-600">
                          {formatPrice(service.price, service.paymentType)}
                        </span>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                          {service.paymentType === 'daily' ? 'Daily rate' : 'One-time fee'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {checked && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {!checked && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Date & Time Selection */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Schedule</h3>
            <p className="text-sm text-slate-600">Set your service dates and times</p>
          </div>
        </div>
        
        {/* Calendar with overlays for unavailable and booked dates */}
        <div className="mb-6">
          <DateRangePicker
            value={dateRange}
            onChange={(range) => setDateRange(range)}
            minDate={new Date().toISOString().slice(0, 10)}
            unavailableDates={unavailableDatesForCalendar}
            bookings={contractorBookings}
            className="w-full"
          />
        </div>

        <div className="space-y-2 mb-6">
          <label htmlFor="startTime" className="block text-sm font-semibold text-slate-700">
            Start Time
          </label>
          <TimePicker
            id="startTime"
            value={startTime}
            onChange={(val) => {
              setStartTime(val)
            }}
            className=""
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="endTime" className="block text-sm font-semibold text-slate-700">
            End Time {calculatedEndTime && <span className="text-xs font-normal text-slate-500">(Auto-calculated)</span>}
          </label>
          {calculatedEndTime ? (
            <div className="relative">
              <div
                id="endTime"
                className="h-10 bg-blue-50 border border-blue-300 rounded-xl pr-10 flex items-center px-3 text-sm text-slate-700"
                title="End time calculated based on selected services duration"
                aria-readonly
              >
                {formatTime12(endTime)}
              </div>
              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500" />
            </div>
          ) : (
            <TimePicker
              id="endTime"
              value={endTime}
              onChange={(val) => setEndTime(val)}
            />
          )}
          {calculatedEndTime && (
            <p className="text-xs text-blue-600">
              Based on {formatDuration(totalServiceDuration)} of selected services
            </p>
          )}
        </div>
        
        </div>

        {/* Overnight Stay Contact Message */}
        {hasOvernightStay && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold text-amber-800 mb-1">Overnight Stay Coordination</h4>
                <p className="text-sm text-amber-700">
                  Please coordinate with your contractor about specific arrival details, house rules, and any special instructions for the overnight stay. 
                  They will contact you after booking approval to discuss logistics.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Contractor Schedule Visualization */}
        {selectedContractorId && dateRange.startDate && (
          <ContractorScheduleView
            contractorId={selectedContractorId}
            selectedDate={dateRange.startDate}
            serviceDurationMinutes={totalServiceDuration}
            onTimeSlotSelect={(startTime, endTime) => {
              setStartTime(startTime)
              setEndTime(endTime)
            }}
          />
        )}



        {/* Availability hint */}
        {/* Booking Validation Status */}
        {isValidatingBooking && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Checking availability...</span>
            </div>
          </div>
        )}

        {/* Booking Conflicts */}
        {bookingConflicts.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2 text-red-800 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-semibold">Time Unavailable</span>
            </div>
            <p className="text-sm text-red-700">
              The selected time overlaps an existing booking. Please choose a different start time or date.
            </p>
          </div>
        )}



        {selectedContractorId && contractorAvailability && (
          <div className="mt-4 text-sm text-slate-600">
            <p>Contractor uses partial-day availability. If your chosen time overlaps existing blocks, you will be prompted to adjust.</p>
          </div>
        )}
      
      {/* Booking Summary */}
      {numberOfDays > 0 && selectedServices.length > 0 && calculatedTotalPrice && (
        <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-200/60 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Booking Summary</h3>
              <p className="text-sm text-slate-600">Review your booking details</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-white/80 rounded-xl border border-blue-200/40">
              <p className="text-sm font-medium text-blue-600 mb-1">Duration</p>
              <p className="text-2xl font-bold text-blue-900">{numberOfDays}</p>
              <p className="text-sm text-blue-600">day{numberOfDays !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-center p-4 bg-white/80 rounded-xl border border-blue-200/40">
              <p className="text-sm font-medium text-blue-600 mb-1">Daily Hours</p>
              <p className="text-2xl font-bold text-blue-900">{hoursPerDay}</p>
              <p className="text-sm text-blue-600">hour{hoursPerDay !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-center p-4 bg-white/80 rounded-xl border border-blue-200/40">
              <p className="text-sm font-medium text-blue-600 mb-1">Total Hours</p>
              <p className="text-2xl font-bold text-blue-900">{numberOfDays * hoursPerDay}</p>
              <p className="text-sm text-blue-600">hour{numberOfDays * hoursPerDay !== 1 ? 's' : ''}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Services Breakdown:</h4>
              <div className="space-y-2">
                {selectedServices.map(service => {
                  const servicePrice = service.paymentType === 'one_time' 
                    ? service.price 
                    : service.price * numberOfDays;
                    
                  return (
                    <div key={service.serviceId} className="flex justify-between items-center py-2 px-4 bg-white/60 rounded-lg border border-blue-200/30">
                      <div>
                        <span className="font-medium text-slate-900">{service.name}</span>
                        <span className="text-sm text-slate-600 ml-2">
                          ({service.paymentType === 'daily' ? 'Daily' : 'One-time'})
                        </span>
                      </div>
                      <span className="font-bold text-blue-900">${(servicePrice / 100).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Fee breakdown */}
            {(() => {
              const feeBreakdown = calculateClientFeeBreakdown(calculatedTotalPrice);
              return (
                <div className="p-4 bg-white/80 rounded-xl border border-blue-200/40">
                  <div className="space-y-3">
                    {appliedCoupon && originalPrice && (
                      <div className="flex justify-between text-slate-600 text-sm">
                        <span>Original Price:</span>
                        <span className="line-through">${originalPrice.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-700">
                      <span>Services Subtotal:</span>
                      <span className="font-semibold">${calculatedTotalPrice!.toFixed(2)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-green-600 text-sm">
                        <span>Coupon Applied ({appliedCoupon.name}):</span>
                        <span className={calculatedTotalPrice! > originalPrice! ? 'text-red-600' : 'text-green-600'}>
                          {calculatedTotalPrice! > originalPrice! ? '+' : '-'}${Math.abs(originalPrice! - calculatedTotalPrice!).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600 text-sm">
                      <span>Platform Fee (5%):</span>
                      <span>+${feeBreakdown.platformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 text-sm">
                      <span>Processing Fee:</span>
                      <span>+${feeBreakdown.stripeFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-blue-900 pt-3 border-t border-blue-200">
                      <span>Total Amount:</span>
                      <span>${feeBreakdown.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            <p className="text-xs text-slate-600 text-center bg-white/60 p-3 rounded-lg border border-blue-200/30">
              The contractor receives the full service amount. Platform and processing fees support our service operations.
            </p>
          </div>
        </div>
      )}

      {/* Coupon Section */}
      {numberOfDays > 0 && selectedServices.length > 0 && calculatedTotalPrice && (
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

          {!appliedCoupon ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="bg-white border-green-300 focus:border-green-500 focus:ring-green-500 rounded-xl"
                  disabled={isValidatingCoupon}
                />
              </div>
              <Button
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || isValidatingCoupon}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all duration-200"
              >
                {isValidatingCoupon ? (
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
                  <p className="font-semibold text-green-800">{appliedCoupon.name}</p>
                  <p className="text-sm text-green-600">Code: {appliedCoupon.code}</p>
                </div>
              </div>
              <Button
                onClick={handleRemoveCoupon}
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50 rounded-xl"
              >
                Remove
              </Button>
            </div>
          )}

          {couponError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p className="text-red-800 text-sm">{couponError}</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Error & Success Messages */}
      {error && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-800 font-medium">Booking created successfully!</p>
          </div>
        </div>
      )}
      
      {/* Submit Button */}
      <div className="flex justify-center">
        <Button 
          type="submit" 
          className="px-12 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                     disabled={
             isPending || 
             success || 
             selectedServices.length === 0 || 
             selectedPets.length === 0 || 
             !dateRange.startDate || 
             !dateRange.endDate
           }
        >
          {isPending ? (
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Creating Booking...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Book Now</span>
            </div>
          )}
        </Button>
      </div>
    </form>
    </div>
  )
}

// ContractorScheduleView component to show existing bookings and available slots
interface ContractorScheduleViewProps {
  contractorId: string
  selectedDate: string
  serviceDurationMinutes: number
  onTimeSlotSelect: (startTime: string, endTime: string) => void
}

function ContractorScheduleView({ contractorId, selectedDate, serviceDurationMinutes, onTimeSlotSelect }: ContractorScheduleViewProps) {
  const [daySchedule, setDaySchedule] = useState<{
    bookings: any[]
    availableSlots: any[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!contractorId || !selectedDate) return

    const loadDaySchedule = async () => {
      setIsLoading(true)
      try {
        const { getContractorSchedule } = await import('@/lib/firebase/booking-conflicts')
        const schedule = await getContractorSchedule(contractorId, selectedDate, selectedDate)
        if (schedule.length > 0) {
          setDaySchedule(schedule[0])
        } else {
          setDaySchedule({ bookings: [], availableSlots: [] })
        }
      } catch (error) {
        console.error('Error loading contractor schedule:', error)
        setDaySchedule({ bookings: [], availableSlots: [] })
      } finally {
        setIsLoading(false)
      }
    }

    loadDaySchedule()
  }, [contractorId, selectedDate])

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const hasFullDayBooking = (bookings: any[]): boolean => {
    return bookings.some(booking => !booking.time || 
      (booking.time.startTime === '00:00' && booking.time.endTime === '23:59'))
  }

  const getSmartAvailableSlots = (bookings: any[]): any[] => {
    // If there's a full day booking, no slots available
    if (hasFullDayBooking(bookings)) return []

    // If no service duration is specified, fall back to 3-hour slots
    const slotDuration = serviceDurationMinutes > 0 ? serviceDurationMinutes : 3 * 60

    // Get all booked time periods
    const bookedPeriods = bookings
      .filter(booking => booking.time)
      .map(booking => ({
        start: timeToMinutes(booking.time.startTime),
        end: timeToMinutes(booking.time.endTime)
      }))
      .sort((a, b) => a.start - b.start)

    // Generate time slots based on service duration from 6 AM to 10 PM
    const availableSlots = []
    const dayStart = 6 * 60 // 6:00 AM in minutes
    const dayEnd = 22 * 60 // 10:00 PM in minutes
    const slotInterval = 30 // Check every 30 minutes for available slots

    // Generate all possible slots that can accommodate the service duration
    for (let startMinutes = dayStart; startMinutes + slotDuration <= dayEnd; startMinutes += slotInterval) {
      const endMinutes = startMinutes + slotDuration
      
      // Check if this slot conflicts with any existing booking
      const hasConflict = bookedPeriods.some(booking => {
        // Check if the slot overlaps with the booking
        return startMinutes < booking.end && endMinutes > booking.start
      })

      // Only add the slot if there's no conflict
      if (!hasConflict) {
        availableSlots.push({
          startTime: minutesToTime(startMinutes),
          endTime: minutesToTime(endMinutes)
        })
      }
    }

    return availableSlots
  }

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-center gap-2 text-blue-700">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">Loading contractor schedule...</span>
        </div>
      </div>
    )
  }

  if (!daySchedule) return null

  const selectedDateObj = new Date(selectedDate + 'T00:00:00')
  const formattedDate = selectedDateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
      <h4 className="font-semibold text-slate-800 mb-3">
        Contractor Schedule for {formattedDate}
      </h4>
      {/* Existing bookings are intentionally hidden from clients to protect privacy */}

      {/* Available Time Slots */}
      <div>
        <h5 className="text-sm font-medium text-green-700 mb-2">
          Available Time Slots 
          {serviceDurationMinutes > 0 && (
            <span className="text-xs text-slate-600 ml-2">
              (Based on {formatDuration(serviceDurationMinutes)} service duration)
            </span>
          )}
        </h5>
        {getSmartAvailableSlots(daySchedule.bookings).length === 0 ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
            <p className="text-sm text-red-600">
              {serviceDurationMinutes > 0 
                ? `No available time slots that can accommodate ${formatDuration(serviceDurationMinutes)} service duration`
                : 'No available time slots for this date'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {/* Smart Time Slots */}
            {getSmartAvailableSlots(daySchedule.bookings).map((slot: any, index: number) => (
              <button
                key={index}
                type="button"
                onClick={() => onTimeSlotSelect(slot.startTime, slot.endTime)}
                className="p-2 text-sm bg-green-100 hover:bg-green-200 border border-green-300 rounded-lg text-green-800 transition-colors font-medium"
              >
                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
              </button>
            ))}
          </div>
        )}
      </div>

      {daySchedule.bookings.length === 0 && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">✅ No existing bookings - full day available</p>
        </div>
      )}
    </div>
  )
} 