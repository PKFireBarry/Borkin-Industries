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

// Replace placeholder with actual Firestore fetch
async function getContractorServiceDailyRate(contractorId: string, serviceId: string): Promise<number> {
  const serviceOfferingPath = `contractors/${contractorId}/serviceOfferings/${serviceId}`;
  const serviceOfferingRef = doc(db, serviceOfferingPath);
  
  try {
    const serviceOfferingSnap = await getDoc(serviceOfferingRef);
    if (serviceOfferingSnap.exists()) {
      const offeringData = serviceOfferingSnap.data() as ContractorServiceOffering;
      if (typeof offeringData.price === 'number' && offeringData.price > 0) {
        return offeringData.price; // Assuming price is stored in cents
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
    throw new Error(`Could not fetch service details for ID: ${serviceId}.`); // Re-throw or handle as appropriate
  }
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

interface AddBookingDataInput extends Omit<Booking, 'id' | 'date' | 'numberOfDays' | 'paymentAmount' | 'platformFee' | 'paymentIntentId' | 'paymentClientSecret' | 'status' | 'paymentStatus' | 'createdAt' | 'updatedAt' | 'serviceType' | 'review'> {
  stripeCustomerId: string;
  serviceId: string; // This will populate Booking.serviceType and is used to fetch the rate
  // paymentMethodId is optional in Booking, so it can be here or not.
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

  const dailyRateInCents = await getContractorServiceDailyRate(data.contractorId, data.serviceId);
  if (dailyRateInCents <= 0) {
    throw new Error("Invalid service daily rate.");
  }

  const paymentAmountInCents = dailyRateInCents * numberOfDays;
  if (paymentAmountInCents <= 0) {
    throw new Error("Calculated payment amount is invalid.");
  }

  const platformFeeInCents = Math.round(paymentAmountInCents * 0.05);

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

  const stripeMetadata = {
    booking_id: newBookingDocRef.id, 
    client_id: data.clientId,
    contractor_id: data.contractorId,
    service_id: data.serviceId,
    num_days: numberOfDays.toString(), // Stripe metadata values must be strings
    daily_rate_cents: dailyRateInCents.toString()
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

  // Metadata is set at creation, but if an update is needed, call update API:
  // (Example: if booking_id couldn't be known before PI creation)
  // await fetch('/api/stripe/update-payment-intent-metadata', { /* ... */ });

  const bookingToSave: Booking = {
    clientId: data.clientId,
    contractorId: data.contractorId,
    petIds: data.petIds,
    startDate: data.startDate,
    endDate: data.endDate,
    serviceType: data.serviceId, 
    ...(paymentMethodId && { paymentMethodId }),
    // ...(data.notes && { notes: data.notes }), // If you add a notes field to AddBookingDataInput & Booking

    id: newBookingDocRef.id,
    numberOfDays,
    paymentAmount: paymentAmountInCents / 100,
    platformFee: platformFeeInCents / 100,
    paymentIntentId,
    paymentClientSecret: piClientSecret,
    status: 'pending',
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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