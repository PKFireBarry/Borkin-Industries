# Project Requirements Document (PRD): Borkin Industries Platform

##TODO
 - add cert image to application 
 - add phone number to application filters on admin side of app
 - [x] Update phone number across all email notifications and website pages to 352-340-3659
 - [x] Simplify email notifications to only include homepage link instead of specific dashboard routes
 - implement tier-based payment structure (entry, vet assistant, CVT) for pricing page on admin side
 - add pricing page to admin dashboard
 - add coupons to admin dashboard in the pricing page
 - [x] implement platform fees: 5% base fee for first three months, then 10% base fee after 3 months
 - [x] add internal messaging system for client-contractor communication about gigs (Backend Started)
 - [x] Shift fee structure: clients now pay platform and processing fees, contractors receive full service amount
 - [x] Fix email notification issues: update payment collection messaging, contractor earnings display, missing template functions, and remove unnecessary fee messaging

## Coupon System Implementation

### Data Model & Database
- [x] Design coupon data model in Firebase (Firestore)
  - [x] Create `coupons` collection with fields: code, name, type (fixed_price/percentage), value, contractorId (optional), expirationDate (optional), description, isActive
  - [x] Add coupon validation rules and indexes
  - [x] Create TypeScript interfaces for coupon types
- [x] Update booking data model to include coupon information
  - [x] Add couponCode, couponDiscount, originalPrice fields to booking schema
  - [x] Update booking calculation logic to handle coupon discounts

### Admin Dashboard - Coupon Management
- [x] Create coupon management page in admin dashboard
  - [x] Add coupon management section to admin navigation
  - [x] Create coupon list view with search and filter functionality
  - [x] Implement coupon creation form with all required fields
  - [x] Add coupon editing and deletion functionality
  - [x] Create coupon usage analytics and history view
- [x] Implement coupon CRUD operations
  - [x] Create server actions for coupon management
  - [x] Add API endpoints for coupon operations
  - [x] Implement coupon validation and business logic

### Booking Flow Integration
- [x] Add coupon input to booking request form
  - [x] Create coupon code input field with validation
  - [x] Implement real-time coupon validation and price calculation
  - [x] Display coupon discount in booking summary
- [x] Update booking calculation logic
  - [x] Modify price calculation to handle fixed price coupons
  - [x] Implement percentage discount calculation for site-wide coupons
  - [x] Update tax calculation to apply after coupon discount
- [x] Add coupon management to existing bookings
  - [x] Allow adding/removing coupons from pending bookings
  - [x] Implement price recalculation when coupons are added/removed
  - [x] Update Stripe PaymentIntent when coupon changes

### Contractor Dashboard Integration
- [x] Add coupon display to contractor profile
  - [x] Show available coupons for contractor in profile page
  - [x] Display coupon codes and descriptions for contractor reference
  - [x] Add coupon usage tracking for contractor-specific coupons
- [x] Add coupon information to contractor dashboard displays
  - [x] Show coupon information in contractor dashboard home page booking cards
  - [x] Display coupon information in contractor gigs page booking cards
  - [x] Add coupon information to user profile modal booking details
  - [x] Show coupon information in client dashboard booking cards

### Payment & Stripe Integration
- [x] Update payment flow to handle coupons
  - [x] Modify PaymentIntent creation to include coupon information
  - [x] Update payment capture logic for coupon-adjusted amounts
  - [x] Handle coupon validation in payment processing
- [x] Update payout calculations for contractors
  - [x] Ensure contractor payouts reflect coupon-adjusted amounts
  - [x] Update platform fee calculations for coupon scenarios

### UI/UX Enhancements
- [x] Design coupon input interface
  - [x] Create modern coupon code input with validation feedback
  - [x] Design coupon discount display in booking summary
  - [x] Add coupon removal functionality with clear visual feedback
- [x] Update booking modals and forms
  - [x] Integrate coupon functionality into existing booking modals
  - [x] Update edit services modal to handle coupon changes
  - [x] Enhance booking details display to show coupon information

### Testing & Validation
- [x] Implement comprehensive coupon testing
  - [x] Test fixed price coupon scenarios
  - [x] Test percentage discount scenarios
  - [x] Test contractor-specific coupon validation
  - [x] Test coupon expiration and usage limits
  - [x] Test coupon removal and price reversion
- [x] Validate payment flow with coupons
  - [x] Test PaymentIntent creation with coupons
  - [x] Test payment capture with coupon-adjusted amounts
  - [x] Test contractor payout calculations
- [x] Fix coupon calculation issues
  - [x] Fix date parsing issues in edit modal causing "Invalid Date" display
  - [x] Fix coupon calculation logic for fixed_price coupons in edit modal
  - [x] Fix coupon calculation logic for percentage coupons in edit modal
  - [x] Update booking update function to properly handle coupon calculations
- [x] Fix contractor profile loading issues
  - [x] Handle missing Firebase index for coupon queries gracefully
  - [x] Implement fallback query for coupons when index doesn't exist
  - [x] Make profile loading resilient to individual data fetch failures
  - [x] Prevent profile loading from failing due to coupon query errors

### Documentation & Analytics
- [x] Add coupon usage tracking
  - [x] Implement coupon usage analytics in admin dashboard
  - [x] Track coupon performance and effectiveness
  - [x] Add coupon usage reporting with client and contractor names
- [ ] Update documentation
  - [ ] Document coupon system for admin users
  - [ ] Update API documentation for coupon endpoints
  - [ ] Create user guides for coupon functionality

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
- [ ] Implement profile update form
- [x] Build pet management UI (add/edit/remove pets)
- [x] Add pet profile fields: medications, amount of food, allergies, need-to-know information
- [x] Add animal type and feeding schedule to pets
- [x] Add breed and weight fields to pet profiles
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
- [x] Booking status display in dashboard
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
- [x] Fix edit services modal date handling: properly display and update end dates, format dates correctly for HTML inputs, and show both start/end dates for better UX
- [x] Simplify edit services flow: remove immediate payment processing, only update booking amounts and details. Payment collection now only happens at booking completion when both client and contractor mark as completed
- [x] Restore modern styling for edit services modal: professional headers, enhanced date section, modern service cards, and improved overall UX to match new booking modal design standards
- [x] Refine dashboard navigation layout to be fully responsive and collapsible for all device types
- [x] Create reusable PhotoUpload component
- [x] Integrate PhotoUpload into client profile, contractor profile, and pet management
- [x] Implement enhanced image cropping system with responsive design
  - [x] Create ImageCropper component with interactive cropping interface
  - [x] Add zoom, rotation, and drag controls for precise image editing
  - [x] Implement aspect ratio constraints and quality settings
  - [x] Add touch support for mobile devices
  - [x] Create responsive image components for optimal display across all devices
  - [x] Enhance Avatar component with object positioning controls
  - [x] Add image processing utilities for resizing, cropping, and format conversion
  - [x] Update all profile forms to use enhanced cropping features
  - [x] Implement fallback handling and error recovery for images
  - [x] Add loading states and progressive enhancement
- [x] Update forms to save/display photo URLs

### 5. Contractor Application & Onboarding
- [x] Build contractor application form (resume, experience, education, address, driving range, certifications, references)
- [x] Store application data in Firebase
- [x] Notify admin of new application
- [x] Admin review UI for applications (approve/reject)
- [x] Onboarding flow for approved contractors (legal docs, email setup instructions)
- [x] Contractor dashboard: profile update, experience/skills, availability calendar
- [x] Show available gigs and allow contractor to accept/decline
- [x] Display work/payment history and reviews
- [x] Modernize contractor dashboard home page UI/UX with comprehensive overview
  - Implemented modern SaaS-style dashboard with stats cards showing total gigs, earnings, ratings, and monthly performance
  - Added payout account status card with Stripe Connect integration display
  - Created recent reviews section with star ratings and client feedback preview
  - Built recent/upcoming gigs section with client information and booking details
  - Added quick action cards for profile management, availability, and messaging
  - Enhanced with modern gradient backgrounds, hover effects, and responsive design
  - Applied consistent styling patterns matching Facebook, Instagram, Twitter, Airbnb, and Coinbase aesthetics
  - Integrated comprehensive data fetching for contractor profile, bookings, and client information
- [x] Modernize contractor reviews page UI/UX with cohesive SaaS styling
  - Redesigned with modern gradient backgrounds and glass morphism effects
  - Added comprehensive stats cards showing average rating, total reviews, response rate, and 5-star reviews
  - Enhanced review cards with improved typography, better spacing, and hover animations
  - Improved feedback form with better visual hierarchy and professional styling
  - Added visual indicators for contractor responses with distinct blue styling
  - Enhanced empty state with actionable tips for contractors
  - Implemented responsive design with mobile-first approach
  - Added proper loading states and error handling with modern UI patterns
- [x] Modernize home page UI/UX with cohesive SaaS styling across all components
  - **HeroSection**: Redesigned with modern gradient backgrounds, enhanced logo presentation with floating badge, improved CTA buttons with gradients and animations, added trust indicators, animated wave background with fluid motion, and enhanced floating bubble icons with improved visibility and glow effects
  - **Header**: Implemented fixed positioning with glass morphism, enhanced logo with hover effects, improved navigation with modern mobile menu overlay, upgraded auth buttons with gradient styling
  - **About**: Enhanced with modern gradient backgrounds, improved image presentation with decorative elements, redesigned quote section with professional styling, added feature cards with hover effects and icons
  - **WhyChooseUs**: Modernized stats cards with icons and gradient colors, enhanced feature cards with improved visual hierarchy, redesigned scheduling section with glass morphism container
  - **TeamSection**: Completely modernized founder profile with sophisticated gradient backgrounds, enhanced image presentation with floating badges and animations, added comprehensive stats cards, professional quote section with gradient styling, and improved responsive design
  - **Contact**: Redesigned with modern SaaS styling, enhanced contact methods with interactive cards and hover effects, improved form presentation with backdrop blur, added response time indicators, and professional visual hierarchy
  - **Footer**: Transformed with dark gradient background, comprehensive company information with trust indicators, enhanced contact information with icon-based layout, animated elements, and professional bottom bar
  - Applied consistent design patterns matching Facebook, Instagram, Twitter, Airbnb, and Coinbase aesthetics
  - Implemented modern animations, hover effects, and micro-interactions throughout
  - Enhanced responsive design with mobile-first approach and proper breakpoints
  - Added professional loading states, transitions, and visual feedback elements
  - Achieved complete visual cohesion across all home page components
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
- [x] (TODO) Update net proceeds calculations for contractors to use their specific service prices.
- [x] Remove redundant service management page: `app/dashboard/contractor/services/page.tsx` and its component `app/dashboard/contractor/services/components/contractor-service-management.tsx`.

### 6. Booking & Calendar Features

- [x] Build contractor availability calendar (set unavailable days)
- [x] Display contractor calendar to clients
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
- [x] Release payment to contractor upon completion
- [x] Payment status tracking in booking flow
- [x] Payment history for contractors
- [x] Implement platform fees: 5% for first three months, 10% after (Updated fee structure to deduct from contractor payment instead of platform account)
- [ ] Add coupon system for discounts
- [x] Fix payment intent capture API missing bookingId parameter (production 400 error)

### 8. Admin/Owner Features
- [x] Protected admin route for reviewing contractor applications
- [x] Approve/reject contractor applications
- [x] Initiate onboarding for approved contractors
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
- [x] Set up email notifications for booking creation, updates, and completion (clients & contractors)
  - [x] Implemented Nodemailer with Gmail SMTP configuration
  - [x] Created email service utility with professional HTML templates
  - [x] Built contact form API endpoint with email validation
  - [x] Updated Contact component with functional contact form
  - [x] Added auto-reply functionality for customer confirmation emails
  - [x] Created test endpoints and components for email verification
- [x] Add booking updated email notification for contractors when clients edit booking services or dates
  - [x] Created services-updated email template with before/after service comparison
  - [x] Implemented API endpoint for sending booking updated notifications
  - [x] Integrated notification sending into booking edit flow for both service and date changes
  - [x] Added professional email styling with clear action items for contractors
  - [x] Updated template to handle both service changes and date/time changes
  - [x] Enhanced template to show date changes with before/after comparison
  - [x] Updated language to be generic ("Changes Made") instead of service-specific
  - [x] Improved visual organization with separate sections for schedule and service changes
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
- [x] Modernize contractor profile page UI/UX with sleek, social media-inspired design
  - Implemented modern gradient backgrounds and glass morphism effects
  - Added hero profile card with large avatar and rating badge overlay
  - Enhanced contact information display with icons and proper typography
  - Created skill badges with modern rounded styling and color coding
  - Organized content into sectioned cards with visual hierarchy using colored accent bars
  - Updated edit mode with modern form styling, rounded corners, and proper focus states
  - Added responsive design patterns and mobile-first approach
  - Integrated professional status messages and loading states
  - Applied consistent styling conventions matching Twitter/Facebook/Instagram aesthetics
- [x] Modernize contractor gigs page UI/UX with professional, clean design
  - Implemented modern gradient backgrounds and sticky header with backdrop blur
  - Enhanced gig cards with improved visual hierarchy and hover effects
  - Added professional status badges with icons and better color coding
  - Improved payment information display with clear net payout visibility
  - Enhanced action buttons with loading states and better visual feedback
  - Modernized gig details modal with improved layout and information organization
  - Added professional empty state with helpful messaging
  - Implemented smooth transitions and animations throughout
  - Applied modern design patterns similar to Twitter, Instagram, Facebook, Coinbase, and Airbnb
- [x] Add payment confirmation modal for client "Mark as completed" action
  - Created payment confirmation modal that shows before processing payment
- [x] Modernize client booking modals UI/UX with professional, cohesive design
- Redesigned new booking modal with modern gradient backgrounds, enhanced header with icons, improved form layout with sectioned cards
- Updated edit services modal with professional styling, modern service selection cards, enhanced visual hierarchy
- Applied consistent design patterns matching OpenAI, Facebook, Instagram, AirBnB, and Coinbase aesthetics
- Enhanced booking request form with modern card-based layout, improved service selection interface, and professional styling
- Added modern icons, gradients, shadows, and hover effects throughout the booking flow
- Improved responsive design with mobile-first approach and proper visual feedback
- [x] Replace dual date inputs with single calendar date range picker for booking form
- Created custom DateRangePicker component with modern calendar interface and range selection
- Implemented click-to-select-range functionality where users click start and end dates on one calendar
- Added visual range highlighting, hover effects, and professional styling matching the booking form design
- Updated booking request form to use the new date range picker instead of separate start/end date inputs
- Enhanced user experience with intuitive date selection and improved visual feedback
- [x] Add similar calendar interface to edit services modal for end date selection
- Created custom EndDatePicker component for selecting end dates with a fixed start date
- Replaced basic HTML date input with modern calendar interface in edit services modal
- Added visual range display showing service period from start to selected end date
- Enhanced edit services modal layout with two-column design: calendar on left, time/summary on right
- Improved user experience with consistent calendar interface across booking and editing flows
  - Displays total amount, service date, contractor name, services breakdown, payment method, and fee breakdown
  - Provides clear confirmation before payment is captured
  - Improves user experience by showing exactly what they're paying for
- [x] Fix "RangeError: Invalid time value" in contractor dashboard
  - Added safe date formatting function to prevent crashes when invalid dates are encountered
  - Updated contractor dashboard to use proper date validation for booking dates and review dates
  - Enhanced error handling to gracefully display fallback text instead of throwing RangeError
  - Ensures contractor dashboard loads properly on all devices and environments
- [x] Fix payment flow and PaymentIntent status issues
  - Fixed payment confirmation modal showing at wrong time (was showing when client marked complete, now only shows when both parties complete)
  - Updated payment capture API to handle both 'requires_confirmation' and 'requires_capture' statuses
  - Separated "Mark Complete" action from payment release - clients now simply mark completion without payment modal
  - Payment confirmation modal now only appears when both client and contractor have marked gig complete
  - Updated modal title and messaging to reflect "Release Payment" instead of "Confirm Payment"
  - Enhanced error handling for PaymentIntent confirmation and capture flow
  - Fixed PaymentIntent confirmation requiring return_url by adding proper return URL and preventing redirect-based payment methods
  - Updated all PaymentIntent creation endpoints to use automatic_payment_methods with allow_redirects: 'never'
  - Added support for 'requires_payment_method' status to handle declined cards after verification
  - Enhanced error messages to guide users when payment method re-authorization is needed
  - Fixed PaymentIntent missing payment method issue by automatically attaching customer's default payment method
  - Improved payment method recovery flow when original payment method becomes detached after decline

---

(Each task should be checked off as completed. Tasks are grouped by feature area for clarity and project management.)
