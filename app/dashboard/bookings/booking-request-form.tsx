'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
import { Plus, X, AlertTriangle, Calendar, CheckCircle2, Clock, FileText, Heart, Ticket, User } from 'lucide-react'
import { calculateClientFeeBreakdown } from '@/lib/utils'
import { validateCoupon } from '@/lib/firebase/coupons'
import { Coupon } from '@/types/coupon'
import { checkBookingConflicts } from '@/lib/firebase/booking-conflicts'
import type { BookingConflict } from '@/lib/firebase/booking-conflicts'
import { calculateTotalDuration, calculateEndTime, formatDuration } from '@/lib/utils/booking-duration'
import { cn } from '@/lib/utils'
import { useSwipeSteps } from '@/hooks/use-swipe-steps'
import { MobileStepFooter } from '../components/mobile-step-footer'
import { SectionHeader } from '../components/section-header'


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
  value: string // HH:mm (24-hour) internal value, or empty string for blank
  onChange: (newValue: string) => void // HH:mm (24-hour)
  className?: string
  disabled?: boolean
  forcedAmPm?: AmPm // Pre-set the AM/PM selector (for overnight stays)
}

function TimePicker({ id, value, onChange, className, disabled, forcedAmPm }: TimePickerProps) {
  // Handle empty/blank value case
  const isBlank = !value || value === ''
  const parts = isBlank
    ? { hour12: '', minute: '', ampm: forcedAmPm || 'AM' as AmPm }
    : to12HourParts(value)

  const handleChange = (next: Partial<{ hour12: string; minute: string; ampm: AmPm }>) => {
    const merged = {
      hour12: parts.hour12 || '12', // Default to 12 if blank on first selection
      minute: parts.minute || '00', // Default to 00 if blank
      ampm: forcedAmPm || parts.ampm, // Use forced AM/PM if provided
      ...next,
    }
    // Only emit a value when hour is selected
    if (merged.hour12) {
      onChange(to24HourString(merged.hour12, merged.minute, forcedAmPm || merged.ampm))
    }
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

        <Select
          value={forcedAmPm || parts.ampm}
          onValueChange={(v: AmPm) => handleChange({ ampm: v })}
          disabled={disabled || !!forcedAmPm}
        >
          <SelectTrigger
            className={`bg-white border-slate-300 focus:border-purple-500 focus:ring-purple-500 rounded-xl ${forcedAmPm ? 'bg-slate-100' : ''}`}
            aria-label="AM/PM"
          >
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

export function BookingRequestForm({ onSuccess, onClose, preselectedContractorId }: { onSuccess: () => void; onClose?: () => void; preselectedContractorId?: string | null }) {
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
  const [mobileStep, setMobileStep] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

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

  // Auto-adjust times for overnight stays (PM to AM)
  // When overnight service is selected, clear times to show blank pickers with PM/AM preset
  useEffect(() => {
    if (hasOvernightStay) {
      // Clear times to show blank hour/minute with forced PM/AM
      // The forcedAmPm prop on TimePicker will show PM for start, AM for end
      setStartTime('')
      setEndTime('')
    } else {
      // Reset to day time defaults if overnight services are removed
      // Only reset if times are currently blank (were in overnight mode)
      if (startTime === '' || endTime === '') {
        setStartTime('09:00') // 9 AM
        setEndTime('17:00')   // 5 PM
      }
    }
  }, [hasOvernightStay]) // Only depend on hasOvernightStay, not the times

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
      start.setUTCHours(0, 0, 0, 0)
      end.setUTCHours(0, 0, 0, 0)
      const unavailableDates = contractorAvailability.unavailableDates || []
      const daily = contractorAvailability.dailyAvailability || []
      const overlaps = (a: { startTime: string, endTime: string }, b: { startTime: string, endTime: string }) => a.startTime < b.endTime && a.endTime > b.startTime
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().slice(0, 10)
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

  const hasSummaryReady = numberOfDays > 0 && selectedServices.length > 0 && calculatedTotalPrice

  const mobileSteps = [
    {
      key: 'pets',
      label: 'Pets',
      title: 'Select pet(s)',
      description: 'Choose which pets need care for this booking.',
    },
    {
      key: 'contractor',
      label: 'Contractor',
      title: 'Choose contractor',
      description: 'Pick the pet care professional you want to work with.',
    },
    {
      key: 'services',
      label: 'Services',
      title: 'Choose services',
      description: 'Select the care tasks and visit types you need.',
    },
    {
      key: 'schedule',
      label: 'Schedule',
      title: 'Set the schedule',
      description: 'Choose your dates and times, then review availability.',
    },
    {
      key: 'review',
      label: 'Review',
      title: 'Review pricing',
      description: 'Apply any coupon and check the booking total before continuing.',
    },
    {
      key: 'confirm',
      label: 'Confirm',
      title: 'Confirm booking',
      description: 'One final check before you submit your booking request.',
    },
  ] as const

  const currentMobileStep = mobileSteps[mobileStep]

  const goToPreviousStep = () => {
    setMobileStep((prev) => Math.max(prev - 1, 0))
  }

  const goToNextStep = () => {
    setMobileStep((prev) => Math.min(prev + 1, mobileSteps.length - 1))
  }

  useEffect(() => {
    const modalScrollContainer = containerRef.current?.querySelector('.booking-request-scroll')
    if (modalScrollContainer instanceof HTMLElement) {
      modalScrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [mobileStep])

  useEffect(() => {
    if (!success) return
    const successTimer = window.setTimeout(() => {
      onSuccess()
    }, 1400)

    return () => window.clearTimeout(successTimer)
  }, [success, onSuccess])

  const mobileStepComplete = {
    pets: selectedPets.length > 0,
    contractor: !!selectedContractorId,
    services: selectedServices.length > 0,
    schedule: !!dateRange.startDate && !!dateRange.endDate,
    review: hasSummaryReady,
    confirm: hasSummaryReady,
  }

  const canAdvanceFromCurrentStep = (() => {
    switch (currentMobileStep.key) {
      case 'pets':
        return mobileStepComplete.pets
      case 'contractor':
        return mobileStepComplete.contractor
      case 'services':
        return mobileStepComplete.services
      case 'schedule':
        return mobileStepComplete.schedule
      case 'review':
        return mobileStepComplete.review
      case 'confirm':
        return true
      default:
        return false
    }
  })()

  const submitDisabled =
    isPending ||
    success ||
    selectedServices.length === 0 ||
    selectedPets.length === 0 ||
    !dateRange.startDate ||
    !dateRange.endDate

  const { onTouchStart: handleMobileTouchStart, onTouchMove: handleMobileTouchMove, onTouchEnd: handleMobileTouchEnd } = useSwipeSteps({
    step: mobileStep,
    maxStep: mobileSteps.length - 1,
    threshold: 50,
    maxVerticalDelta: 40,
    canGoNext: Boolean(canAdvanceFromCurrentStep),
    onNext: goToNextStep,
    onPrevious: goToPreviousStep,
  })

  const sectionCardClassName = 'rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6'





  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-col overflow-hidden">
      <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="booking-request-scroll flex-1 space-y-5 overflow-y-auto p-4 pb-6 sm:space-y-8 sm:p-6 sm:pb-6">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white via-blue-50/70 to-indigo-50/70 p-3.5 shadow-sm sm:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">New booking</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{currentMobileStep.title}</h2>
              <p className="mt-1 text-xs text-slate-600">{currentMobileStep.description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
              aria-label="Close booking request"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="hidden items-start justify-between gap-4 rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white via-blue-50/70 to-indigo-50/70 p-6 shadow-sm sm:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">New booking</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Create your booking request</h2>
            <p className="mt-2 text-sm text-slate-600">Choose pets, contractor, services, schedule, and final pricing before you submit.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close booking request"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Pet Selection Section */}
        <div
          className={cn(sectionCardClassName, mobileStep !== 0 && 'hidden sm:block')}
          onTouchStart={handleMobileTouchStart}
          onTouchMove={handleMobileTouchMove}
          onTouchEnd={handleMobileTouchEnd}
        >
          <SectionHeader
            icon={<Heart className="h-4 w-4" />}
            title="Select Pet(s)"
            description="Choose which pets need care"
            iconWrapClassName="bg-orange-100 text-orange-600"
            className="mb-5"
          />
          {pets.length === 0 && (
            <div className="rounded-xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 p-3.5">
              <p className="text-sm font-medium text-yellow-800">No pets found. Add pets in your dashboard first.</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pets.map((pet) => (
              <label
                key={pet.id}
                className={`group relative p-3.5 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${selectedPets.includes(pet.id)
                  ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg transform scale-105'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedPets.includes(pet.id)}
                    onChange={() => handlePetToggle(pet.id)}
                    className="h-4.5 w-4.5 rounded-md border-2 border-slate-300 bg-white text-orange-600 focus:ring-2 focus:ring-orange-500"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-orange-700">
                      {pet.name}
                    </h4>
                    <p className="text-xs text-slate-500 sm:text-sm">{pet.breed || 'Pet'}</p>
                  </div>
                </div>
                {selectedPets.includes(pet.id) && (
                  <div className="absolute -right-2 -top-2 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-orange-500 shadow-lg">
                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Contractor Selection */}
        <div
          className={cn(sectionCardClassName, mobileStep !== 1 && 'hidden sm:block')}
          onTouchStart={handleMobileTouchStart}
          onTouchMove={handleMobileTouchMove}
          onTouchEnd={handleMobileTouchEnd}
        >
          <SectionHeader
            icon={<User className="h-4 w-4" />}
            title="Choose Contractor"
            description="Select your preferred pet care professional"
            iconWrapClassName="bg-blue-100 text-blue-600"
            className="mb-5"
          />
          <Select value={selectedContractorId} onValueChange={setSelectedContractorId} disabled={!!preselectedContractorId}>
            <SelectTrigger id="contractorSelect" className="h-12 rounded-2xl border-slate-200 bg-white text-sm shadow-sm">
              <SelectValue placeholder="Select a contractor" />
            </SelectTrigger>
            <SelectContent>
              {allContractors.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name || c.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Services Selection */}
        <div
          className={cn(sectionCardClassName, mobileStep !== 2 && 'hidden sm:block')}
          onTouchStart={handleMobileTouchStart}
          onTouchMove={handleMobileTouchMove}
          onTouchEnd={handleMobileTouchEnd}
        >
          <SectionHeader
            icon={<FileText className="h-4 w-4" />}
            title="Services"
            description="Choose the services you need"
            iconWrapClassName="bg-emerald-100 text-emerald-600"
            className="mb-5"
          />

          {isLoadingServices && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              <p className="text-slate-600 ml-3">Loading services...</p>
            </div>
          )}

          {!isLoadingServices && contractorServices.length === 0 && selectedContractorId && (
            <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-3.5">
              <p className="text-sm font-medium text-slate-600">No services available for this contractor.</p>
            </div>
          )}

          {/* Selected services display */}
          {selectedServices.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">Selected Services</h4>
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedServices.map(service => (
                  <div key={service.serviceId} className="flex items-center gap-2 rounded-full border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 px-3 py-1.5">
                    <span className="text-xs font-medium text-emerald-800 sm:text-sm">
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
                <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-blue-800 sm:text-sm">
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
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
              {contractorServices.map(service => {
                const serviceName = getServiceName(service.serviceId);
                const checked = isServiceSelected(service.serviceId);

                return (
                  <div
                    key={service.serviceId}
                    className={`group relative cursor-pointer rounded-[1.25rem] border p-3 transition-all duration-200 ${checked
                      ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    onClick={() => handleServiceToggle(service)}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-md border-2 transition-all duration-200 ${checked
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
                        <h4 className="mb-1 text-sm font-semibold text-slate-900 transition-colors group-hover:text-emerald-700 sm:text-[15px]">
                          {serviceName}
                        </h4>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-bold text-emerald-600 sm:text-base">
                            {formatPrice(service.price, service.paymentType)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500 sm:text-xs">
                            {service.paymentType === 'daily' ? 'Daily rate' : 'One-time fee'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {checked && (
                      <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 shadow-md">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {!checked && (
                      <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <Plus className="h-4 w-4 text-slate-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Date & Time Selection */}
        <div
          className={cn(sectionCardClassName, mobileStep !== 3 && 'hidden sm:block')}
          onTouchStart={handleMobileTouchStart}
          onTouchMove={handleMobileTouchMove}
          onTouchEnd={handleMobileTouchEnd}
        >
          <SectionHeader
            icon={<Calendar className="h-4 w-4" />}
            title="Schedule"
            description="Set your service dates and times"
            iconWrapClassName="bg-purple-100 text-purple-600"
            className="mb-5"
          />

          {/* Calendar with overlays for unavailable and booked dates */}
          <div className="mb-6">
            <DateRangePicker
              value={dateRange}
              onChange={(range) => setDateRange(range)}
              minDate={new Date().toISOString().slice(0, 10)}
              unavailableDates={unavailableDatesForCalendar}
              bookings={contractorBookings}
              className="w-full"
              compact
            />
          </div>

          <div className="space-y-2 mb-6">
            <label htmlFor="startTime" className="block text-sm font-semibold text-slate-700">
              Start Time {hasOvernightStay && <span className="text-xs font-normal text-amber-600">(Evening)</span>}
            </label>
            <TimePicker
              id="startTime"
              value={startTime}
              onChange={(val) => {
                setStartTime(val)
              }}
              forcedAmPm={hasOvernightStay ? 'PM' : undefined}
              className=""
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="endTime" className="block text-sm font-semibold text-slate-700">
              End Time {hasOvernightStay
                ? <span className="text-xs font-normal text-amber-600">(Morning)</span>
                : calculatedEndTime && <span className="text-xs font-normal text-slate-500">(Auto-calculated)</span>
              }
            </label>
            {calculatedEndTime && !hasOvernightStay ? (
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
                forcedAmPm={hasOvernightStay ? 'AM' : undefined}
              />
            )}
            {calculatedEndTime && !hasOvernightStay && (
              <p className="text-xs text-blue-600">
                Based on {formatDuration(totalServiceDuration)} of selected services
              </p>
            )}
          </div>

        </div>

        {/* Overnight Stay Contact Message */}
        {hasOvernightStay && (
          <div className={cn('mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4', mobileStep !== 3 && 'hidden sm:block')}>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold text-amber-800 mb-1">Overnight Stay (Evening to Morning)</h4>
                <p className="text-sm text-amber-700">
                  Overnight stays run from evening to morning the next day. The time period has been automatically adjusted to reflect typical overnight hours (PM to AM).
                  Please coordinate with your contractor about arrival details, house rules, and any special instructions after booking approval.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Contractor Schedule Visualization */}
        {selectedContractorId && dateRange.startDate && (
          <div className={cn(mobileStep !== 3 && 'hidden sm:block')}>
            <ContractorScheduleView
              contractorId={selectedContractorId}
              selectedDate={dateRange.startDate}
              serviceDurationMinutes={totalServiceDuration}
              onTimeSlotSelect={(startTime, endTime) => {
                setStartTime(startTime)
                setEndTime(endTime)
              }}
            />
          </div>
        )}



        {/* Availability hint */}
        {/* Booking Validation Status */}
        {isValidatingBooking && (
          <div className={cn('mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3', mobileStep !== 3 && 'hidden sm:block')}>
            <div className="flex items-center gap-2 text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Checking availability...</span>
            </div>
          </div>
        )}

        {/* Booking Conflicts */}
        {bookingConflicts.length > 0 && (
          <div className={cn('mt-4 rounded-xl border border-red-200 bg-red-50 p-4', mobileStep !== 3 && 'hidden sm:block')}>
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
          <div className={cn('mt-4 text-sm text-slate-600', mobileStep !== 3 && 'hidden sm:block')}>
            <p>Contractor uses partial-day availability. If your chosen time overlaps existing blocks, you will be prompted to adjust.</p>
          </div>
        )}

        {/* Booking Summary */}
        {numberOfDays > 0 && selectedServices.length > 0 && calculatedTotalPrice && (
          <div
            className={cn('rounded-[1.75rem] border border-blue-200/60 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-5 shadow-sm sm:p-6', mobileStep !== 4 && 'hidden sm:block')}
            onTouchStart={handleMobileTouchStart}
            onTouchMove={handleMobileTouchMove}
            onTouchEnd={handleMobileTouchEnd}
          >
            <SectionHeader
              icon={<CheckCircle2 className="h-4 w-4" />}
              title="Booking Summary"
              description="Review your booking details"
              iconWrapClassName="bg-blue-100 text-blue-600"
              className="mb-5"
            />

            <div className="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:gap-4">
              <div className="rounded-xl border border-blue-200/40 bg-white/80 p-2.5 text-center sm:p-3">
                <p className="mb-1 text-[11px] font-medium text-blue-600 sm:text-sm">Duration</p>
                <p className="text-base font-bold text-blue-900 sm:text-2xl">{numberOfDays}</p>
                <p className="text-[11px] text-blue-600 sm:text-sm">day{numberOfDays !== 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-xl border border-blue-200/40 bg-white/80 p-2.5 text-center sm:p-3">
                <p className="mb-1 text-[11px] font-medium text-blue-600 sm:text-sm">Daily Hours</p>
                <p className="text-base font-bold text-blue-900 sm:text-2xl">{hoursPerDay}</p>
                <p className="text-[11px] text-blue-600 sm:text-sm">hour{hoursPerDay !== 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-xl border border-blue-200/40 bg-white/80 p-2.5 text-center sm:p-3">
                <p className="mb-1 text-[11px] font-medium text-blue-600 sm:text-sm">Total Hours</p>
                <p className="text-base font-bold text-blue-900 sm:text-2xl">{numberOfDays * hoursPerDay}</p>
                <p className="text-[11px] text-blue-600 sm:text-sm">hour{numberOfDays * hoursPerDay !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-900 sm:mb-3">Services Breakdown:</h4>
                <div className="space-y-1.5 sm:space-y-2">
                  {selectedServices.map(service => {
                    const servicePrice = service.paymentType === 'one_time'
                      ? service.price
                      : service.price * numberOfDays;

                    return (
                      <div key={service.serviceId} className="flex items-center justify-between rounded-lg border border-blue-200/30 bg-white/60 px-3 py-2">
                        <div className="min-w-0 pr-3">
                          <span className="text-sm font-medium text-slate-900">{service.name}</span>
                          <span className="ml-2 text-xs text-slate-600 sm:text-sm">
                            ({service.paymentType === 'daily' ? 'Daily' : 'One-time'})
                          </span>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-blue-900 sm:text-base">${(servicePrice / 100).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fee breakdown */}
              {(() => {
                const feeBreakdown = calculateClientFeeBreakdown(calculatedTotalPrice);
                return (
                  <div className="rounded-xl border border-blue-200/40 bg-white/80 p-3 sm:p-4">
                    <div className="space-y-2.5 sm:space-y-3">
                      {appliedCoupon && originalPrice && (
                        <div className="flex justify-between text-xs text-slate-600 sm:text-sm">
                          <span>Original Price:</span>
                          <span className="line-through">${originalPrice.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-slate-700 sm:text-base">
                        <span>Services Subtotal:</span>
                        <span className="font-semibold">${calculatedTotalPrice!.toFixed(2)}</span>
                      </div>
                      {appliedCoupon && (
                        <div className="flex justify-between text-xs text-green-600 sm:text-sm">
                          <span>Coupon Applied ({appliedCoupon.name}):</span>
                          <span className={calculatedTotalPrice! > originalPrice! ? 'text-red-600' : 'text-green-600'}>
                            {calculatedTotalPrice! > originalPrice! ? '+' : '-'}${Math.abs(originalPrice! - calculatedTotalPrice!).toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-slate-600 sm:text-sm">
                        <span>Platform Fee (5%):</span>
                        <span>+${feeBreakdown.platformFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-600 sm:text-sm">
                        <span>Processing Fee:</span>
                        <span>+${feeBreakdown.stripeFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-200 pt-2.5 text-lg font-bold text-blue-900 sm:pt-3 sm:text-xl">
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
          <div
            className={cn('rounded-[1.75rem] border border-green-200/60 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 shadow-sm sm:p-6', mobileStep !== 4 && 'hidden sm:block')}
            onTouchStart={handleMobileTouchStart}
            onTouchMove={handleMobileTouchMove}
            onTouchEnd={handleMobileTouchEnd}
          >
            <SectionHeader
              icon={<Ticket className="h-4 w-4" />}
              title="Have a Coupon?"
              description="Enter your coupon code to get a discount"
              iconWrapClassName="bg-green-100 text-green-600"
              className="mb-4 sm:mb-6"
            />

            {!appliedCoupon ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="rounded-xl border-green-300 bg-white text-sm focus:border-green-500 focus:ring-green-500"
                    disabled={isValidatingCoupon}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || isValidatingCoupon}
                  className="h-10 rounded-xl bg-green-600 px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-700 sm:h-11 sm:px-6"
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
              <div className="flex items-center justify-between rounded-xl border border-green-200/40 bg-white/80 p-3">
                <div className="flex items-center space-x-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 sm:h-8 sm:w-8">
                    <svg className="h-3.5 w-3.5 text-green-600 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">{appliedCoupon.name}</p>
                    <p className="text-xs text-green-600 sm:text-sm">Code: {appliedCoupon.code}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleRemoveCoupon}
                  variant="outline"
                  className="h-9 rounded-xl border-red-300 px-3 text-xs text-red-600 hover:bg-red-50 sm:text-sm"
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
          <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-red-100 p-4">
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
          <div className="rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-green-100 p-4">
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

        <div
          className={cn('rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:hidden', mobileStep !== 5 && 'hidden')}
          onTouchStart={handleMobileTouchStart}
          onTouchMove={handleMobileTouchMove}
          onTouchEnd={handleMobileTouchEnd}
        >
          <div className="space-y-4 text-center">
            {success ? (
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
                <h3 className="mt-4 text-base font-semibold text-slate-900 sm:text-lg">Booking created</h3>
                <p className="mt-2 text-xs text-slate-600 sm:text-sm">Your request was submitted and will move to pending while the contractor reviews it.</p>
              </div>
            ) : (
              <>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Ready to submit?</h3>
                  <p className="mt-2 text-xs text-slate-600 sm:text-sm">
                    Tap Book Now to send this request. Once submitted, it will appear as pending until the contractor responds.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="petCta"
                  size="pill"
                  disabled={submitDisabled}
                  className="w-full"
                  onClick={() => formRef.current?.requestSubmit()}
                >
                  {isPending ? 'Booking...' : 'Book Now'}
                </Button>
              </>
            )}
          </div>
        </div>

        </div>

        <MobileStepFooter
          step={mobileStep}
          maxStep={mobileSteps.length - 1}
          onBack={goToPreviousStep}
          onNext={goToNextStep}
          onClose={onClose}
          canGoNext={Boolean(canAdvanceFromCurrentStep)}
          backDisabled={isPending}
          nextDisabled={isPending}
          hideNextOnFinal
          className="z-20 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]"
          backButtonClassName="min-w-[7.5rem] flex-none"
          nextButtonClassName="min-w-[8.5rem] flex-none"
        />

        {/* Submit Button */}
        <div className="hidden justify-center pb-6 sm:flex sm:pb-8">
          <Button
            type="submit"
            variant="petCta"
            size="pill"
            className="px-10 py-3.5 text-base sm:px-12 sm:py-4 sm:text-lg"
            disabled={
              submitDisabled
            }
          >
            {isPending ? (
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
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
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:mt-4 sm:p-4">
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {/* Smart Time Slots */}
            {getSmartAvailableSlots(daySchedule.bookings).map((slot: any, index: number) => (
              <button
                key={index}
                type="button"
                onClick={() => onTimeSlotSelect(slot.startTime, slot.endTime)}
                className="rounded-lg border border-green-300 bg-green-100 px-2 py-2 text-[11px] font-medium text-green-800 transition-colors hover:bg-green-200 sm:text-sm"
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
