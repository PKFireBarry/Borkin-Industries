# Firestore Schema: Client Data Model

## Collections

### clients
- **Document ID:** clientId (string, matches Clerk user ID)
- **Fields:**
  - `name`: string
  - `address`: string (optional)
  - `phone`: string
  - `email`: string
  - `pets`: array of Pet objects (see below)
  - `paymentMethods`: array of PaymentMethod objects (see below)
  - `bookingHistory`: array of Booking objects (see below)

### pets (embedded in client)
- `id`: string (unique per pet)
- `name`: string
- `age`: number
- `photoUrl`: string (optional)
- `medications`: string (optional)
- `food`: string (optional)
- `temperament`: string (optional)
- `schedule`: string (optional)

### paymentMethods (embedded in client)
- `id`: string (from Stripe or generated)
- `type`: 'card' | 'bank' | 'other'
- `last4`: string
- `brand`: string (optional)
- `expMonth`: number (optional)
- `expYear`: number (optional)
- `isDefault`: boolean (optional)

### bookingHistory (embedded in client)
- `id`: string (booking ID)
- `clientId`: string
- `contractorId`: string
- `petIds`: array of string
- `serviceType`: string
- `date`: string (ISO date)
- `status`: 'pending' | 'approved' | 'completed' | 'cancelled'
- `paymentStatus`: 'pending' | 'paid' | 'refunded'
- `paymentAmount`: number
- `review`: object (optional)
  - `rating`: number
  - `comment`: string (optional)

## Example Document

```json
{
  "name": "Jane Doe",
  "address": "123 Main St, Miami, FL",
  "phone": "555-123-4567",
  "email": "jane@example.com",
  "pets": [
    {
      "id": "pet_abc123",
      "name": "Fido",
      "age": 4,
      "photoUrl": "https://...",
      "medications": "None",
      "food": "Grain-free kibble",
      "temperament": "Friendly",
      "schedule": "Morning walk, evening play"
    }
  ],
  "paymentMethods": [
    {
      "id": "pm_1234",
      "type": "card",
      "last4": "4242",
      "brand": "Visa",
      "expMonth": 12,
      "expYear": 2026,
      "isDefault": true
    }
  ],
  "bookingHistory": [
    {
      "id": "booking_001",
      "clientId": "clerk_user_id",
      "contractorId": "contractor_001",
      "petIds": ["pet_abc123"],
      "serviceType": "Dog Walking",
      "date": "2024-06-01T10:00:00Z",
      "status": "completed",
      "paymentStatus": "paid",
      "paymentAmount": 50,
      "review": {
        "rating": 5,
        "comment": "Great service!"
      }
    }
  ]
}
```

# Firestore Schema: Contractor Data Model

## Collections

### contractors
- **Document ID:** contractorId (string, matches Clerk user ID)
- **Fields:**
  - `name`: string
  - `address`: string
  - `phone`: string
  - `email`: string
  - `veterinarySkills`: array of string
  - `experience`: string
  - `certifications`: array of string
  - `references`: array of string
  - `education`: string
  - `drivingRange`: string
  - `application`: ContractorApplication object (see below)
  - `availability`: Availability object (see below)
  - `paymentInfo`: array of PaymentInfo objects (see below)
  - `workHistory`: array of WorkHistory objects (see below)
  - `ratings`: array of Rating objects (see below)

### application (embedded in contractor)
- `status`: 'pending' | 'approved' | 'rejected'
- `submittedAt`: string (ISO date)
- `reviewedAt`: string (ISO date, optional)
- `experience`: string
- `education`: string
- `address`: string
- `drivingRange`: string
- `certifications`: array of string
- `references`: array of string

### availability (embedded in contractor)
- `availableSlots`: array of string (ISO date/time)
- `unavailableDates`: array of string (ISO date, optional)

### paymentInfo (embedded in contractor)
- `id`: string
- `type`: 'bank' | 'card' | 'other'
- `last4`: string
- `brand`: string (optional)
- `expMonth`: number (optional)
- `expYear`: number (optional)
- `isDefault`: boolean (optional)

### workHistory (embedded in contractor)
- `bookingId`: string
- `clientId`: string
- `petIds`: array of string
- `serviceType`: string
- `date`: string (ISO date)
- `status`: 'pending' | 'approved' | 'completed' | 'cancelled'
- `paymentStatus`: 'pending' | 'paid' | 'refunded'
- `paymentAmount`: number
- `review`: object (optional)
  - `rating`: number
  - `comment`: string (optional)

### ratings (embedded in contractor)
- `bookingId`: string
- `clientId`: string
- `rating`: number
- `comment`: string (optional)
- `date`: string (ISO date)

## Example Document

```json
{
  "name": "Alex VetTech",
  "address": "456 Oak Ave, Miami, FL",
  "phone": "555-987-6543",
  "email": "alex@vet.com",
  "veterinarySkills": ["Dog Walking", "Medication Administration"],
  "experience": "5 years in small animal care",
  "certifications": ["Certified Vet Tech"],
  "references": ["Dr. Smith", "Clinic XYZ"],
  "education": "Miami Dade College, Vet Tech Program",
  "drivingRange": "20 miles",
  "application": {
    "status": "approved",
    "submittedAt": "2024-05-01T12:00:00Z",
    "reviewedAt": "2024-05-03T09:00:00Z",
    "experience": "5 years in small animal care",
    "education": "Miami Dade College, Vet Tech Program",
    "address": "456 Oak Ave, Miami, FL",
    "drivingRange": "20 miles",
    "certifications": ["Certified Vet Tech"],
    "references": ["Dr. Smith", "Clinic XYZ"]
  },
  "availability": {
    "availableSlots": ["2024-06-10T09:00:00Z", "2024-06-11T14:00:00Z"],
    "unavailableDates": ["2024-06-15"]
  },
  "paymentInfo": [
    {
      "id": "bank_001",
      "type": "bank",
      "last4": "6789",
      "isDefault": true
    }
  ],
  "workHistory": [
    {
      "bookingId": "booking_001",
      "clientId": "clerk_user_id",
      "petIds": ["pet_abc123"],
      "serviceType": "Dog Walking",
      "date": "2024-06-01T10:00:00Z",
      "status": "completed",
      "paymentStatus": "paid",
      "paymentAmount": 50,
      "review": {
        "rating": 5,
        "comment": "Great client!"
      }
    }
  ],
  "ratings": [
    {
      "bookingId": "booking_001",
      "clientId": "clerk_user_id",
      "rating": 5,
      "comment": "Excellent service!",
      "date": "2024-06-01T12:00:00Z"
    }
  ]
}
```

# Firestore Schema: Booking Data Model

## Collections

### bookings
- **Document ID:** bookingId (string, auto-generated or custom)
- **Fields:**
  - `clientId`: string (reference to client)
  - `contractorId`: string (reference to contractor)
  - `petIds`: array of string (references to pets)
  - `serviceType`: string
  - `date`: string (ISO date)
  - `status`: 'pending' | 'approved' | 'completed' | 'cancelled'
  - `paymentStatus`: 'pending' | 'paid' | 'refunded'
  - `paymentAmount`: number
  - `paymentMethodId`: string (optional, reference to payment method)
  - `createdAt`: string (ISO date)
  - `updatedAt`: string (ISO date)
  - `review`: object (optional)
    - `rating`: number
    - `comment`: string (optional)
    - `createdAt`: string (ISO date)

## Example Document

```json
{
  "id": "booking_001",
  "clientId": "clerk_user_id",
  "contractorId": "contractor_001",
  "petIds": ["pet_abc123"],
  "serviceType": "Dog Walking",
  "date": "2024-06-01T10:00:00Z",
  "status": "completed",
  "paymentStatus": "paid",
  "paymentAmount": 50,
  "paymentMethodId": "pm_1234",
  "createdAt": "2024-05-25T09:00:00Z",
  "updatedAt": "2024-06-01T12:00:00Z",
  "review": {
    "rating": 5,
    "comment": "Great service!",
    "createdAt": "2024-06-01T13:00:00Z"
  }
}
```

# Firestore Collections & Security Rules

## Collections
- `clients`: One document per client (Clerk user ID)
- `contractors`: One document per contractor (Clerk user ID)
- `bookings`: One document per booking (auto-generated or custom ID)

## Security Rules Overview
- **Clients:** Users can only read/write their own client document.
- **Contractors:** Users can only read/write their own contractor document.
- **Bookings:**
  - Any authenticated user can create a booking.
  - Only the client or contractor involved in a booking can read, update, or delete it.
- **Admin:**
  - Users with a custom claim `admin == true` can read/write any document in any collection.

## Example Rule (for clients)
```js
match /clients/{clientId} {
  allow read, write: if request.auth != null && request.auth.uid == clientId;
}
```

## How to Set Admin Claim
To grant admin access, set a custom claim on the user's Firebase Auth token:
```js
// Example using Firebase Admin SDK
admin.auth().setCustomUserClaims(uid, { admin: true });
```

---

**These rules ensure strong data isolation and security for all user roles.** 