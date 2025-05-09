'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// import { DatePicker, DateRangePicker } from '@/components/ui/date-picker'; // Future: Consider Shadcn date picker
import { useUser } from '@clerk/nextjs'
import { getClientProfile } from '@/lib/firebase/client'
import { addBooking } from '@/lib/firebase/bookings' // This now expects startDate, endDate, serviceId
import { getAllContractors, getContractorServiceOfferings } from '@/lib/firebase/contractors'
import type { Contractor } from '@/types/contractor'
import type { ContractorServiceOffering, PlatformService } from '@/types/service'
import type { Pet } from '@/types/client'

// REMOVED Unused constant
// const SERVICE_TYPES = [
//   'Dog Walking',
//   'Cat Sitting',
//   'Medication Administration',
//   'Overnight Stay',
// ]

// TODO: Fetch platform services from Firestore or a shared constant
const MOCK_PLATFORM_SERVICES: PlatformService[] = [
  { id: "ps_1", name: "Dog Walking (30 mins)", description: "A 30-minute walk for your dog." },
  { id: "ps_2", name: "Pet Sitting (per hour)", description: "In-home pet sitting, billed hourly." },
  { id: "ps_3", name: "Medication Administration", description: "Administering prescribed medication." },
  { id: "ps_4", name: "Nail Trim", description: "Professional nail trimming service." },
  { id: "dog_walking_30_mins", name: "Dog Walking (30 mins)", description: "A 30-minute walk for your dog." },
  { id: "pet_sitting_hourly", name: "Pet Sitting (per hour)", description: "In-home pet sitting, billed hourly." },
  { id: "medication_administration", name: "Medication Administration", description: "Administering prescribed medication." },
  { id: "nail_trim", name: "Nail Trim", description: "Professional nail trimming service." },
];

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

export function BookingRequestForm({ onSuccess, preselectedContractorId }: { onSuccess: () => void; preselectedContractorId?: string | null }) {
  const { user } = useUser()
  const [pets, setPets] = useState<Pet[]>([])
  const [allContractors, setAllContractors] = useState<Contractor[]>([])
  const [selectedContractorId, setSelectedContractorId] = useState(preselectedContractorId || '')
  const [contractorServices, setContractorServices] = useState<ContractorServiceOffering[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [selectedServiceDailyRate, setSelectedServiceDailyRate] = useState<number | null>(null) // Renamed for clarity
  const [selectedPets, setSelectedPets] = useState<string[]>([])
  const [startDate, setStartDate] = useState('') // yyyy-mm-dd
  // const [startTime, setStartTime] = useState('') // REMOVED
  const [endDate, setEndDate] = useState('') // yyyy-mm-dd
  // const [endTime, setEndTime] = useState('') // REMOVED

  const [numberOfDays, setNumberOfDays] = useState<number>(0);
  const [calculatedTotalPrice, setCalculatedTotalPrice] = useState<number | null>(null);

  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
      setSelectedServiceId('');
      setSelectedServiceDailyRate(null);
      return;
    }
    async function fetchContractorServices() {
      setIsLoadingServices(true);
      setError(null);
      try {
        // Directly fetch the offerings subcollection for the selected contractor
        const offerings = await getContractorServiceOfferings(selectedContractorId);
        setContractorServices(offerings || []);
        setSelectedServiceId(''); 
        setSelectedServiceDailyRate(null);
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

  useEffect(() => {
    if (!selectedServiceId) {
      setSelectedServiceDailyRate(null);
      return;
    }
    const selectedOffering = contractorServices.find(s => s.serviceId === selectedServiceId);
    setSelectedServiceDailyRate(selectedOffering?.price || null); // price is now daily rate in cents
  }, [selectedServiceId, contractorServices]);

  useEffect(() => {
    const days = calculateDays(startDate, endDate);
    setNumberOfDays(days);
    if (days > 0 && selectedServiceDailyRate !== null) {
      setCalculatedTotalPrice((selectedServiceDailyRate / 100) * days); // daily rate is in cents
    } else {
      setCalculatedTotalPrice(null);
    }
  }, [startDate, endDate, selectedServiceDailyRate]);

  const handlePetToggle = (petId: string) => {
    setSelectedPets((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId]
    );
  };

  const getServiceName = (serviceId: string) => MOCK_PLATFORM_SERVICES.find(ps => ps.id === serviceId)?.name || serviceId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!user) return;

    if (!selectedContractorId) return setError('Please select a contractor.');
    if (!selectedServiceId || selectedServiceDailyRate === null) return setError('Please select a service.');
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

      // Data for addBooking (aligns with AddBookingDataInput in lib/firebase/bookings.ts)
      const bookingPayload = {
        clientId: user.id,
        contractorId: selectedContractorId,
        petIds: selectedPets,
        serviceId: selectedServiceId, // This is used by addBooking to find the service and its daily rate
        startDate: new Date(startDate).toISOString(), // Ensure ISO string for full date
        endDate: new Date(endDate).toISOString(),   // Ensure ISO string for full date
        stripeCustomerId: profile.stripeCustomerId,
        // paymentMethodId can be added here if you implement a selector for it
      };

      console.log('[booking] Creating booking with payload:', bookingPayload);
      await addBooking(bookingPayload);
      setSuccess(true);
      setSelectedContractorId(preselectedContractorId || '');
      setSelectedServiceId('');
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
        <label htmlFor="serviceSelect" className="block text-sm font-medium mb-1">Service</label>
        <select
          id="serviceSelect"
          className="w-full border rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          value={selectedServiceId}
          onChange={(e) => setSelectedServiceId(e.target.value)}
          disabled={!selectedContractorId || isLoadingServices || contractorServices.length === 0}
          required
        >
          <option value="" disabled>
            { !selectedContractorId ? "Select contractor first" : 
              isLoadingServices ? "Loading services..." : 
              contractorServices.length === 0 ? "Contractor offers no services" : 
              "Select a service" }
          </option>
          {contractorServices.map((serviceOffering) => (
            <option key={serviceOffering.serviceId} value={serviceOffering.serviceId}>
              {getServiceName(serviceOffering.serviceId)} - ${(serviceOffering.price / 100).toFixed(2)} / day
            </option>
          ))}
        </select>
        {selectedServiceDailyRate !== null && (
          <p className="text-sm text-muted-foreground mt-1">Daily Rate: ${(selectedServiceDailyRate / 100).toFixed(2)} / day</p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="startDate" className="block text-sm font-medium mb-1">Start Date</label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
            className="bg-white"
            min={new Date().toISOString().split('T')[0]} // Prevent past dates
          />
        </div>
        <div className="flex-1">
          <label htmlFor="endDate" className="block text-sm font-medium mb-1">End Date</label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            required
            className="bg-white"
            min={startDate || new Date().toISOString().split('T')[0]} // End date cannot be before start date
          />
        </div>
      </div>
      {(numberOfDays > 0 && calculatedTotalPrice !== null) && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
          <p><span className="font-semibold">Number of days:</span> {numberOfDays}</p>
          <p><span className="font-semibold">Estimated Total:</span> ${calculatedTotalPrice.toFixed(2)}</p>
        </div>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-500 text-sm">Booking request sent successfully!</p>}
      <Button type="submit" disabled={isPending || !selectedServiceId || numberOfDays <= 0} className="w-full">
        {isPending ? 'Submitting Request...' : 'Request Booking'}
      </Button>
    </form>
  );
} 