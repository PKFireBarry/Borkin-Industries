'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [startDate, setStartDate] = useState('') // yyyy-mm-dd
  const [endDate, setEndDate] = useState('') // yyyy-mm-dd
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
    const days = calculateDays(startDate, endDate);
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
  }, [startDate, endDate, startTime, endTime, selectedServices]);

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
    if (!startDate || !endDate) return setError('Please select a start and end date.');
    
    const days = calculateDays(startDate, endDate);
    if (days <= 0) return setError('End date must be after start date, for at least one day.');

    setIsPending(true);
    try {
      const profile = await getClientProfile(user.id);
      if (!profile?.stripeCustomerId) {
        setError('Payment profile not set up. Please add a payment method in your dashboard.');
        setIsPending(false);
        return;
      }

      // Calculate total price for all services
      let totalPaymentAmount = 0;
      selectedServices.forEach(service => {
        if (service.paymentType === 'one_time') {
          totalPaymentAmount += service.price;
        } else {
          totalPaymentAmount += service.price * days;
        }
      });

      // Data for addBooking
      const selectedContractor = allContractors.find(c => c.id === selectedContractorId);
      const bookingPayload = {
        clientId: user.id,
        contractorId: selectedContractorId,
        contractorName: selectedContractor?.name || '',
        contractorPhone: selectedContractor?.phone || '',
        petIds: selectedPets,
        services: selectedServices,
        startDate: new Date(`${startDate}T${startTime}:00`).toISOString(),
        endDate: new Date(`${endDate}T${endTime}:00`).toISOString(),
        stripeCustomerId: profile.stripeCustomerId,
        totalAmount: totalPaymentAmount,
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
      setStartDate('');
      setEndDate('');
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Select Pet(s)</label>
        {pets.length === 0 && <p className="text-sm text-muted-foreground">No pets found. Add pets in your dashboard.</p>}
        <div className="flex flex-wrap gap-2">
          {pets.map((pet) => (
            <label key={pet.id} className="flex items-center gap-1 cursor-pointer p-2 border rounded-md hover:bg-accent">
              <input
                type="checkbox"
                checked={selectedPets.includes(pet.id)}
                onChange={() => handlePetToggle(pet.id)}
                className="accent-primary form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="ml-2 text-sm">{pet.name}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div>
        <label htmlFor="contractorSelect" className="block text-sm font-medium mb-1">Contractor</label>
        <select
          id="contractorSelect"
          className="w-full border rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          value={selectedContractorId}
          onChange={e => setSelectedContractorId(e.target.value)}
          required
          disabled={!!preselectedContractorId} // Disable if contractor is preselected
        >
          <option value="" disabled>Select a contractor</option>
          {allContractors.map(c => (
            <option key={c.id} value={c.id}>{c.name || c.email}</option> // Fallback to email if name is not set
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Services</label>
        {isLoadingServices && <p className="text-sm text-muted-foreground">Loading services...</p>}
        {!isLoadingServices && contractorServices.length === 0 && selectedContractorId && (
          <p className="text-sm text-muted-foreground">No services available for this contractor.</p>
        )}
        
        {/* Selected services display */}
        {selectedServices.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Selected Services:</p>
            <div className="flex flex-wrap gap-2">
              {selectedServices.map(service => (
                <Badge key={service.serviceId} variant="secondary" className="flex items-center gap-1">
                  {service.name} ({formatPrice(service.price, service.paymentType)})
                  <button 
                    type="button" 
                    onClick={() => handleServiceToggle(contractorServices.find(s => s.serviceId === service.serviceId)!)}
                    className="text-red-500 hover:text-red-700 ml-1 p-0.5"
        >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Service selection grid - using native HTML checkboxes instead of Radix */}
        {!isLoadingServices && contractorServices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {contractorServices.map(service => {
              const serviceName = getServiceName(service.serviceId);
              const checked = isServiceSelected(service.serviceId);
              
              return (
                <div 
                  key={service.serviceId} 
                  className={`cursor-pointer transition-colors border rounded-md ${checked ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}
                  onClick={() => handleServiceToggle(service)}
                >
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="accent-primary h-4 w-4 mr-2 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium">{serviceName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(service.price, service.paymentType)}
                          <span className="ml-2 text-xs">
                            ({service.paymentType === 'daily' ? 'Daily rate' : 'One-time fee'})
                          </span>
                        </p>
                      </div>
                    </div>
                    {!checked && <Plus className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="startDate" className="block text-sm font-medium mb-1">Start Date</label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]} 
            required
          />
        </div>
        <div className="flex-1">
          <label htmlFor="endDate" className="block text-sm font-medium mb-1">End Date</label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || new Date().toISOString().split('T')[0]}
            required 
          />
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <div className="flex-1">
          <label htmlFor="startTime" className="block text-sm font-medium mb-1">Start Time</label>
          <Input 
            id="startTime" 
            type="time" 
            value={startTime} 
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <label htmlFor="endTime" className="block text-sm font-medium mb-1">End Time</label>
          <Input 
            id="endTime" 
            type="time" 
            value={endTime} 
            onChange={(e) => setEndTime(e.target.value)}
            required 
          />
        </div>
      </div>
      
      {numberOfDays > 0 && selectedServices.length > 0 && (
        <div className="bg-muted p-4 rounded-md">
          <div className="flex justify-between">
            <span className="font-medium">Duration:</span>
            <span>{numberOfDays} day{numberOfDays !== 1 ? 's' : ''}</span>
          </div>
          
          <div className="flex justify-between mt-1">
            <span className="font-medium">Time:</span>
            <span>{startTime} - {endTime} ({hoursPerDay} hour{hoursPerDay !== 1 ? 's' : ''} per day)</span>
          </div>
          
          <div className="flex justify-between mt-1">
            <span className="font-medium">Total Hours:</span>
            <span>{numberOfDays * hoursPerDay} hour{numberOfDays * hoursPerDay !== 1 ? 's' : ''}</span>
          </div>
          
          {/* Service breakdown */}
          <div className="mt-2 space-y-1">
            <p className="font-medium">Services:</p>
            {selectedServices.map(service => {
              const servicePrice = service.paymentType === 'one_time' 
                ? service.price 
                : service.price * numberOfDays;
                
              return (
                <div key={service.serviceId} className="flex justify-between text-sm">
                  <span>{service.name} ({service.paymentType === 'daily' ? 'Daily' : 'One-time'})</span>
                  <span>${(servicePrice / 100).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between font-semibold text-lg mt-4 pt-2 border-t">
            <span>Total:</span>
            <span>${calculatedTotalPrice?.toFixed(2) || '--'}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            A 5% platform fee will be added at checkout.
          </p>
        </div>
      )}
      
      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700">
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-700">
          <p>Booking created successfully!</p>
        </div>
      )}
      <Button 
        type="submit" 
        className="w-full" 
        disabled={
          isPending || 
          success || 
          selectedServices.length === 0 || 
          selectedPets.length === 0 || 
          !startDate || 
          !endDate
        }
      >
        {isPending ? 'Creating Booking...' : 'Book Now'}
      </Button>
    </form>
  );
} 