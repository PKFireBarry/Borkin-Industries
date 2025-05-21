import { db } from '../../firebase'
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import type { Booking } from '@/types/booking'
import type { ContractorServiceOffering } from '@/types/service'

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
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking))
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
  totalAmount?: number; // Optional pre-calculated total amount in cents
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

  // Calculate total payment amount from services
  let paymentAmountInCents = 0;
  
  if (data.totalAmount) {
    // Use pre-calculated total if provided
    paymentAmountInCents = data.totalAmount;
  } else if (data.services && data.services.length > 0) {
    // Calculate from services array
    data.services.forEach(service => {
      if (service.paymentType === 'one_time') {
        paymentAmountInCents += service.price;
      } else { // daily
        paymentAmountInCents += service.price * numberOfDays;
      }
    });
  } else if (data.serviceType) {
    // Legacy support for single service
    // If services array is not present but serviceType is, fetch the service
    const contractorId = data.contractorId;
    const serviceId = data.serviceType;
    
    try {
      const serviceOfferingRef = doc(db, `contractors/${contractorId}/serviceOfferings/${serviceId}`);
      const serviceSnap = await getDoc(serviceOfferingRef);
      
      if (serviceSnap.exists()) {
        const offeringData = serviceSnap.data() as ContractorServiceOffering;
        const paymentType = offeringData.paymentType || 'daily';
        
        if (paymentType === 'one_time') {
          paymentAmountInCents = offeringData.price;
        } else {
          paymentAmountInCents = offeringData.price * numberOfDays;
        }
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
  
  if (paymentAmountInCents <= 0) {
    throw new Error("Calculated payment amount is invalid.");
  }

  const platformFeeInCents = Math.round(paymentAmountInCents * 0.05);

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
    amount: paymentAmountInCents,
    currency: 'usd',
    customerId: data.stripeCustomerId,
    contractorId: data.contractorId,
    metadata: stripeMetadata,
    // The API route /api/stripe/create-payment-intent calculates application_fee_amount
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
    paymentAmount: paymentAmountInCents / 100,
    platformFee: platformFeeInCents / 100,
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
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking))
}

export async function updateBookingStatus(bookingId: string, status: Booking['status']): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId)
  // ... (rest of updateBookingStatus - needs careful review if payment cancellation logic changes)
  // For now, focusing on addBooking. The cancellation logic might need adjustment based on multi-day implications.
  if (status === 'cancelled') {
    const snap = await getDoc(bookingRef);
    if (snap.exists()) {
      const booking = snap.data() as Booking;
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
      await updateDoc(bookingRef, { status, paymentStatus: paymentStatusToUpdate });
      return;
    }
  }
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
    ...reviewToSaveOnBooking,
    bookingId,
    // clientId, // if you pass clientId to this function
    // userId: clientId // or a generic userId if that's how you identify reviewers
  };
  await updateDoc(contractorRef, { ratings: arrayUnion(reviewToSaveOnContractor) });
}

export async function getAllBookings(): Promise<Booking[]> {
  const bookingsRef = collection(db, 'bookings')
  const snapshot = await getDocs(bookingsRef)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking))
}

export async function getBookingById(bookingId: string): Promise<Booking | null> {
  const bookingRef = doc(db, 'bookings', bookingId);
  const snapshot = await getDoc(bookingRef);
  if (!snapshot.exists()) {
    console.warn(`[getBookingById] No booking found with ID: ${bookingId}`);
    return null;
  }
  return { id: snapshot.id, ...snapshot.data() } as Booking;
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

  // Use new dates if provided, else current
  const startDate = newStartDate || booking.startDate
  const endDate = newEndDate || booking.endDate
  const endTime = newEndTime || booking.time?.endTime

  // Validate dates
  if (new Date(startDate) > new Date(endDate)) throw new Error('Start date must be before end date')
  if (new Date(startDate) < new Date()) throw new Error('Cannot set start date in the past')

  // Only allow service changes if pending
  let servicesToSave = booking.services
  if (booking.status === 'pending') {
    servicesToSave = newServices
  }

  // Recalculate total
  const numberOfDays = calculateNumberOfDays(startDate, endDate)
  let newTotal = 0
  servicesToSave.forEach(service => {
    if (service.paymentType === 'one_time') {
      newTotal += service.price
    } else {
      newTotal += service.price * numberOfDays
    }
  })
  if (newTotal <= 0) throw new Error('Total must be greater than zero')
  const newPlatformFee = Math.round(newTotal * 0.05)

  // Get contractor's Stripe account ID
  const contractorRef = doc(db, 'contractors', booking.contractorId)
  const contractorSnap = await getDoc(contractorRef)
  if (!contractorSnap.exists()) throw new Error('Contractor not found')
  const contractorStripeAccountId = contractorSnap.data()?.stripeAccountId
  if (!contractorStripeAccountId) throw new Error('Contractor has no Stripe account')

  // Get client Stripe customer ID and currency
  const clientRef = doc(db, 'clients', booking.clientId)
  const clientSnap = await getDoc(clientRef)
  if (!clientSnap.exists()) throw new Error('Client not found')
  const stripeCustomerId = clientSnap.data()?.stripeCustomerId
  if (!stripeCustomerId) throw new Error('Client has no Stripe customer ID')
  // Default to USD; update if multi-currency support is added
  const currency = 'usd'

  // Fetch default payment method if not present on booking
  let paymentMethodId: string | undefined = booking.paymentMethodId
  if (!paymentMethodId) {
    try {
      const res = await fetch('/api/stripe/list-payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: stripeCustomerId }),
      })
      if (res.ok) {
        const { paymentMethods } = await res.json()
        const defaultCard = paymentMethods.find((pm: any) => pm.isDefault) || paymentMethods[0]
        if (defaultCard) paymentMethodId = defaultCard.id
      }
    } catch (err) {
      // Optionally log error
    }
  }

  // Update the PaymentIntent
  const updateRes = await fetch('/api/stripe/update-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentIntentId: booking.paymentIntentId,
      newAmount: newTotal,
      currency,
      customerId: stripeCustomerId,
      contractorId: booking.contractorId,
      ...(paymentMethodId ? { paymentMethodId } : {}),
    }),
  })
  const updateData = await updateRes.json()
  if (!updateRes.ok) {
    throw new Error(updateData.error || 'Failed to update payment intent')
  }

  let paymentIntentId = booking.paymentIntentId
  let paymentClientSecret = booking.paymentClientSecret
  let paymentRequiresAction = false
  // Only require payment action if status is requires_payment_method or requires_confirmation
  if (updateData.replaced && updateData.paymentIntentId && updateData.clientSecret) {
    paymentIntentId = updateData.paymentIntentId
    paymentClientSecret = updateData.clientSecret
    if (updateData.status === 'requires_payment_method' || updateData.status === 'requires_confirmation') {
      paymentRequiresAction = true
    }
    // Update Firestore booking with new PaymentIntent
    await updateDoc(bookingRef, {
      paymentIntentId,
      paymentClientSecret,
      ...(paymentMethodId ? { paymentMethodId } : {}),
    })
  }

  // Update Firestore booking
  await updateDoc(bookingRef, {
    services: servicesToSave,
    paymentAmount: newTotal / 100,
    platformFee: newPlatformFee / 100,
    startDate,
    endDate,
    numberOfDays,
    time: {
      ...(booking.time || {}),
      endTime,
    },
    updatedAt: new Date().toISOString(),
    ...(paymentMethodId ? { paymentMethodId } : {}),
  })
  const updatedSnap = await getDoc(bookingRef)
  return { ...(updatedSnap.data() as Booking), id: updatedSnap.id, paymentRequiresAction, paymentClientSecret }
} 