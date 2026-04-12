'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

const STATUS_COPY: Record<string, { title: string; description: string; tone: 'success' | 'warning' | 'error' | 'info' }> = {
  'payment-released': {
    title: 'Payment released',
    description: 'Thanks for confirming the completed service. We released payment to your contractor and updated the booking for you.',
    tone: 'success',
  },
  'payment-release-failed': {
    title: 'Payment could not be released',
    description: 'We could not complete the payment release from this link. Please open your booking to try again.',
    tone: 'error',
  },
  'payment-reauth-required': {
    title: 'Payment method needs attention',
    description: 'Your payment method needs to be updated before payment can be released. Open your booking to update it.',
    tone: 'warning',
  },
  'already-completed': {
    title: 'Already completed',
    description: 'This booking was already completed, so there is nothing else you need to do.',
    tone: 'info',
  },
  'invalid-link': {
    title: 'This link is not valid',
    description: 'The email link is invalid or has expired. Open your bookings to review the service there instead.',
    tone: 'error',
  },
  'booking-not-found': {
    title: 'Booking not found',
    description: 'We could not find that booking. Please sign in and review your bookings directly.',
    tone: 'error',
  },
  'not-ready': {
    title: 'Not ready yet',
    description: 'This booking is not currently eligible for payment release.',
    tone: 'info',
  },
}

function getToneClasses(tone: 'success' | 'warning' | 'error' | 'info') {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (tone === 'error') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-blue-200 bg-blue-50 text-blue-700'
}

function BookingCompletionContent() {
  const searchParams = useSearchParams()
  const { isSignedIn } = useUser()
  const status = searchParams.get('status') || 'not-ready'
  const bookingId = searchParams.get('bookingId') || ''
  const copy = STATUS_COPY[status] || STATUS_COPY['not-ready']
  const dashboardHref = bookingId ? `/dashboard/bookings?bookingId=${bookingId}` : '/dashboard/bookings'
  const signInHref = bookingId
    ? `/sign-in?redirect_url=${encodeURIComponent(dashboardHref)}`
    : '/sign-in'

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50 px-4 py-16 sm:px-6">
      <div className="mx-auto flex max-w-xl flex-col rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
        <div className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getToneClasses(copy.tone)}`}>
          Booking update
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
          {copy.title}
        </h1>

        <p className="mt-3 text-base leading-7 text-slate-600">
          {copy.description}
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Need to review the booking details, leave a review, or update your payment method? You can open your booking dashboard below.
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="pill" className="sm:flex-1">
            <Link href={isSignedIn ? dashboardHref : signInHref}>
              {isSignedIn ? 'Open My Booking' : 'Sign In to View Booking'}
            </Link>
          </Button>
          <Button asChild variant="outline" size="pill" className="sm:flex-1">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

export default function BookingCompletionPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
            <p className="text-sm font-medium text-slate-500">Loading booking update...</p>
          </div>
        </main>
      }
    >
      <BookingCompletionContent />
    </Suspense>
  )
}
