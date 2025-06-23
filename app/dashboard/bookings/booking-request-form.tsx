'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateRangePicker } from '@/components/ui/date-range-picker'
// import { DatePicker, DateRangePicker } from '@/components/ui/date-picker'; // Future: Consider Shadcn date picker
import { useUser } from '@clerk/nextjs'
import { getClientProfile } from '@/lib/firebase/client'
import { addBooking } from '@/lib/firebase/bookings' // This now expects startDate, endDate, serviceId
import { getAllContractors, getContractorServiceOfferings } from '@/lib/firebase/contractors'
import { getAllPlatformServices } from '@/lib/firebase/services'
import type { Contractor } from '@/types/contractor'
import type { ContractorServiceOffering, PlatformService } from '@/types/service'
import type { Pet } from '@/types/client'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, X } from 'lucide-react'
import { calculateClientFeeBreakdown } from '@/lib/utils'

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
  
  // Updated to support multiple services
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
  
  const [selectedPets, setSelectedPets] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({
    startDate: null,
    endDate: null
  })
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')

  const [numberOfDays, setNumberOfDays] = useState<number>(0);
  const [hoursPerDay, setHoursPerDay] = useState<number>(0);
  const [calculatedTotalPrice, setCalculatedTotalPrice] = useState<number | null>(null);

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
      } catch (err) {
        console.error("Error fetching contractor services:", err);
        setError("Could not load services for this contractor.");
        setContractorServices([]);
      } finally {
        setIsLoadingServices(false);
      }
    }
    fetchContractorServices();
  }, [selectedContractorId]);

  // Update useEffect to calculate hours duration
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
      setCalculatedTotalPrice(total / 100);
    } else {
      setCalculatedTotalPrice(null);
    }
  }, [dateRange.startDate, dateRange.endDate, startTime, endTime, selectedServices]);

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

      // Calculate total amount including platform fee and processing fee
      // Client now pays: service amount + platform fee + processing fee
      const baseAmountInDollars = baseServiceAmount / 100;
      const feeBreakdown = calculateClientFeeBreakdown(baseAmountInDollars);
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
        baseServiceAmount: baseServiceAmount, // Base service amount contractor receives
        paymentMethodId: paymentMethodId, // Include payment method ID
        time: {
          startTime,
          endTime
        }
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
            <div className="flex flex-wrap gap-2">
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
        
        <div className="space-y-2 mb-6">
          <label className="block text-sm font-semibold text-slate-700">Select Date Range</label>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            minDate={new Date().toISOString().split('T')[0]}
            className="w-full"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="startTime" className="block text-sm font-semibold text-slate-700">Start Time</label>
            <Input 
              id="startTime" 
              type="time" 
              value={startTime} 
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="bg-white border-slate-300 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="endTime" className="block text-sm font-semibold text-slate-700">End Time</label>
            <Input 
              id="endTime" 
              type="time" 
              value={endTime} 
              onChange={(e) => setEndTime(e.target.value)}
              required 
              className="bg-white border-slate-300 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
            />
          </div>
        </div>
      </div>
      
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
                    <div className="flex justify-between text-slate-700">
                      <span>Services Subtotal:</span>
                      <span className="font-semibold">${feeBreakdown.baseAmount.toFixed(2)}</span>
                    </div>
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
  )
} 