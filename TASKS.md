# Project Requirements Document (PRD): Borkin Industries Platform

##TODO
 - add cert image to application 
 - add phone number to application filters on admin side of app
 - implement tier-based payment structure (entry, vet assistant, CVT) for pricing page on admin side
 - add pricing page to admin dashboard
 - add coupons to admin dashboard in the pricing page
 - implement platform fees: 5% base fee for first three months, then 10% base fee after 3 months
 - add internal messaging system for client-contractor communication about gigs

## Overview
A web platform for Borkin Industries to connect clients seeking high-quality, luxury at-home pet care with accredited veterinary technicians (contractors). The platform will facilitate client/contractor onboarding, booking management, payment processing, and company oversight, with a focus on Southeast Florida.

---

## 1. User Roles & Authentication
- **Client**: Can register, manage profile, add pets, book services, manage payments, and review past bookings.
- **Contractor**: Can apply, onboard, manage profile, set availability, view/apply for gigs, and receive payments.
- **Admin/Owner**: Special protected route to review contractor applications, approve/reject, and start onboarding (legal docs, email setup, etc.).
- **Authentication**: Handled via Clerk.

---

## 2. Data Models
- **Client**: Name, address, phone, email, pets (name, age, photo, medications, food, temperament, schedule), payment method(s), booking history, emergency contacts, primary care provider for pet, local emergency clinic for pet, profile picture.
- **Contractor**: Name, address, phone, email, veterinary skills, experience, certifications, references, education, driving range, availability calendar, payment info, application status, booking/work history, ratings.
- **Booking**: Client, contractor, pet(s), service type, date/time, status (pending, approved, completed, cancelled), payment status/amount, review/rating.
- **Pet**: Name, age, photo, medications, amount of food, allergies, need-to-know information.

---

## 3. Core Features
### Client Side
- Dashboard: Update profile, manage pets, add payment method, view previous bookings, create new work orders.
- Booking: See contractor availability, request services, view/track booking status, leave reviews after gigs.
- Internal messaging system for communication with contractors about gigs.

### Contractor Side
- Dashboard: Update profile, set availability (calendar), manage experience/skills, view/apply for gigs, see payment history, see reviews.
- Application: Online form (basic info, experience, education, address, driving range, certifications, references), triggers admin review.
- Onboarding: After approval, legal docs and email setup handled by admin.
- Internal messaging system for communication with clients about gigs.

### Admin/Owner Side
- Protected route to review contractor applications, approve/reject, and initiate onboarding.
- Manage contractors and bookings.
- Pricing page with tier-based payment structure and coupon management.

---

## 4. Booking & Scheduling
- Bookings require contractor approval before confirmation.
- Contractors set availability via calendar; clients can only book available slots.
- No recurring bookings (each gig is set as needed).

---

## 5. Payments
- Stripe integration for all payments.
- Client payment held in escrow until gig completion, then released to contractor.
- Platform fees: 5% base fee for first three months, 10% base fee after 3 months.
- Tier-based payment structure (entry, vet assistant, CVT).
- Coupon system for discounts.

---

## 6. Notifications
- Email notifications for booking creation, updates, and completion (to both clients and contractors).
- In-app messaging system for client-contractor communication about gigs.

---

## 7. Reviews & Ratings
- Clients prompted to leave a review/rating for contractors after each completed gig.
- Ratings stored in contractor profile.

---

## 8. Additional Features
- FAQ and resource section for clients and contractors.
- (Future) Referral codes, marketing analytics, and promotions.

---

## 9. Tech Stack
- **Frontend/Backend**: Next.js 15 (App Router)
- **UI**: Shadcn UI, Tailwind CSS
- **Database**: Firebase
- **Auth**: Clerk
- **Payments**: Stripe

---

## 10. Marketing & Expansion
- Local marketing via veterinary expos, pop-up shops, and social media (Facebook/Instagram ad campaigns targeting Southeast Florida pet owners).
- Booths at local events to attract clients and investors.

---

## 11. Accessibility & Compliance
- Follow accessibility best practices (WCAG) where possible.
- No special compliance (e.g., HIPAA/GDPR) required at pre-launch.

---

## 12. Branding
- Use provided logos and client photos for branding.

---

## 13. Out of Scope (for MVP)
- In-app messaging
- Recurring bookings
- Advanced analytics
- Platform fees/commission
- Data export
- Calendar integration with external services

---

##Detailed Task Breakdown

### 1. Project Setup & Architecture
- [x] Initialize Next.js 15 project with App Router
- [x] Set up TypeScript configuration
- [x] Install and configure Tailwind CSS
- [x] Install Shadcn UI components
- [x] Set up project structure (feature-based folders)
- [x] Configure environment variables for Firebase, Clerk, Stripe

### 2. Authentication (Clerk)
- [x] Install Clerk and configure provider
- [x] Set up Clerk for client, contractor, and admin roles
- [x] Implement protected routes for admin/owner
- [x] Test authentication flows for all user types

### 3. Database Schema (Firebase)
- [x] Design client data model (profile, pets, payment methods, bookings)
- [x] Design contractor data model (profile, application, availability, payment info, work history, ratings)
- [x] Design booking data model (client, contractor, pet, service, status, payment, review)
- [x] Set up Firestore collections and security rules
- [x] Seed database with test data

### 4. Client Dashboard & Pet Management
- [x] Create client dashboard layout (RSC)
- [x] Fix dashboard layout to support client hooks and conditional sidebar rendering
- [ ] Implement profile update form
- [x] Build pet management UI (add/edit/remove pets)
- [x] Add pet profile fields: medications, amount of food, allergies, need-to-know information
- [x] Add animal type and feeding schedule to pets
- [x] Add breed and weight fields to pet profiles
- [x] Add client profile fields: emergency contacts, primary care provider for pet, local emergency clinic for pet, profile picture
- [x] Integrate payment method management (Stripe)
- [x] Display previous bookings
- [x] Create booking request form (work order)
- [x] Show available contractors and their availability
- [ ] Show contractor reviews/ratings
- [x] Filter contractors by service type and date
- [x] Book directly from contractor card
- [x] Booking status display in dashboard
- [x] Notification stubs
- [x] Cancel uncaptured Stripe payment when pending booking is canceled
  - Pending bookings now cancel the associated Stripe PaymentIntent when canceled, ensuring no lingering payments in Stripe or the UI.

### 5. Contractor Application & Onboarding
- [x] Build contractor application form (resume, experience, education, address, driving range, certifications, references)
- [x] Store application data in Firebase
- [x] Notify admin of new application
- [x] Admin review UI for applications (approve/reject)
- [x] Onboarding flow for approved contractors (legal docs, email setup instructions)
- [x] Contractor dashboard: profile update, experience/skills, availability calendar
- [x] Show available gigs and allow contractor to accept/decline
- [x] Display work/payment history and reviews
- [x] Implement booking completion and payment release flow (contractor marks as completed, app captures PaymentIntent)
- [x] Contractor can update payout method via Stripe Connect Express
- [x] Fix contractor application redirect and error checking so new contractors are properly redirected to the application form and cannot submit multiple applications.

### 6. Booking & Calendar Features
- [ ] Implement booking creation and status tracking
- [ ] Contractor approval flow for bookings
- [ ] Build contractor availability calendar (set unavailable days)
- [ ] Display contractor calendar to clients
- [ ] Booking status updates (pending, approved, completed, cancelled)
- [ ] Booking detail view for both client and contractor

### 7. Payments (Stripe)
- [x] Integrate Stripe for client payments
- [ ] Hold payment in escrow until gig completion
- [x] Release payment to contractor upon completion
- [ ] Payment status tracking in booking flow
- [ ] Payment history for contractors
- [ ] Implement platform fees: 5% for first three months, 10% after
- [ ] Implement tier-based payment structure (entry, vet assistant, CVT)
- [ ] Add coupon system for discounts

### 8. Admin/Owner Features
- [x] Protected admin route for reviewing contractor applications
- [x] Approve/reject contractor applications
- [ ] Initiate onboarding for approved contractors
- [x] Manage contractors and bookings overview
- [x] Contractor management page (remove contractors, view payouts summary)
- [x] Bookings summary with metrics and visualizations
- [ ] Manage Clients
- [ ] Add phone number filter to contractor application filters
- [ ] Create pricing page with tier-based payment structure management
- [ ] Add coupon management to pricing page

### 9. Notifications & Reviews
- [ ] Set up email notifications for booking creation, updates, completion (clients & contractors)
- [ ] Prompt clients for review/rating after gig completion
- [ ] Store and display contractor ratings
- [ ] Implement internal messaging system for client-contractor communication

### 10. FAQ & Resource Section
- [ ] Create FAQ page for clients and contractors
- [ ] Add resource links and helpful guides

### 11. Marketing & Launch Prep
- [ ] Add company branding (logos, client photos)
- [ ] Prepare landing page for local marketing
- [ ] Set up Facebook/Instagram ad campaign tracking (if feasible)
- [ ] Prepare for event/booth marketing (print materials, info page)

---

(Each task should be checked off as completed. Tasks are grouped by feature area for clarity and project management.)
