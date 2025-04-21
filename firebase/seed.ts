/**
 * Seed Firestore with sample data for clients, contractors, and bookings.
 *
 * Usage:
 *   1. Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account key.
 *   2. Run: npx ts-node firebase/seed.ts
 */

import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

async function seed() {
  // Sample client
  const clientId = 'clerk_client_001';
  const petId = 'pet_abc123';
  const paymentMethodId = 'pm_1234';
  const bookingId = 'booking_001';

  await db.collection('clients').doc(clientId).set({
    id: clientId,
    name: 'Jane Doe',
    address: '123 Main St, Miami, FL',
    phone: '555-123-4567',
    email: 'jane@example.com',
    pets: [
      {
        id: petId,
        name: 'Fido',
        age: 4,
        photoUrl: 'https://place-puppy.com/200x200',
        medications: 'None',
        food: 'Grain-free kibble',
        temperament: 'Friendly',
        schedule: 'Morning walk, evening play',
      },
    ],
    paymentMethods: [
      {
        id: paymentMethodId,
        type: 'card',
        last4: '4242',
        brand: 'Visa',
        expMonth: 12,
        expYear: 2026,
        isDefault: true,
      },
    ],
    bookingHistory: [
      {
        id: bookingId,
        clientId,
        contractorId: 'contractor_001',
        petIds: [petId],
        serviceType: 'Dog Walking',
        date: '2024-06-01T10:00:00Z',
        status: 'completed',
        paymentStatus: 'paid',
        paymentAmount: 50,
        review: {
          rating: 5,
          comment: 'Great service!',
        },
      },
    ],
  });

  // Sample contractor
  const contractorId = 'contractor_001';
  await db.collection('contractors').doc(contractorId).set({
    id: contractorId,
    name: 'Alex VetTech',
    address: '456 Oak Ave, Miami, FL',
    phone: '555-987-6543',
    email: 'alex@vet.com',
    veterinarySkills: ['Dog Walking', 'Medication Administration'],
    experience: '5 years in small animal care',
    certifications: ['Certified Vet Tech'],
    references: ['Dr. Smith', 'Clinic XYZ'],
    education: 'Miami Dade College, Vet Tech Program',
    drivingRange: '20 miles',
    application: {
      status: 'approved',
      submittedAt: '2024-05-01T12:00:00Z',
      reviewedAt: '2024-05-03T09:00:00Z',
      experience: '5 years in small animal care',
      education: 'Miami Dade College, Vet Tech Program',
      address: '456 Oak Ave, Miami, FL',
      drivingRange: '20 miles',
      certifications: ['Certified Vet Tech'],
      references: ['Dr. Smith', 'Clinic XYZ'],
    },
    availability: {
      availableSlots: ['2024-06-10T09:00:00Z', '2024-06-11T14:00:00Z'],
      unavailableDates: ['2024-06-15'],
    },
    paymentInfo: [
      {
        id: 'bank_001',
        type: 'bank',
        last4: '6789',
        isDefault: true,
      },
    ],
    workHistory: [
      {
        bookingId,
        clientId,
        petIds: [petId],
        serviceType: 'Dog Walking',
        date: '2024-06-01T10:00:00Z',
        status: 'completed',
        paymentStatus: 'paid',
        paymentAmount: 50,
        review: {
          rating: 5,
          comment: 'Great client!',
        },
      },
    ],
    ratings: [
      {
        bookingId,
        clientId,
        rating: 5,
        comment: 'Excellent service!',
        date: '2024-06-01T12:00:00Z',
      },
    ],
  });

  // Sample booking
  await db.collection('bookings').doc(bookingId).set({
    id: bookingId,
    clientId,
    contractorId,
    petIds: [petId],
    serviceType: 'Dog Walking',
    date: '2024-06-01T10:00:00Z',
    status: 'completed',
    paymentStatus: 'paid',
    paymentAmount: 50,
    paymentMethodId,
    createdAt: '2024-05-25T09:00:00Z',
    updatedAt: '2024-06-01T12:00:00Z',
    review: {
      rating: 5,
      comment: 'Great service!',
      createdAt: '2024-06-01T13:00:00Z',
    },
  });

  console.log('Sample data seeded successfully!');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
}); 