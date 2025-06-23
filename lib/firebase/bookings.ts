import { db } from '../../firebase'
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import type { Booking } from '@/types/booking'
import type { ContractorServiceOffering } from '@/types/service'
import { getAllPlatformServices } from './services'
import { addGigDatesToContractorCalendar, removeGigDatesFromContractorCalendar } from './contractors'
import { calculatePlatformFee, calculateStripeFee } from '@/lib/utils'

// Helper function to calculate the number of days
function calculateNumberOfDays(startDateISO: string, endDateISO: string): number {
  const start = new Date(startDateISO)
  const end = new Date(endDateISO)

  // Reset time to midnight to count full days
  start.setUTCHours(0, 0, 0, 0)
  end.setUTCHours(0, 0, 0, 0)

  if (end < start) {
    throw new Error("End date cannot be before start date.")
  }

  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 for inclusive days
  return diffDays
}

// Fetch the service offering and calculate the amount
async function calculatePaymentAmount(contractorId: string, serviceId: string, numberOfDays: number): Promise<{amount: number, paymentType: 'one_time' | 'daily'}> {
  const serviceOfferingPath = `contractors/${contractorId}/serviceOfferings/${serviceId}`;
  const serviceOfferingRef = doc(db, serviceOfferingPath);
  
  try {
    const serviceOfferingSnap = await getDoc(serviceOfferingRef);
    if (serviceOfferingSnap.exists()) {
      const offeringData = serviceOfferingSnap.data() as ContractorServiceOffering;
      if (typeof offeringData.price === 'number' && offeringData.price > 0) {
        const paymentType = offeringData.paymentType || 'daily';
        
        // If it's a one-time fee, ignore numberOfDays
        const amount = paymentType === 'one_time' 
          ? offeringData.price 
          : offeringData.price * numberOfDays;
          
        return { amount, paymentType };
      } else {
        console.error(`Invalid price for service offering: ${serviceOfferingPath}`, offeringData);
        throw new Error(`Invalid price configured for service ID: ${serviceId}`);
      }
    } else {
      console.error(`Service offering not found at path: ${serviceOfferingPath}`);
      throw new Error(`Service offering with ID ${serviceId} not found for contractor ${contractorId}.`);
    }
  } catch (error) {
    console.error(`Error fetching service offering ${serviceOfferingPath}:`, error);
    throw new Error(`Could not fetch service details for ID: ${serviceId}.`);
  }
}

// Service information including payment type, price, etc.
interface BookingService {
  serviceId: string;
  paymentType: 'one_time' | 'daily';
  price: number; // in cents
  name?: string;
}

export async function getBookingsForClient(clientId: string): Promise<Booking[]> {
  const bookingsRef = collection(db, 'bookings')
  const q = query(bookingsRef, where('clientId', '==', clientId))
  const snapshot = await getDocs(q)
  const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking))
  
  // Enhance bookings with service names if missing
  try {
    const platformServices = await getAllPlatformServices()
    const serviceNameMap = new Map(platformServices.map(s => [s.id, s.name]))
    
    return bookings.map(booking => ({
      ...booking,
      services: booking.services?.map(service => ({
        ...service,
        name: service.name || serviceNameMap.get(service.serviceId) || service.serviceId
      })) || []
    }))
  } catch (error) {
    console.warn('Failed to enhance bookings with service names:', error)
    return bookings
  }
}

export async function addTestBooking(booking: Booking): Promise<void> {
  const bookingRef = doc(db, 'bookings', booking.id)
  await setDoc(bookingRef, booking)
}

// Fields determined INTERNALLY by addBooking: 
// id, numberOfDays, paymentAmount, platformFee, paymentIntentId, paymentClientSecret, status, paymentStatus, createdAt, updatedAt
// Thus, they should be OMITTED from the input `data` type definition where `Booking` is used.
// `date` is the old field, replaced by startDate/endDate, so it's also omitted.
// `serviceType` in Booking will be populated by `serviceId` from input.
// `paymentMethodId` is optional in Booking, can be in input `data` or fetched.
// `review` is optional in Booking and not part of initial booking creation data.
// `notes` (if it were a field) would be an example of an optional field passed in data.

interface AddBookingDataInput extends Omit<Booking, 
  'id' | 'numberOfDays' | 'paymentAmount' | 'platformFee' | 'paymentIntentId' | 
  'paymentClientSecret' | 'status' | 'paymentStatus' | 'createdAt' | 'updatedAt'> {
  stripeCustomerId: string;
  totalAmount?: number; // Optional pre-calculated total amount in cents (what client pays)
  baseServiceAmount?: number; // Base service amount in cents (what contractor receives)
  time?: {
    startTime: string;
    endTime: string;
  };
}

export async function addBooking(data: AddBookingDataInput): Promise<string> {
  let paymentMethodId: string | undefined = data.paymentMethodId;
  if (!paymentMethodId) {
    try {
      const res = await fetch('/api/stripe/list-payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: data.stripeCustomerId }),
      });
      if (res.ok) {
        const { paymentMethods } = await res.json();
        const defaultCard = paymentMethods.find((pm: any) => pm.isDefault) || paymentMethods[0];
        if (defaultCard) paymentMethodId = defaultCard.id;
      }
    } catch (err) {
      console.warn("Could not fetch default payment method:", err);
    }
  }

  const numberOfDays = calculateNumberOfDays(data.startDate, data.endDate);
  if (numberOfDays <= 0) {
    throw new Error("Booking must be for at least one day.");
  }

  // Calculate payment amounts - new fee structure where client pays fees
  let paymentAmountInCents = 0; // Total amount client pays (including fees)
  let baseServiceAmountInCents = 0; // Base service amount contractor receives
  
  if (data.totalAmount && data.baseServiceAmount) {
    // Use pre-calculated amounts if provided (new fee structure)
    paymentAmountInCents = data.totalAmount;
    baseServiceAmountInCents = data.baseServiceAmount;
  } else if (data.totalAmount) {
    // Legacy: totalAmount provided without baseServiceAmount
    paymentAmountInCents = data.totalAmount;
    baseServiceAmountInCents = data.totalAmount; // Fallback for backward compatibility
  } else if (data.services && data.services.length > 0) {
    // Calculate base service amount from services array
    data.services.forEach(service => {
      if (service.paymentType === 'one_time') {
        baseServiceAmountInCents += service.price;
      } else { // daily
        baseServiceAmountInCents += service.price * numberOfDays;
      }
    });
    
    // Calculate total amount client pays (base + platform fee + stripe fee)
    const platformFeeInCents = calculatePlatformFee(baseServiceAmountInCents);
    const estimatedStripeFeeInCents = calculateStripeFee(baseServiceAmountInCents);
    paymentAmountInCents = baseServiceAmountInCents + platformFeeInCents + estimatedStripeFeeInCents;
  } else if (data.serviceType) {
    // Legacy support for single service
    const contractorId = data.contractorId;
    const serviceId = data.serviceType;
    
    try {
      const serviceOfferingRef = doc(db, `contractors/${contractorId}/serviceOfferings/${serviceId}`);
      const serviceSnap = await getDoc(serviceOfferingRef);
      
      if (serviceSnap.exists()) {
        const offeringData = serviceSnap.data() as ContractorServiceOffering;
        const paymentType = offeringData.paymentType || 'daily';
        
        if (paymentType === 'one_time') {
          baseServiceAmountInCents = offeringData.price;
        } else {
          baseServiceAmountInCents = offeringData.price * numberOfDays;
        }
        
        // Calculate total amount client pays
        const platformFeeInCents = calculatePlatformFee(baseServiceAmountInCents);
        const estimatedStripeFeeInCents = calculateStripeFee(baseServiceAmountInCents);
        paymentAmountInCents = baseServiceAmountInCents + platformFeeInCents + estimatedStripeFeeInCents;
      } else {
        throw new Error(`Service offering not found: ${serviceId}`);
      }
    } catch (error) {
      console.error("Error calculating payment amount:", error);
      throw new Error("Failed to calculate payment amount from service offering.");
    }
  } else {
    throw new Error("No services specified for booking.");
  }
  
  if (paymentAmountInCents <= 0 || baseServiceAmountInCents <= 0) {
    throw new Error("Calculated payment amounts are invalid.");
  }

  // Calculate fees for display/tracking purposes
  const platformFeeInCents = calculatePlatformFee(baseServiceAmountInCents);
  const estimatedStripeFeeInCents = calculateStripeFee(baseServiceAmountInCents);

  // Fetch contractor stripe account ID
  let contractorStripeAccountId: string | undefined = undefined;
  try {
    const contractorDocRef = doc(db, "contractors", data.contractorId);
    const contractorSnap = await getDoc(contractorDocRef);
    if (contractorSnap.exists()) {
      contractorStripeAccountId = contractorSnap.data()?.stripeAccountId;
    }
    if (!contractorStripeAccountId) {
        throw new Error ("Contractor Stripe Account ID not found for " + data.contractorId);
    }
  } catch(err){
    console.error("Failed to fetch contractor Stripe Account ID:", err);
    throw new Error("Could not retrieve contractor payment details.");
  }
  
  const newBookingDocRef = doc(collection(db, 'bookings')); // Create ref to get ID first

  // Create service breakdown for metadata
  const servicesMetadata = data.services?.map(service => ({
    id: service.serviceId,
    type: service.paymentType,
    price: service.price.toString()
  })) || [];

  const stripeMetadata = {
    booking_id: newBookingDocRef.id, 
    client_id: data.clientId,
    contractor_id: data.contractorId,
    num_days: numberOfDays.toString(), // Stripe metadata values must be strings
    total_services: (data.services?.length || 1).toString(),
    services: JSON.stringify(servicesMetadata).slice(0, 500) // Limit metadata length
  };

  const stripePayload: any = {
    amount: paymentAmountInCents, // Total amount client pays
    currency: 'usd',
    customerId: data.stripeCustomerId,
    contractorId: data.contractorId,
    baseServiceAmount: baseServiceAmountInCents, // Amount contractor receives
    metadata: stripeMetadata,
    // The API route /api/stripe/create-payment-intent handles the new fee structure
  };
  if (paymentMethodId) {
    stripePayload.paymentMethodId = paymentMethodId;
  }

  const piResponse = await fetch('/api/stripe/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stripePayload),
  });

  if (!piResponse.ok) {
    const errorBody = await piResponse.json();
    console.error("Stripe PaymentIntent creation failed:", errorBody);
    throw new Error(errorBody.error || 'Failed to create payment intent');
  }
  const { id: paymentIntentId, clientSecret: piClientSecret } = await piResponse.json();

  // Set a default serviceType for backward compatibility if multiple services exist
  const serviceType = data.serviceType || (data.services && data.services.length > 0 ? data.services[0].serviceId : null);

  const bookingToSave: Booking = {
    id: newBookingDocRef.id,
    clientId: data.clientId,
    contractorId: data.contractorId,
    contractorName: data.contractorName,
    contractorPhone: data.contractorPhone,
    petIds: data.petIds,
    startDate: data.startDate,
    endDate: data.endDate,
    services: data.services || [],
    serviceType: serviceType || "", // Ensure serviceType is never undefined
    numberOfDays,
    paymentAmount: paymentAmountInCents / 100, // Total amount client pays
    baseServiceAmount: baseServiceAmountInCents / 100, // Base service amount contractor receives
    platformFee: platformFeeInCents / 100,
    stripeFee: estimatedStripeFeeInCents / 100, // Store estimated Stripe fee
    paymentIntentId,
    paymentClientSecret: piClientSecret,
    status: 'pending',
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(data.paymentType && { paymentType: data.paymentType }), // For backward compatibility
    ...(paymentMethodId && { paymentMethodId }),
    ...(data.time && { time: data.time }), // Add time information if provided
  };

  await setDoc(newBookingDocRef, bookingToSave);
  
  // Send email notifications via API route (to avoid client-side Node.js module issues)
  try {
    const response = await fetch('/api/notifications/booking-created', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: newBookingDocRef.id }),
    })
    
    if (!response.ok) {
      console.warn('Failed to send booking creation notification:', await response.text())
    } else {
      console.log('Booking creation notification sent successfully')
    }
  } catch (error) {
    console.error('Failed to send booking creation email notifications:', error)
    // Don't throw error - we don't want email failures to break the booking process
  }
  
  return newBookingDocRef.id;
}

export async function removeBooking(bookingId: string): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId)
  await deleteDoc(bookingRef)
}

export async function getGigsForContractor(contractorId: string): Promise<Booking[]> {
  const bookingsRef = collection(db, 'bookings')
  const q = query(bookingsRef, where('contractorId', '==', contractorId))
  const snapshot = await getDocs(q)
  const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking))
  
  // Enhance bookings with service names if missing
  try {
    const platformServices = await getAllPlatformServices()
    const serviceNameMap = new Map(platformServices.map(s => [s.id, s.name]))
    
    return bookings.map(booking => ({
      ...booking,
      services: booking.services?.map(service => ({
        ...service,
        name: service.name || serviceNameMap.get(service.serviceId) || service.serviceId
      })) || []
    }))
  } catch (error) {
    console.warn('Failed to enhance bookings with service names:', error)
    return bookings
  }
}

export async function updateBookingStatus(bookingId: string, status: Booking['status']): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId)
  
  // Get booking data first to access contractor and date information
  const bookingSnap = await getDoc(bookingRef)
  if (!bookingSnap.exists()) {
    throw new Error('Booking not found')
  }
  
  const booking = bookingSnap.data() as Booking
  
  // Handle cancellation logic
  if (status === 'cancelled') {
    let paymentStatusToUpdate: Booking['paymentStatus'] = booking.paymentStatus;
    if (booking.paymentIntentId && booking.paymentStatus === 'pending') {
      try {
        const cancelRes = await fetch('/api/stripe/cancel-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: booking.paymentIntentId }),
        });
        const cancelData = await cancelRes.json();
        if (cancelRes.ok && cancelData.status === 'canceled') {
          paymentStatusToUpdate = 'cancelled';
        } else {
          console.warn("Stripe PI cancellation failed or status not 'canceled'. Payment status not updated to cancelled.", cancelData);
        }
      } catch(err) {
        console.error("Error cancelling Stripe PI. Payment status not updated to cancelled.", err);
      }
    }
    
    // Remove gig dates from contractor's calendar when cancelled
    try {
      await removeGigDatesFromContractorCalendar(booking.contractorId, booking.startDate, booking.endDate)
      console.log(`Removed gig dates from contractor ${booking.contractorId}'s calendar for cancelled booking ${bookingId}`)
    } catch (error) {
      console.error('Failed to remove gig dates from contractor calendar:', error)
      // Don't throw error here - we still want to cancel the booking even if calendar update fails
    }
    
    await updateDoc(bookingRef, { status, paymentStatus: paymentStatusToUpdate });
    return;
  }
  
  // Handle approval - add dates to contractor's calendar
  if (status === 'approved') {
    try {
      // Add gig dates to contractor's unavailable dates
      await addGigDatesToContractorCalendar(booking.contractorId, booking.startDate, booking.endDate)
      console.log(`Added gig dates to contractor ${booking.contractorId}'s calendar for booking ${bookingId}`)
    } catch (error) {
      console.error('Failed to add gig dates to contractor calendar:', error)
      // Don't throw error here - we still want to approve the booking even if calendar update fails
    }
  }
  
  // Update booking status
  await updateDoc(bookingRef, { status });
}

export async function setClientCompleted(bookingId: string, completed: boolean): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId)
  await updateDoc(bookingRef, { clientCompleted: completed })
}

export async function setContractorCompleted(bookingId: string, completed: boolean): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId)
  await updateDoc(bookingRef, { contractorCompleted: completed })
}

export async function saveBookingReview(
  bookingId: string,
  reviewData: { rating: number; comment?: string }, 
  contractorId: string,
  // clientId: string // If needed for contractor review object
): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId);
  const reviewToSaveOnBooking = {
      ...reviewData,
      createdAt: new Date().toISOString(),
  };
  await updateDoc(bookingRef, { review: reviewToSaveOnBooking });

  const contractorRef = doc(db, 'contractors', contractorId);
  const reviewToSaveOnContractor = {
    ...reviewData,
    bookingId,
    date: new Date().toISOString(), // Use 'date' field as expected by Rating interface
    // clientId, // if you pass clientId to this function
    // userId: clientId // or a generic userId if that's how you identify reviewers
  };
  await updateDoc(contractorRef, { ratings: arrayUnion(reviewToSaveOnContractor) });
}

export async function getAllBookings(): Promise<Booking[]> {
  const bookingsRef = collection(db, 'bookings')
  const snapshot = await getDocs(bookingsRef)
  const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking))
  
  // Enhance bookings with service names if missing
  try {
    const platformServices = await getAllPlatformServices()
    const serviceNameMap = new Map(platformServices.map(s => [s.id, s.name]))
    
    return bookings.map(booking => ({
      ...booking,
      services: booking.services?.map(service => ({
        ...service,
        name: service.name || serviceNameMap.get(service.serviceId) || service.serviceId
      })) || []
    }))
  } catch (error) {
    console.warn('Failed to enhance bookings with service names:', error)
    return bookings
  }
}

export async function getBookingById(bookingId: string): Promise<Booking | null> {
  const bookingRef = doc(db, 'bookings', bookingId);
  const snapshot = await getDoc(bookingRef);
  if (!snapshot.exists()) {
    console.warn(`[getBookingById] No booking found with ID: ${bookingId}`);
    return null;
  }
  
  const booking = { id: snapshot.id, ...snapshot.data() } as Booking;
  
  // Enhance booking with service names if missing
  try {
    const platformServices = await getAllPlatformServices()
    const serviceNameMap = new Map(platformServices.map(s => [s.id, s.name]))
    
    return {
      ...booking,
      services: booking.services?.map(service => ({
        ...service,
        name: service.name || serviceNameMap.get(service.serviceId) || service.serviceId
      })) || []
    }
  } catch (error) {
    console.warn('Failed to enhance booking with service names:', error)
    return booking
  }
}

/**
 * Update the services for a pending booking and update the Stripe PaymentIntent
 */
export async function updateBookingServices({ bookingId, newServices, userId, newStartDate, newEndDate, newEndTime }: {
  bookingId: string,
  newServices: BookingService[],
  userId: string,
  newStartDate?: string,
  newEndDate?: string,
  newEndTime?: string,
}): Promise<Booking & { paymentRequiresAction?: boolean; paymentClientSecret?: string }> {
  // Fetch the booking
  const bookingRef = doc(db, 'bookings', bookingId)
  const bookingSnap = await getDoc(bookingRef)
  if (!bookingSnap.exists()) throw new Error('Booking not found')
  const booking = bookingSnap.data() as Booking

  // Only allow if not completed or cancelled
  if (booking.status === 'completed' || booking.status === 'cancelled') throw new Error('Cannot edit completed or cancelled bookings')
  if (booking.clientId !== userId) throw new Error('You do not have permission to edit this booking')

  // Use new dates if provided, else current (start date should never change)
  const startDate = booking.startDate // Start date is never changed
  const endDate = newEndDate || booking.endDate
  const endTime = newEndTime || booking.time?.endTime

  // Validate end date
  if (new Date(endDate) < new Date(startDate)) {
    throw new Error('End date cannot be before start date')
  }
  
  // Ensure end date is not in the past (at least today)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset to start of day for comparison
  const endDateOnly = new Date(endDate)
  endDateOnly.setHours(0, 0, 0, 0) // Reset to start of day for comparison
  
  if (endDateOnly < today) {
    throw new Error('End date cannot be in the past')
  }

  // Only allow service changes if pending
  let servicesToSave = booking.services
  if (booking.status === 'pending') {
    servicesToSave = newServices
  }

  // Recalculate totals with new fee structure
  const numberOfDays = calculateNumberOfDays(startDate, endDate)
  let newBaseServiceAmount = 0 // Base service amount contractor receives
  servicesToSave.forEach(service => {
    if (service.paymentType === 'one_time') {
      newBaseServiceAmount += service.price
    } else {
      newBaseServiceAmount += service.price * numberOfDays
    }
  })
  if (newBaseServiceAmount <= 0) throw new Error('Service amount must be greater than zero')
  
  // Calculate fees based on base service amount (new fee structure)
  const newPlatformFee = calculatePlatformFee(newBaseServiceAmount)
  const newEstimatedStripeFee = calculateStripeFee(newBaseServiceAmount)
  
  // Total amount client pays (base + platform fee + stripe fee)
  const newTotal = newBaseServiceAmount + newPlatformFee + newEstimatedStripeFee

  // Update Firestore booking with new amounts (no Stripe processing during edits)
  await updateDoc(bookingRef, {
    services: servicesToSave,
    paymentAmount: newTotal / 100, // Total amount client pays
    baseServiceAmount: newBaseServiceAmount / 100, // Base service amount contractor receives
    platformFee: newPlatformFee / 100,
    stripeFee: newEstimatedStripeFee / 100, // Store estimated Stripe fee
    startDate,
    endDate,
    numberOfDays,
    time: {
      ...(booking.time || {}),
      endTime,
    },
    updatedAt: new Date().toISOString(),
  })
  
  const updatedSnap = await getDoc(bookingRef)
  return { ...(updatedSnap.data() as Booking), id: updatedSnap.id }
} 