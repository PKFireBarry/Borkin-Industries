# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev --turbopack`: Start development server with Turbopack (runs on port 3000)
- `npm run build`: Build production version
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

### Testing
- No test suite currently configured in package.json

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Styling**: Tailwind CSS 4 with custom design system
- **Authentication**: Clerk (user management and authentication)
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Payments**: Stripe integration
- **Email**: Nodemailer for notifications
- **Maps**: Leaflet with react-leaflet
- **Animations**: Framer Motion

### Project Structure
- `app/`: Next.js 15 App Router pages and API routes
  - `api/`: Server-side API endpoints organized by feature
  - `dashboard/`: Admin dashboard pages
  - `forms/`: Form-related pages and components
- `components/`: Reusable React components
  - `ui/`: shadcn/ui component library
  - `forms/`: Form-specific components
- `lib/`: Utility libraries and configurations
  - `auth/`: Clerk authentication utilities
  - `data/`: Database operations and Firebase setup
  - `email/`: Email notification system
  - `firebase/`: Firebase configuration and helpers
  - `pdf/`: PDF generation utilities
  - `utils/`: General utility functions
- `types/`: TypeScript type definitions
- `firebase.ts`: Main Firebase configuration

### Authentication & Authorization
- Uses Clerk for authentication with role-based access
- Three main user roles: admin, contractor, client
- Protected routes with middleware-based authorization
- BanCheck component prevents banned users from accessing the platform

### Database Design
- Firebase Firestore as primary database
- Collections include: users, bookings, contractors, coupons, messages
- Real-time updates for messaging and booking status changes
- Geographic queries for location-based contractor matching

### Payment System
- Stripe integration for payment processing
- Platform fee structure: 5% for first 3 months, 10% thereafter
- Clients pay all fees, contractors receive full service amount
- Coupon system with fixed price and percentage discounts
- Payment intents use manual capture method
- **CRITICAL**: Always use `getBaseAppUrl()` from `lib/utils.ts` for Stripe `return_url` parameters - never use `process.env.NEXT_PUBLIC_APP_URL` directly, as it ensures proper `https://` scheme formatting

### Email Notifications
- Nodemailer-based email system in `lib/email/`
- Automated notifications for booking status changes
- Template-based emails with consistent branding
- Includes unsubscribe functionality

### UI/UX Design System
- Comprehensive styling conventions in STYLING_CONVENTIONS.md
- Consistent color palette using CSS custom properties
- Glass morphism effects with backdrop-blur
- Mobile-first responsive design
- Accessibility patterns with proper ARIA labels
- Loading states and skeleton screens

### Key Features
- Pet care service booking platform
- Contractor discovery with map integration
- Real-time messaging between clients and contractors
- Admin dashboard for platform management
- Coupon and discount system
- Multi-tier contractor pricing (entry, vet assistant, CVT)
- PDF generation for documents (W-9 forms, contracts)

## Development Guidelines

### Code Style
- Follow TypeScript strict mode conventions
- Use functional components with hooks
- Prefer named exports for components
- Use early returns for better readability
- ESLint configured with Next.js and TypeScript rules

### Component Organization
1. Hooks at the top
2. Effects after hooks
3. Event handlers
4. Early returns for loading/error states
5. Main render logic

### Styling Approach
- Use Tailwind CSS with consistent spacing and color patterns
- Follow responsive design patterns from STYLING_CONVENTIONS.md
- Implement proper dark mode support
- Use backdrop-blur for modern glass effects

### Firebase Integration
- Use provided Firebase utilities in lib/firebase/
- Handle real-time subscriptions properly with cleanup
- Implement proper error handling for database operations
- Follow Firebase security rules for data access

### URL Handling
- **Always use `getBaseAppUrl()`** from `lib/utils.ts` when constructing absolute URLs for external services (Stripe, emails, etc.)
- `getBaseAppUrl()` automatically ensures URLs have proper `https://` scheme via `ensureUrlScheme()`
- Never directly interpolate `process.env.NEXT_PUBLIC_APP_URL` in external API calls
- For emails and third-party integrations, use `getBaseAppUrl()` to prevent URL scheme errors

### Task Management
- Update TASKS.md when completing features or major changes
- Mark completed items with [x] in the task list
- Break down large features into smaller, trackable tasks

## Important Files
- `global_rules.md`: Development guidelines and best practices
- `STYLING_CONVENTIONS.md`: Comprehensive UI/UX styling guide
- `TASKS.md`: Current project tasks and feature completion status
- `firebase.ts`: Main Firebase configuration
- `middleware.ts`: Route protection and authentication middleware
- `components.json`: shadcn/ui configuration