# Project Requirements Document (PRD): Borkin Industries Platform

##TODO
 - add cert image to application 
 - add phone number to application filters on admin side of app
 - implement tier-based payment structure (entry, vet assistant, CVT) for pricing page on admin side
 - add pricing page to admin dashboard
 - add coupons to admin dashboard in the pricing page
 - [x] implement platform fees: 5% base fee for first three months, then 10% base fee after 3 months
 - [x] add internal messaging system for client-contractor communication about gigs (Backend Started)

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
- [x] Firebase Storage is set up and exported
- [x] Firebase upload utility is created
- [x] Center Terms of Service component on homepage

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
- [x] Implement profile update form
  - [x] Modernize client profile page with sleek, SaaS-style UI similar to Twitter/Instagram/Facebook
  - [x] Enhanced visual hierarchy with gradient backgrounds and modern card designs
  - [x] Improved avatar display with hover effects and better photo upload integration
  - [x] Modern form design with better spacing, typography, and visual feedback
  - [x] Added icons and color-coded sections for better organization
  - [x] Responsive design optimized for all device sizes
  - [x] Enhanced loading states and error handling with modern UI patterns
  - [x] Improved success/error messaging with better visual feedback
- [x] Build pet management UI (add/edit/remove pets)
- [x] Add pet profile fields: medications, amount of food, allergies, need-to-know information
- [x] Add animal type and feeding schedule to pets
- [x] Add breed and weight fields to pet profiles
- [x] Modernize pet management page UI/UX with modern SaaS design inspired by Twitter/Instagram/Facebook/Airbnb/Coinbase
  - Redesigned with gradient backgrounds and modern card-based layout
  - Enhanced pet cards with hover effects, smooth transitions, and improved visual hierarchy
  - Added color-coded animal type badges with icons for better visual organization
  - Modernized photo display with fallback avatars and gradient backgrounds
  - Improved information display with icon-based sections and better typography
  - Enhanced forms with modern styling, better spacing, and improved user experience
  - Added loading states with skeleton animations for better perceived performance
  - Redesigned empty state with engaging call-to-action
  - Improved dialogs with modern styling and better visual feedback
  - Responsive design optimized for all device sizes
- [x] Add client profile fields: emergency contacts, primary care provider for pet, local emergency clinic for pet, profile picture
- [x] Integrate payment method management (Stripe)
- [x] Modernize payments page UI/UX with Revolut/Coinbase-inspired design
  - Added tabbed interface with Overview, Cards, and History sections
  - Created modern fintech-style dashboard with payment statistics cards
  - Enhanced credit card display with realistic card designs and branding
  - Added payment history and recent activity sections
  - Implemented client payment history API endpoint
  - Improved responsive design and visual hierarchy
- [x] Display previous bookings
- [x] Create booking request form (work order)
- [x] Show available contractors and their availability
- [x] Show contractor reviews/ratings
- [x] Filter contractors by service type and date
- [x] Book directly from contractor card
- [x] Modernize find contractors page UI/UX with Instagram/Airbnb-inspired design
  - Redesigned with modern hero section featuring gradient backgrounds and enhanced search functionality
  - Enhanced contractor cards with hover effects, rating badges, and improved visual hierarchy
  - Added comprehensive search functionality across names, locations, services, and bios
  - Modernized filter system with collapsible interface and active filter indicators
  - Improved contractor profile modal with sectioned layout, enhanced service displays, and modern styling
  - Added rating displays, skill badges, and service range information to contractor cards
  - Implemented smooth transitions, hover animations, and modern interaction patterns
  - Enhanced empty states with engaging messaging and clear call-to-actions
  - Optimized responsive design for all device sizes with modern card-based layout
- [x] Booking status display in dashboard
- [x] Modernize client dashboard home page with comprehensive "at a glance" experience
  - Redesigned with modern fintech/social media-inspired UI featuring gradient backgrounds and enhanced visual hierarchy
  - Added real-time data integration showing actual payment methods, pets, bookings, and account statistics
  - Created personalized hero section with user avatar, name, and contextual welcome message
  - Enhanced stats cards with color-coded metrics for total bookings, completed services, total spent, and active pets
  - Added realistic payment method display with credit card visualization showing actual card details
  - Implemented comprehensive pet showcase with photos, animal type icons, and key information badges
  - Created intelligent booking section that prioritizes upcoming bookings over recent ones with status indicators
  - Added quick action cards for common tasks (book service, manage pets, payment methods)
  - Implemented proper loading states with skeleton animations and error handling
  - Enhanced empty states with engaging messaging and clear call-to-actions for onboarding
  - Optimized responsive design for all device sizes with modern card-based layout and smooth transitions
- [x] Notification stubs
- [x] Cancel uncaptured Stripe payment when pending booking is canceled
  - Pending bookings now cancel the associated Stripe PaymentIntent when canceled, ensuring no lingering payments in Stripe or the UI.
- [x] Map gigs to payouts in contractor payments API (backend returns payouts and all paid gigs)
- [x] Allow clients to edit services for pending bookings and update Stripe PaymentIntent accordingly.
- [x] Integrate Stripe Elements payment re-authorization in the edit services modal for bookings when a new PaymentIntent is required after editing services.
- [x] Update backend and frontend to fully automate the booking update and payment flow for the user.
- [x] Fix client booking details modal to always show service names instead of IDs
- [x] Fix service name display in booking edit modal to show human-readable names instead of primitive service IDs
- [x] Add contractor name and phone number to booking details model and display in booking details UI
- [x] Clean up and restyle booking details modal for clarity and client-friendliness
- [x] Refine dashboard navigation layout to be fully responsive and collapsible for all device types
- [x] Create reusable PhotoUpload component
- [x] Integrate PhotoUpload into client profile, contractor profile, and pet management
- [x] Update forms to save/display photo URLs
- [x] Modernize bookings page UI/UX with professional design similar to Twitter/Instagram/Facebook/Coinbase/Airbnb
  - Redesigned main bookings page with modern header, gradient backgrounds, and clean layout
  - Enhanced booking cards with modern styling, status indicators, and improved visual hierarchy
  - Modernized tabs with sleek design and smooth transitions
  - Updated status badges with modern pill design and color coding
  - Redesigned empty states with engaging illustrations and clear call-to-actions
  - Modernized cancel dialog with warning icons and improved user experience
  - Completely redesigned booking details modal with sectioned layout and modern card designs
  - Enhanced contractor info display with profile images and structured information
  - Improved services and payment section with modern card layouts and visual indicators
  - Added modern action buttons with hover effects and consistent styling
  - Implemented responsive design optimized for all device sizes

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
- [x] Refine Contractor Application UI/UX:
  - [x] Allow completing any section at any time.
  - [x] Only allow form submission when all sections are complete and valid.
  - [x] Improve stepper navigation and visual cues.
  - [x] Ensure completion summary is always visible on desktop.
- [x] Make Experience, Education, Certifications, and References sections optional.
- [x] Update Driving Range: change maxDistance to select (10-50 miles), remove areasServed.

### 5A. Contractor Service & Pricing Management
- [x] Define TypeScript interfaces for PlatformService and ContractorServiceOffering (`types/service.ts`)
- [x] Update Contractor data model to include `serviceOfferings` (`types/contractor.ts`)
- [x] Implement server actions for CRUD operations on service offerings (`app/dashboard/contractor/services/actions.ts`)
- [x] Integrate service & pricing management into Contractor Profile page (`app/dashboard/contractor/profile/page.tsx`)
  - [x] Update profile page state to include `serviceOfferings`.
  - [x] Create `ContractorProfileServiceManager` component (`app/dashboard/contractor/profile/components/contractor-profile-service-manager.tsx`) to handle display and forms for services.
  - [x] Integrate this component into the profile page for viewing and editing services.
- [x] Update Stripe integration to use dynamic service prices from `ContractorServiceOffering`.
  - [x] Implement multi-day bookings with per-day service pricing.
    - [x] Update `Booking` type to use `startDate` and `endDate`.
    - [x] Modify `addBooking` action to calculate total price based on daily rate and number of days.
    - [x] Update `BookingRequestForm` to collect date range and display per-day rates and calculated total.
    - [x] Ensure `ContractorProfileServiceManager` labels clarify "price per day".
- [x] Enhance booking form to support multiple service selections
  - [x] Update `Booking` interface to support multiple services array
  - [x] Modify booking form UI to allow selecting multiple services
  - [x] Update total price calculation based on selected services and their payment types
  - [x] Update booking/gig detail views to display selected services
- [x] Update contractor profile modal to show all service offerings with correct payment type and price for clients
- [ ] (TODO) Update net proceeds calculations for contractors to use their specific service prices.
- [x] Remove redundant service management page: `app/dashboard/contractor/services/page.tsx` and its component `app/dashboard/contractor/services/components/contractor-service-management.tsx`.

### 6. Booking & Calendar Features
- [ ] Implement booking creation and status tracking
- [ ] Contractor approval flow for bookings
- [x] Build contractor availability calendar (set unavailable days)
- [ ] Display contractor calendar to clients
- [ ] Booking status updates (pending, approved, completed, cancelled)
- [x] Booking detail view for both client and contractor
- [x] Emergency booking cancellation for both clients and contractors after approval
- [x] Add time selection to booking form and display time information in booking details
- [x] Display booking duration in hours based on start and end times
- [x] Automatically add approved gig dates to contractor's unavailable calendar
  - When a contractor approves a gig, the date range is automatically added to their unavailable dates
  - When a gig is cancelled, the dates are removed from the contractor's unavailable calendar
  - This prevents double-booking and keeps contractor availability accurate

### 7. Payments (Stripe)
- [x] Integrate Stripe for client payments
- [ ] Hold payment in escrow until gig completion
- [x] Release payment to contractor upon completion
- [ ] Payment status tracking in booking flow
- [ ] Payment history for contractors
- [x] Implement platform fees: 5% for first three months, 10% after (Updated fee structure to deduct from contractor payment instead of platform account)
- [ ] Implement tier-based payment structure (entry, vet assistant, CVT)
- [ ] Add coupon system for discounts
- [x] Fix payment intent capture API missing bookingId parameter (production 400 error)

### 8. Admin/Owner Features
- [x] Protected admin route for reviewing contractor applications
- [x] Approve/reject contractor applications
- [ ] Initiate onboarding for approved contractors
- [x] Manage contractors and bookings overview
- [x] Contractor management page (remove contractors, view payouts summary)
- [x] Bookings summary with metrics and visualizations
- [x] Add admin navigation links for admin users
- [x] Admin services management page for adding/editing/removing platform services
- [x] Redesign contractor applications page for better readability and professional appearance
  - Clean, modern card-based layout with proper visual hierarchy
  - Organized sections for contact info, experience, education, certifications, and references
  - Better formatting for dates, experience entries, and education details
  - Improved action buttons and status indicators
  - Enhanced search functionality including phone number search
  - Application counts in filter buttons for better overview
- [ ] Manage Clients
- [ ] Add phone number filter to contractor application filters
- [ ] Add coupon management to pricing page

### 9. Notifications & Reviews
- [ ] Set up email notifications for booking creation, updates, and completion (clients & contractors)
- [ ] Prompt clients for review/rating after gig completion
- [ ] Store and display contractor ratings
- [x] Allow contractors to leave feedback on reviews (one-time response per review)
  - Updated Rating interface to include optional contractorFeedback field
  - Created saveContractorFeedback function in Firebase contractors module
  - Enhanced contractor reviews page with feedback form and display
  - Updated contractor profile modal to show contractor responses to reviews
  - Contractors can now respond to client reviews once per review with professional feedback
- [x] Fix invalid date display in contractor reviews
  - Fixed saveBookingReview function to use correct 'date' field instead of 'createdAt' for contractor ratings
  - Added date validation and fallback display for invalid dates in contractor profile modal and reviews page
  - Ensures review dates display properly instead of showing "Invalid Date"
- [x] Implement internal messaging system for client-contractor communication (Contextual)
  - [x] Define messaging data structures (TypeScript interfaces)
  - [x] Implement Firebase server actions for chat and message CRUD operations
  - [x] Create UI for individual chat view (`/dashboard/messages/[chatId]`)
  - [x] Integrate booking status check to enable/disable chat input
  - [x] Add "Message" buttons to client bookings and contractor gigs lists
  - [x] Implement real-time message updates (optional, consider for v2)
  - [x] Implement unread message indicators in chat view (implicitly via markAsRead)
  - [x] Add profile and booking details modal when clicking on user avatars in chat
  - [x] Modernize messaging UI/UX with Instagram/Facebook/Twitter/Airbnb/Coinbase-inspired design
    - Redesigned chat list with modern card-based layout, hover effects, and improved visual hierarchy
    - Enhanced message bubbles with modern rounded design, better spacing, and improved readability
    - Added modern chat header with user status and improved navigation
    - Implemented Instagram-style message input with rounded design and enhanced send button
    - Enhanced avatar displays with gradient fallbacks, online indicators, and hover effects
    - Modernized empty states with engaging illustrations and clear messaging
    - Fixed user profile modal logic to correctly identify clients vs contractors
    - Added smooth transitions, hover animations, and modern interaction patterns
    - Improved responsive design for all device sizes with modern messaging interface
    - Enhanced loading states with modern skeleton animations matching the new design

### 10. FAQ & Resource Section
- [ ] Create FAQ page for clients and contractors
- [ ] Add resource links and helpful guides

### 11. Marketing & Launch Prep
- [ ] Add company branding (logos, client photos)
- [ ] Prepare landing page for local marketing
- [ ] Set up Facebook/Instagram ad campaign tracking (if feasible)
- [ ] Prepare for event/booth marketing (print materials, info page)

### 12. Additional Features
- [x] Add Google Calendar button to contractor gig cards (shows on all gigs)
- [x] Remove debugging from client-side bookings page cards
- [x] Restyle both contractor and client cards for a more refined, Material Design-inspired look
- [x] Make the Edit Profile button (view mode) and Save/Cancel buttons (edit mode) always fixed at the bottom of the contractor profile page, with proper padding and responsiveness.
- [x] Refine contractor gigs page and details modal layout to match client-side booking details modal structure and visual hierarchy
- [x] Refine contractor payments details modal to match style of gigs and bookings modals
- [x] Add payment confirmation modal for client "Mark as completed" action
  - Created payment confirmation modal that shows before processing payment
  - Displays total amount, service date, contractor name, services breakdown, payment method, and fee breakdown
  - Provides clear confirmation before payment is captured
  - Improves user experience by showing exactly what they're paying for

---

(Each task should be checked off as completed. Tasks are grouped by feature area for clarity and project management.)
