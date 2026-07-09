"use client"

import { Suspense, useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import {
  Activity,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Plus,
  Receipt,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { getClientProfile } from '@/lib/firebase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { DashboardPageContent, DashboardPageHeader, DashboardPageShell } from '../components/dashboard-shell'
import { RailDots } from '../components/rail-dots'
import { useRequireRole } from '../use-require-role'
import { useRailScroll } from '@/hooks/use-rail-scroll'

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

interface PaymentHistory {
  id: string
  amount: number
  currency: string
  status: string
  created: number
  description?: string
  metadata?: Record<string, string>
}

interface CompletedBooking {
  id: string
  contractorName: string
  serviceType: string
  startDate: string
  endDate: string
  date?: string
  paymentAmount: number
  platformFee?: number
  stripeFee?: number
  netPayout?: number
}

interface PaymentData {
  payments: PaymentHistory[]
  completedBookings: CompletedBooking[]
  totalSpent: number
  totalBookings: number
}

const EMPTY_PAYMENT_DATA: PaymentData = {
  payments: [],
  completedBookings: [],
  totalSpent: 0,
  totalBookings: 0,
}

const brandThemes: Record<
  string,
  {
    shell: string
    top: string
    badge: string
    icon: string
  }
> = {
  visa: {
    shell: 'border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-indigo-50',
    top: 'from-blue-600 via-indigo-600 to-blue-700',
    badge: 'border-blue-200 bg-blue-100 text-blue-700',
    icon: 'bg-blue-100 text-blue-700',
  },
  mastercard: {
    shell: 'border-pink-200/80 bg-gradient-to-br from-rose-50 via-white to-pink-50',
    top: 'from-pink-500 via-rose-500 to-red-500',
    badge: 'border-pink-200 bg-pink-100 text-pink-700',
    icon: 'bg-pink-100 text-pink-700',
  },
  amex: {
    shell: 'border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-blue-50',
    top: 'from-indigo-600 via-blue-700 to-indigo-800',
    badge: 'border-indigo-200 bg-indigo-100 text-indigo-700',
    icon: 'bg-indigo-100 text-indigo-700',
  },
  discover: {
    shell: 'border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-yellow-50',
    top: 'from-amber-500 via-yellow-500 to-amber-600',
    badge: 'border-amber-200 bg-amber-100 text-amber-700',
    icon: 'bg-amber-100 text-amber-700',
  },
  default: {
    shell: 'border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-100',
    top: 'from-slate-700 via-slate-800 to-slate-900',
    badge: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: 'bg-slate-100 text-slate-700',
  },
}

function getBrandTheme(brand?: string) {
  return brandThemes[brand?.toLowerCase() || 'default'] || brandThemes.default
}

function formatExpiry(month: number, year: number) {
  if (!month || !year) return 'MM/YY'
  return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`
}

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatBookingDate(dateString?: string) {
  if (!dateString) return 'Date unavailable'

  const parsedDate = new Date(dateString)
  if (Number.isNaN(parsedDate.getTime())) return 'Date unavailable'

  return parsedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function PaymentsPageContent() {
  const { isLoaded, isAuthorized } = useRequireRole('client')
  const { user } = useUser()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [paymentData, setPaymentData] = useState<PaymentData>(EMPTY_PAYMENT_DATA)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false)
  const overviewBookings = paymentData.completedBookings.slice(0, 3)
  const { railRef: paymentRailRef, clampedDotIndex: paymentRailDotIndex, onScroll: handlePaymentRailScroll } = useRailScroll({
    slideSelector: '[data-payment-activity-slide="true"]',
    itemCount: overviewBookings.length,
  })

  useEffect(() => {
    async function fetchData() {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        const profile = await getClientProfile(user.id)

        if (!profile?.stripeCustomerId) {
          setHasStripeCustomer(false)
          setMethods([])
          setPaymentData(EMPTY_PAYMENT_DATA)
          return
        }

        setHasStripeCustomer(true)

        const methodsRes = await fetch('/api/stripe/list-payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: profile.stripeCustomerId }),
        })

        if (!methodsRes.ok) {
          throw new Error('Failed to fetch payment methods')
        }

        const methodsData = await methodsRes.json()
        setMethods(methodsData.paymentMethods || [])

        try {
          const historyRes = await fetch('/api/stripe/list-client-payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: profile.stripeCustomerId,
              clientId: user.id,
            }),
          })

          if (!historyRes.ok) {
            throw new Error('Failed to fetch payment history')
          }

          const historyData = await historyRes.json()
          setPaymentData({
            payments: historyData.payments || [],
            completedBookings: historyData.completedBookings || [],
            totalSpent: historyData.totalSpent || 0,
            totalBookings: historyData.totalBookings || 0,
          })
        } catch (historyError) {
          console.error('[payments] payment history failed, using empty data:', historyError)
          setPaymentData(EMPTY_PAYMENT_DATA)
        }
      } catch (err) {
        console.error('[payments] failed to load payment data:', err)
        setError('We could not load your payment details right now.')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [user])

  async function handleManagePayments() {
    try {
      const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create portal session')

      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      console.error('[payments] failed to redirect to Stripe portal:', err)
      setError('We could not open the Stripe billing portal right now.')
    }
  }

  if (!isLoaded || !isAuthorized) return null

  const primaryMethod = methods.find((method) => method.isDefault) || methods[0]
  const recentBookings = paymentData.completedBookings.slice(0, 4)
  const latestCompletedBooking = paymentData.completedBookings[0]
  const setupReady = methods.length > 0
  const setupBadgeLabel = setupReady ? 'Ready for checkout' : hasStripeCustomer ? 'Needs a saved card' : 'Setup needed'
  const paymentMethodsLabel = methods.length === 1 ? '1 saved card on file' : `${methods.length} saved cards on file`
  return (
    <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <DashboardPageContent className="space-y-4 pb-12 sm:space-y-6 lg:space-y-7">
        <DashboardPageHeader
          variant="summary"
          title="Payments"
          description="Save a card for faster booking checkout, keep an eye on recent charges, and jump into Stripe if you need to update billing details."
          surfaceClassName="from-white via-blue-50/90 to-indigo-50/90"
          eyebrow={
            <>
              <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
                Client payments
              </Badge>
              <Badge className={cn('rounded-full px-2.5 py-1 text-[11px] sm:text-xs', setupReady ? 'border-green-200 bg-green-100 text-green-700' : 'border-amber-200 bg-amber-100 text-amber-700')}>
                {setupBadgeLabel}
              </Badge>
            </>
          }
          actions={
            <Button variant="petCta" size="pill" onClick={handleManagePayments} leftIcon={<Plus className="h-4 w-4" />} className="w-full sm:w-auto">
              {setupReady ? 'Manage Payment Methods' : 'Set Up Payments'}
            </Button>
          }
          meta={
            <div className="flex flex-wrap gap-2">
              <Badge className="border-blue-200 bg-blue-100 text-blue-700">{paymentMethodsLabel}</Badge>
              <Badge className="border-blue-200 bg-white text-slate-700">{primaryMethod ? `Primary •••• ${primaryMethod.last4}` : 'No primary card yet'}</Badge>
              <Badge className="border-green-200 bg-green-100 text-green-700">Spent {formatCurrency(paymentData.totalSpent)}</Badge>
              <Badge className="border-purple-200 bg-purple-100 text-purple-700">{paymentData.totalBookings} completed booking{paymentData.totalBookings === 1 ? '' : 's'}</Badge>
              {latestCompletedBooking ? (
                <Badge className="border-green-200 bg-green-100 text-green-700">
                  Latest charge {formatCurrency(latestCompletedBooking.paymentAmount)}
                </Badge>
              ) : null}
            </div>
          }
        />

        {loading ? (
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <div className="space-y-1">
                <p className="font-medium text-slate-900">Loading your payment hub</p>
                <p className="text-sm text-slate-500">Pulling cards, payment history, and booking totals.</p>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-200 bg-red-50 shadow-sm">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="space-y-1">
                <p className="font-semibold text-red-700">Payment details unavailable</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <Button variant="outline" size="pill" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm lg:w-fit">
              <TabsTrigger value="overview" className="rounded-xl px-3 py-2 text-xs sm:text-sm">
                <Activity className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="cards" className="rounded-xl px-3 py-2 text-xs sm:text-sm">
                <CreditCard className="h-4 w-4" />
                Cards
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl px-3 py-2 text-xs sm:text-sm">
                <Calendar className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              <div className={cn('grid grid-cols-1 gap-4 lg:gap-6', primaryMethod ? 'lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]' : 'lg:grid-cols-1')}>
                {primaryMethod ? (
                <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                      <div>
                        <CardTitle className="flex items-center justify-center gap-2 text-base font-bold text-slate-900 sm:justify-start sm:text-xl">
                          <ShieldCheck className="h-5 w-5 text-blue-600" />
                          Payment setup
                        </CardTitle>
                        <p className="mt-1 text-sm text-slate-500">Keep one dependable card ready for repeat bookings.</p>
                      </div>
                      {setupReady ? (
                        <Badge className="border-green-200 bg-green-100 text-green-700">Ready</Badge>
                      ) : (
                        <Badge className="border-amber-200 bg-amber-100 text-amber-700">Action needed</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={cn('rounded-[1.5rem] border p-4 shadow-sm sm:p-5', getBrandTheme(primaryMethod.brand).shell)}>
                        <div className={cn('rounded-[1.25rem] bg-gradient-to-r p-4 text-white shadow-lg sm:p-5', getBrandTheme(primaryMethod.brand).top)}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Primary method</p>
                              <p className="mt-2 text-xl font-bold capitalize sm:text-2xl">{primaryMethod.brand || 'Card'}</p>
                            </div>
                            <Badge className="border-white/20 bg-white/15 text-white">•••• {primaryMethod.last4}</Badge>
                          </div>
                          <div className="mt-8 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Expires</p>
                              <p className="mt-1 text-sm font-semibold sm:text-base">{formatExpiry(primaryMethod.expMonth, primaryMethod.expYear)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Cardholder</p>
                              <p className="mt-1 max-w-[10rem] truncate text-sm font-semibold sm:max-w-none sm:text-base">
                                {user?.fullName || 'Card Holder'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                          <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
                            <p className="font-semibold text-slate-900">Default checkout method</p>
                            <p className="mt-1 text-sm">This card is ready when you confirm future bookings.</p>
                          </div>
                          <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
                            <p className="font-semibold text-slate-900">Billing updates</p>
                            <p className="mt-1 text-sm">Open Stripe anytime to swap cards or review stored billing details.</p>
                          </div>
                        </div>
                      </div>
                  </CardContent>
                </Card>
                ) : null}

                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                      <div>
                        <CardTitle className="flex items-center justify-center gap-2 text-base font-bold text-slate-900 sm:justify-start sm:text-xl">
                          <Activity className="h-5 w-5 text-purple-600" />
                          Recent payment activity
                        </CardTitle>
                        <p className="mt-1 text-sm text-slate-500">Swipe through your latest three completed booking charges.</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {overviewBookings.length === 0 ? (
                      <div className="rounded-[1.5rem] border-2 border-dashed border-slate-300 bg-slate-50/80 p-6 text-center sm:p-8">
                        <Calendar className="mx-auto h-10 w-10 text-slate-400" />
                        <p className="mt-4 text-base font-semibold text-slate-900">No completed charges yet</p>
                        <p className="mt-2 text-sm text-slate-500">Once bookings are paid and completed, they will show up here.</p>
                      </div>
                    ) : (
                      <>
                        <div className="-mx-4 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
                          <div ref={paymentRailRef} onScroll={handlePaymentRailScroll} className="flex snap-x snap-mandatory gap-3 overscroll-x-contain overflow-x-auto scroll-px-[12vw] pl-[12vw] pr-[12vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 sm:scroll-px-7 sm:pl-7 sm:pr-7 xl:block xl:space-y-4 xl:overflow-visible xl:pl-0 xl:pr-0">
                            {overviewBookings.map((booking) => (
                              <Link
                                key={booking.id}
                                href={`/dashboard/bookings?bookingId=${booking.id}`}
                                data-payment-activity-slide="true"
                                className="block min-h-[14rem] w-[73vw] min-w-[15.25rem] max-w-[18.75rem] shrink-0 snap-center snap-always rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:min-h-[14.75rem] sm:w-[24.5rem] sm:max-w-none sm:p-4 xl:w-auto xl:min-w-0"
                              >
                                <div className="flex h-full flex-col justify-between gap-3 sm:gap-4">
                                  <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
                                    <div className="flex min-w-0 flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4">
                                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700 sm:mt-0.5 sm:h-10 sm:w-10">
                                        <DollarSign className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-green-700">Latest completed payment</p>
                                        <p className="mt-1 truncate text-[15px] font-semibold text-slate-900 sm:text-base">{booking.contractorName}</p>
                                        <p className="mt-1 text-[13px] text-slate-600 sm:text-sm">{booking.serviceType}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-2.5 text-center shadow-sm sm:text-left">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">Amount paid</p>
                                      <p className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{formatCurrency(booking.paymentAmount)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-2.5 text-center shadow-sm sm:text-left">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-purple-700">Service date</p>
                                      <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-900 sm:text-sm">{formatBookingDate(booking.startDate || booking.date)}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white/70 px-3 py-2">
                                    <Badge className="border-green-200 bg-green-100 text-green-700">Completed</Badge>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                        <RailDots count={overviewBookings.length} activeIndex={paymentRailDotIndex} />
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="cards" className="space-y-4 sm:space-y-6">
              {methods.length === 0 ? (
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardContent className="py-12 text-center sm:py-16">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-slate-900">No cards saved</p>
                    <p className="mt-2 text-sm text-slate-500">Add a card in Stripe to speed up future booking confirmations.</p>
                    <Button variant="petCta" size="pill" onClick={handleManagePayments} leftIcon={<Plus className="h-4 w-4" />} className="mt-5">
                      Add Payment Method
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {methods.map((method) => {
                    const theme = getBrandTheme(method.brand)

                    return (
                      <Card key={method.id} className={cn('overflow-hidden shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg', theme.shell)}>
                        <div className={cn('bg-gradient-to-r p-4 text-white sm:p-5', theme.top)}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Saved card</p>
                              <p className="mt-1.5 text-lg font-bold capitalize sm:text-xl">{method.brand || 'Card'}</p>
                            </div>
                            {method.isDefault ? (
                              <Badge className="border-white/20 bg-white/15 text-white">
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Default
                              </Badge>
                            ) : null}
                          </div>

                          <div className="mt-6 flex items-end justify-between gap-3 sm:mt-8">
                            <p className="font-mono text-base tracking-[0.18em] text-white sm:text-lg">•••• {method.last4}</p>
                            <p className="text-sm font-semibold text-white/90">{formatExpiry(method.expMonth, method.expYear)}</p>
                          </div>
                        </div>

                        <CardContent className="space-y-3 p-4 pt-4 sm:p-5 sm:pt-5">
                          <div className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/80 p-3">
                            <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', theme.icon)}>
                              <Wallet className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">Ready for booking checkout</p>
                              <p className="mt-1 text-sm leading-5 text-slate-500">Stored securely in Stripe and ready the next time you confirm care.</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge className={theme.badge}>Expires {formatExpiry(method.expMonth, method.expYear)}</Badge>
                            {method.isDefault ? <Badge className="border-green-200 bg-green-100 text-green-700">Primary method</Badge> : null}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                  <Card className="border-dashed border-slate-300 bg-slate-50/80 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-100/80">
                    <button type="button" onClick={handleManagePayments} className="flex h-full min-h-[18rem] w-full flex-col items-center justify-center gap-4 p-6 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
                        <Plus className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">Add another card</p>
                        <p className="text-sm text-slate-500">Open Stripe to add, remove, or replace saved payment methods.</p>
                      </div>
                    </button>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4 sm:space-y-6">
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <div className="text-center sm:text-left">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 sm:text-xl">Payment history</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">Completed booking charges, listed from most recent to oldest.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {paymentData.completedBookings.length === 0 ? (
                    <div className="rounded-[1.5rem] border-2 border-dashed border-slate-300 bg-slate-50/80 py-12 text-center">
                      <Calendar className="mx-auto h-12 w-12 text-slate-400" />
                      <p className="mt-4 text-lg font-semibold text-slate-900">No payment history yet</p>
                      <p className="mt-2 text-sm text-slate-500">Your completed bookings and charges will appear here once care is finished.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {paymentData.completedBookings.map((booking) => (
                        <Link key={booking.id} href={`/dashboard/bookings?bookingId=${booking.id}`} className="block rounded-[1.1rem] border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow-md sm:px-4 sm:py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                              <Receipt className="h-4.5 w-4.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-semibold text-slate-900 sm:text-[15px]">{booking.contractorName}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900">{formatCurrency(booking.paymentAmount)}</p>
                                  <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
                                </div>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <p className="truncate text-xs text-slate-600 sm:text-sm">{booking.serviceType}</p>
                                <span className="hidden text-slate-300 sm:inline">•</span>
                                <span className="text-xs text-slate-500 sm:text-sm">{formatBookingDate(booking.startDate || booking.date)}</span>
                                <Badge className="ml-auto border-green-200 bg-green-100 text-green-700">Completed</Badge>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DashboardPageContent>
    </DashboardPageShell>
  )
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsPageContent />
    </Suspense>
  )
}
