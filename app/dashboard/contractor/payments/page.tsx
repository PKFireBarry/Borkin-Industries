"use client"
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRequireRole } from '../../use-require-role'
import { useUser } from '@clerk/nextjs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { DollarSign, ExternalLink } from 'lucide-react'
import { getPlatformServiceById } from '@/lib/firebase/services'
import { DashboardPageContent, DashboardPageHeader, DashboardPageShell } from '../../components/dashboard-shell'
import { EmptyState } from '../../components/empty-state'
import { ModalHeader } from '../../components/modal-header'
import { ModalShell } from '../../components/modal-shell'
import { RailDots } from '../../components/rail-dots'
import { StatusBadge } from '../../components/status-badge'
import { useRailScroll } from '@/hooks/use-rail-scroll'

interface PaymentGig {
  id: string
  serviceType: string
  serviceName?: string
  clientName: string
  date: string
  amount: number
  status: 'pending' | 'approved' | 'completed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'escrow' | 'cancelled'
  platformFee?: number
  stripeFee?: number
  netPayout?: number
  petNames?: string
  review?: { rating: number; comment?: string }
}

interface MonthlyEarnings {
  month: string;
  total: number;
  net: number;
  count: number;
}

type SummaryFilter = 'all' | 'paid' | 'awaiting-client' | 'awaiting-release'
type TimeFilter = 'all-time' | 'past-month' | 'past-year'

const DEFAULT_DESKTOP_PAGINATION_HEIGHT = 96
const DESKTOP_GIGS_BOTTOM_BUFFER = 72
const DESKTOP_GIGS_FIT_SAFETY_BUFFER = 32

function ContractorPaymentsPageContent() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gigs, setGigs] = useState<PaymentGig[]>([])
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [payoutMethod, setPayoutMethod] = useState<{ last4: string; brand: string } | null>(null)
  const [accountStatus, setAccountStatus] = useState<{
    payoutsEnabled: boolean
    chargesEnabled: boolean
    detailsSubmitted: boolean
    currentlyDue: string[]
    eventuallyDue: string[]
    pendingVerification: string[]
  } | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [detailGig, setDetailGig] = useState<PaymentGig | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('date-desc')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'paid-gigs' | 'monthly-earnings' | 'payout-settings'>('paid-gigs')
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all-time')
  const [stripeOnboardingLoading, setStripeOnboardingLoading] = useState(false)
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const [activeDesktopPage, setActiveDesktopPage] = useState(1)
  const [desktopGigsPerPage, setDesktopGigsPerPage] = useState(3)
  const [desktopPaginationHeight, setDesktopPaginationHeight] = useState(DEFAULT_DESKTOP_PAGINATION_HEIGHT)
  const [desktopViewportSectionHeight, setDesktopViewportSectionHeight] = useState<number | null>(null)
  const gigsSectionRef = useRef<HTMLDivElement | null>(null)
  const firstGigCardRef = useRef<HTMLDivElement | null>(null)
  const desktopPaginationRef = useRef<HTMLDivElement | null>(null)

  const handleStripeOnboarding = async () => {
    if (!user) return

    setStripeOnboardingLoading(true)
    try {
      const response = await fetch('/api/stripe/connect-onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to create onboarding link')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Stripe onboarding error:', error)
      setError('Failed to start payment setup. Please try again.')
    } finally {
      setStripeOnboardingLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    fetch(`/api/contractors/${user.id}`)
      .then(res => res.json())
      .then(async (profile) => {
        setStripeAccountId(profile?.stripeAccountId || null)
        if (profile?.stripeAccountId) {
          // Fetch payout method
          try {
            const res = await fetch('/api/stripe/list-payment-methods', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ stripeAccountId: profile.stripeAccountId }),
            })
            const data = await res.json()
            if (data.hasPayoutMethod && data.payoutMethod) {
              setPayoutMethod({
                last4: data.payoutMethod.last4,
                brand: data.payoutMethod.brand,
              })
            } else {
              setPayoutMethod(null)
            }
            setAccountStatus(data.accountStatus || null)
          } catch {
            setPayoutMethod(null)
            setAccountStatus(null)
          }
          // Fetch gigs
          try {
            const res = await fetch('/api/stripe/list-payouts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ stripeAccountId: profile.stripeAccountId, contractorId: user.id }),
            })
            const data = await res.json()
            const mappedGigs = await Promise.all((data.gigs || []).map(async (b: any) => {
              let clientName = 'N/A'
              let petNames = ''
              let serviceName = b.serviceType || 'N/A'
              try {
                const client = await import('@/lib/firebase/client').then(m => m.getClientById(b.clientId))
                clientName = client?.name || 'N/A'
                if (b.petIds && Array.isArray(b.petIds) && client?.pets) {
                  petNames = b.petIds.map((pid: string) => client.pets.find((p: any) => p.id === pid)?.name).filter(Boolean).join(', ')
                }
                // Fetch service name
                if (b.serviceType) {
                  const serviceDetails = await getPlatformServiceById(b.serviceType)
                  if (serviceDetails && serviceDetails.name) {
                    serviceName = serviceDetails.name
                  }
                }
              } catch (fetchError) {
                console.error('Error fetching related data for gig:', fetchError)
              }
              return {
                id: b.id,
                serviceType: b.serviceType || 'N/A',
                serviceName,
                clientName,
                date: b.date || b.startDate || 'N/A',
                amount: b.paymentAmount || 0,
                status: b.status || 'pending',
                paymentStatus: b.paymentStatus || 'pending',
                platformFee: b.platformFee || undefined,
                stripeFee: b.stripeFee || undefined,
                netPayout: b.netPayout || undefined,
                petNames,
                review: b.review,
              }
            }))
            setGigs(mappedGigs)
          } catch (apiError) {
            console.error('Error fetching payouts:', apiError)
            setGigs([])
          }
        } else {
          setPayoutMethod(null)
          setAccountStatus(null)
          setGigs([])
        }
      })
      .catch((profileError) => {
        console.error('Error fetching contractor profile:', profileError)
        setError('Failed to load payments')
      })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const updateViewport = () => setIsDesktopViewport(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => {
      mediaQuery.removeEventListener('change', updateViewport)
    }
  }, [])

  // Payment summary calculations with new fee structure
  const getGigNetPayout = (gig: PaymentGig) => {
    if (gig.netPayout !== undefined) return gig.netPayout
    return gig.amount - (gig.platformFee ?? gig.amount * 0.05) - (gig.stripeFee ?? (gig.amount * 0.029 + 0.3))
  }

  const totalNetPayout = gigs
    .filter((gig) => gig.paymentStatus === 'paid')
    .reduce((acc, gig) => {
    // New fee structure: contractor receives full base service amount
    // Legacy: contractor receives amount minus fees
      return acc + getGigNetPayout(gig)
  }, 0);
  const paidGigs = gigs.filter((gig) => gig.paymentStatus === 'paid')
  const awaitingClientCompletionGigs = gigs.filter((gig) => gig.status === 'completed' && gig.paymentStatus !== 'paid')
  const awaitingReleaseGigs = gigs.filter((gig) => gig.status === 'approved' && gig.paymentStatus === 'escrow')
  const paidGigsCount = paidGigs.length
  const avgEarningPerGig = paidGigsCount > 0 ? totalNetPayout / paidGigsCount : 0

  // Monthly earnings breakdown
  const getMonthlyEarnings = (): MonthlyEarnings[] => {
    const monthlyData: Record<string, MonthlyEarnings> = {}

    gigs.filter((gig) => gig.paymentStatus === 'paid').forEach(gig => {
      try {
        const date = new Date(gig.date)
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' })

        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = {
            month: monthName,
            total: 0,
            net: 0,
            count: 0
          }
        }

        monthlyData[monthYear].total += gig.amount
        // Use actual netPayout if available, otherwise calculate legacy way
        const netAmount = getGigNetPayout(gig)
        monthlyData[monthYear].net += netAmount
        monthlyData[monthYear].count += 1
      } catch (e) {
        // Skip invalid dates
      }
    })

    return Object.values(monthlyData).sort((a, b) =>
      new Date(b.month).getTime() - new Date(a.month).getTime()
    )
  }

  const monthlyEarnings = getMonthlyEarnings()

  // Helper to format date(s) like booking-list
  const safeDateString = (date: string) => {
    if (!date) return ''
    try { return new Date(date).toLocaleString() } catch { return '' }
  }
  const getGigDisplayDate = (g: PaymentGig) => {
    // If you add endDate to PaymentGig, use it here
    const start = g.date ?? ''
    return start ? safeDateString(start) : ''
  }

  // Filter and sort gigs
  const filteredGigs = gigs.filter(gig => {
    if (summaryFilter === 'paid' && gig.paymentStatus !== 'paid') {
      return false
    }

    if (summaryFilter === 'awaiting-client' && !(gig.status === 'completed' && gig.paymentStatus !== 'paid')) {
      return false
    }

    if (summaryFilter === 'awaiting-release' && !(gig.status === 'approved' && gig.paymentStatus === 'escrow')) {
      return false
    }

    // Filter by status
    if (activeTab !== 'all' && gig.status !== activeTab) {
      return false
    }

    if (timeFilter !== 'all-time') {
      const now = new Date()
      const gigDate = new Date(gig.date)
      const cutoff = new Date(now)
      if (timeFilter === 'past-month') {
        cutoff.setMonth(now.getMonth() - 1)
      } else if (timeFilter === 'past-year') {
        cutoff.setFullYear(now.getFullYear() - 1)
      }

      if (gigDate < cutoff) {
        return false
      }
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        gig.serviceName?.toLowerCase().includes(searchLower) ||
        gig.clientName.toLowerCase().includes(searchLower) ||
        (gig.petNames && gig.petNames.toLowerCase().includes(searchLower))
      )
    }

    return true
    }).sort((a, b) => {
    // Sort by selected option
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      case 'date-asc':
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      case 'amount-desc':
        return b.amount - a.amount
      case 'amount-asc':
        return a.amount - b.amount
      default:
        return 0
    }
  })

  const desktopPageCount = Math.max(1, Math.ceil(filteredGigs.length / desktopGigsPerPage))
  const visibleGigs = isDesktopViewport
    ? filteredGigs.slice((activeDesktopPage - 1) * desktopGigsPerPage, activeDesktopPage * desktopGigsPerPage)
    : filteredGigs

  const { railRef: gigRailRef, clampedDotIndex: gigRailDotIndex, onScroll: handleGigRailScroll } = useRailScroll({
    slideSelector: '[data-contractor-payment-gig-slide="true"]',
    itemCount: visibleGigs.length,
  })

  useEffect(() => {
    setActiveDesktopPage(1)
  }, [activeTab, searchTerm, sortBy])

  useEffect(() => {
    if (activeDesktopPage > desktopPageCount) {
      setActiveDesktopPage(desktopPageCount)
    }
  }, [activeDesktopPage, desktopPageCount])

  useEffect(() => {
    if (!isDesktopViewport) {
      setDesktopViewportSectionHeight(null)
      return
    }

    const updateDesktopGigsPerPage = () => {
      const sectionTop = gigsSectionRef.current?.getBoundingClientRect().top
      const firstCardHeight = firstGigCardRef.current?.getBoundingClientRect().height
      const paginationHeight = desktopPaginationRef.current?.getBoundingClientRect().height

      if (typeof sectionTop !== 'number') return

      const sectionHeight = Math.max(0, window.innerHeight - sectionTop - DESKTOP_GIGS_BOTTOM_BUFFER)
      setDesktopViewportSectionHeight((previousHeight) => (previousHeight === sectionHeight ? previousHeight : sectionHeight))

      if (typeof paginationHeight === 'number') {
        setDesktopPaginationHeight((previousHeight) => (previousHeight === paginationHeight ? previousHeight : paginationHeight))
      }

      if (typeof firstCardHeight !== 'number') return

      const gridGap = 16
      const availableHeight = Math.max(0, sectionHeight - desktopPaginationHeight - DESKTOP_GIGS_FIT_SAFETY_BUFFER)
      const visibleRows = Math.max(1, Math.floor((availableHeight + gridGap) / (firstCardHeight + gridGap)))
      const desktopColumns = window.innerWidth >= 1280 ? 4 : window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1
      const nextPageSize = Math.max(desktopColumns, visibleRows * desktopColumns)

      setDesktopGigsPerPage((previousPageSize) => (previousPageSize === nextPageSize ? previousPageSize : nextPageSize))
    }

    const frameId = window.requestAnimationFrame(updateDesktopGigsPerPage)
    window.addEventListener('resize', updateDesktopGigsPerPage)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateDesktopGigsPerPage)
    }
  }, [activeDesktopPage, desktopPaginationHeight, filteredGigs.length, isDesktopViewport])

  if (!isLoaded || !isAuthorized) return null
  if (loading) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
        <DashboardPageContent>
          <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-12 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-600">Loading payments...</p>
          </div>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }
  if (error) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
        <DashboardPageContent>
          <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }

  const payoutSettingsPanel = !stripeAccountId ? (
    <div className="flex items-center gap-4 rounded-[1.75rem] border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
      <div className="flex-1">
        <div className="mb-1 font-medium text-slate-900">Set up payouts to receive your earnings</div>
        <div className="mb-2 text-sm text-slate-600">Add a card or bank account to receive payments via Stripe.</div>
      </div>
      <Button
        variant="petCta"
        size="pill"
        onClick={handleStripeOnboarding}
        disabled={stripeOnboardingLoading}
      >
        {stripeOnboardingLoading ? 'Setting up...' : 'Set Up Payouts'}
      </Button>
    </div>
  ) : !payoutMethod ? (
    <div className="flex items-center gap-4 rounded-[1.75rem] border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
      <div className="flex-1">
        <div className="mb-1 font-medium text-slate-900">No payout method on file</div>
        <div className="text-sm text-slate-600">Add a card or bank account to receive payments via Stripe.</div>
      </div>
      <Button
        variant="outline"
        size="pill"
        onClick={handleStripeOnboarding}
        disabled={stripeOnboardingLoading}
      >
        {stripeOnboardingLoading ? 'Setting up...' : 'Add Payout Method'}
      </Button>
    </div>
  ) : (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="flex items-center gap-4 rounded-[1.75rem] border border-green-200/80 bg-gradient-to-br from-green-50 to-emerald-50 p-5 shadow-sm">
        <div className="flex-1">
          <div className="mb-1 font-medium text-slate-900">Payout Method on File</div>
          <div className="text-sm text-slate-600">
            {payoutMethod.brand} •••• {payoutMethod.last4}
          </div>
        </div>
        <Button
          variant="outline"
          size="pill"
          onClick={handleStripeOnboarding}
          disabled={stripeOnboardingLoading}
        >
          {stripeOnboardingLoading ? 'Updating...' : 'Update Payout Method'}
        </Button>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Stripe Account Status</p>
            <p className="text-xs text-slate-500">Readiness for payouts and onboarding follow-up.</p>
          </div>
          <Button variant="outline" size="pillSm" onClick={handleStripeOnboarding} disabled={stripeOnboardingLoading}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Stripe
          </Button>
        </div>
        {accountStatus ? (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge className={accountStatus.payoutsEnabled ? 'border-green-200 bg-green-100 text-green-700' : 'border-amber-200 bg-amber-100 text-amber-700'}>
                {accountStatus.payoutsEnabled ? 'Payouts enabled' : 'Payouts pending'}
              </Badge>
              <Badge className={accountStatus.chargesEnabled ? 'border-blue-200 bg-blue-100 text-blue-700' : 'border-slate-200 bg-slate-100 text-slate-700'}>
                {accountStatus.chargesEnabled ? 'Charges enabled' : 'Charges pending'}
              </Badge>
              <Badge className={accountStatus.detailsSubmitted ? 'border-green-200 bg-green-100 text-green-700' : 'border-amber-200 bg-amber-100 text-amber-700'}>
                {accountStatus.detailsSubmitted ? 'Details submitted' : 'Details needed'}
              </Badge>
            </div>

            {accountStatus.currentlyDue.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                {accountStatus.currentlyDue.length} item(s) currently due in Stripe.
              </div>
            ) : (
              <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-green-800">
                No payout requirements currently due.
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Stripe readiness details are unavailable right now.</p>
        )}
      </div>
    </div>
  )

  return (
    <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
      <DashboardPageContent className="space-y-6 pb-12 lg:space-y-8 lg:pb-0">
        <DashboardPageHeader
          variant="summary"
          title="Payment Dashboard"
          description="Track contractor earnings, payout setup, monthly performance, and paid gig history from one payment workspace."
          surfaceClassName="from-white via-green-50/70 to-blue-50/70"
          eyebrow={
            <>
              <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
                Contractor payments
              </Badge>
              <Badge className={stripeAccountId ? 'border-green-200 bg-green-100 text-green-700' : 'border-amber-200 bg-amber-100 text-amber-700'}>
                {stripeAccountId ? 'Payouts ready' : 'Setup needed'}
              </Badge>
            </>
          }
          actions={
            <Button variant="petCta" size="pill" onClick={handleStripeOnboarding} disabled={stripeOnboardingLoading}>
              {stripeOnboardingLoading ? 'Opening Stripe...' : stripeAccountId ? 'Update Payout Setup' : 'Set Up Payouts'}
            </Button>
          }
          meta={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={summaryFilter === 'paid' ? 'default' : 'outline'}
                size="pillSm"
                onClick={() => {
                  setSummaryFilter(summaryFilter === 'paid' ? 'all' : 'paid')
                  setActiveWorkspaceTab('paid-gigs')
                }}
                className={summaryFilter === 'paid' ? 'bg-green-600 text-white hover:bg-green-700' : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'}
              >
                ${totalNetPayout.toFixed(2)} net earnings
              </Button>
              <Button
                type="button"
                variant={summaryFilter === 'awaiting-client' ? 'default' : 'outline'}
                size="pillSm"
                onClick={() => {
                  setSummaryFilter(summaryFilter === 'awaiting-client' ? 'all' : 'awaiting-client')
                  setActiveWorkspaceTab('paid-gigs')
                }}
                className={summaryFilter === 'awaiting-client' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'}
              >
                {awaitingClientCompletionGigs.length} awaiting client completion
              </Button>
              <Button
                type="button"
                variant={summaryFilter === 'awaiting-release' ? 'default' : 'outline'}
                size="pillSm"
                onClick={() => {
                  setSummaryFilter(summaryFilter === 'awaiting-release' ? 'all' : 'awaiting-release')
                  setActiveWorkspaceTab('paid-gigs')
                }}
                className={summaryFilter === 'awaiting-release' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}
              >
                {awaitingReleaseGigs.length} awaiting release
              </Button>
              <Badge className="border-purple-200 bg-purple-100 text-purple-700">{paidGigsCount} paid gigs</Badge>
              <Badge className="border-slate-200 bg-slate-100 text-slate-700">${avgEarningPerGig.toFixed(2)} avg per gig</Badge>
            </div>
          }
        />

        <Tabs value={activeWorkspaceTab} onValueChange={(value) => setActiveWorkspaceTab(value as typeof activeWorkspaceTab)} className="space-y-6">
          <TabsList className="grid h-12 w-full grid-cols-3 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm lg:w-[34rem]">
            <TabsTrigger value="paid-gigs" className="rounded-xl text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Paid Gigs
            </TabsTrigger>
            <TabsTrigger value="monthly-earnings" className="rounded-xl text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Monthly Earnings
            </TabsTrigger>
            <TabsTrigger value="payout-settings" className="rounded-xl text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Payout Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paid-gigs" className="space-y-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <Tabs value={activeTab} className="w-full sm:w-auto" onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All Gigs</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
                  <SelectTrigger className="w-full sm:w-[170px]">
                    <SelectValue placeholder="Time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-time">All Time</SelectItem>
                    <SelectItem value="past-month">Past Month</SelectItem>
                    <SelectItem value="past-year">Past Year</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Search gigs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-[200px]"
                />

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="amount-desc">Highest Amount</SelectItem>
                    <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredGigs.length === 0 ? (
              <EmptyState
                icon={<DollarSign className="h-10 w-10 text-slate-400" />}
                title="No paid gigs found"
                description="Try adjusting your search or filters to see more payment activity."
                className="bg-muted/20 p-8"
              >
                {(searchTerm || activeTab !== 'all' || summaryFilter !== 'all' || timeFilter !== 'all-time') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('')
                      setActiveTab('all')
                      setSummaryFilter('all')
                      setTimeFilter('all-time')
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </EmptyState>
            ) : (
              <div
                ref={gigsSectionRef}
                className="flex flex-col gap-6"
                style={isDesktopViewport && desktopViewportSectionHeight ? { minHeight: `${desktopViewportSectionHeight}px` } : undefined}
              >
                <div className="-mx-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:py-0">
                  <div
                    ref={gigRailRef}
                    onScroll={handleGigRailScroll}
                    className="flex snap-x snap-mandatory gap-4 overscroll-x-contain overflow-x-auto scroll-px-[12vw] pl-[12vw] pr-[12vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pl-0 sm:pr-0 sm:scroll-px-0 lg:grid-cols-3 xl:grid-cols-4"
                  >
                    {visibleGigs.map((gig, index) => (
                      <div
                        key={gig.id}
                        ref={index === 0 ? firstGigCardRef : undefined}
                        data-contractor-payment-gig-slide="true"
                        className="block w-[76vw] min-w-[16.25rem] max-w-[17.5rem] shrink-0 snap-center snap-always sm:w-auto sm:min-w-0 sm:max-w-none"
                      >
                        <Card className="flex h-[17.75rem] flex-col rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md sm:h-full">
                          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                            <div className="min-w-0">
                              <CardTitle className="truncate text-base font-semibold text-slate-900 sm:text-lg">{gig.serviceName || gig.serviceType}</CardTitle>
                              <div className="mt-1 text-xs text-slate-500 sm:text-sm">{getGigDisplayDate(gig)}</div>
                            </div>
                            <StatusBadge status={gig.status} size="compact" />
                          </CardHeader>
                          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pb-4">
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                              <div className="rounded-xl bg-blue-50 px-3 py-2.5 ring-1 ring-blue-200">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">Client</div>
                                <div className="mt-1 truncate font-semibold text-slate-900">{gig.clientName}</div>
                              </div>
                              <div className="rounded-xl bg-purple-50 px-3 py-2.5 ring-1 ring-purple-200">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-700">Pets</div>
                                <div className="mt-1 truncate font-semibold text-slate-900">{gig.petNames || 'None listed'}</div>
                              </div>
                              <div className="rounded-xl bg-green-50 px-3 py-2.5 ring-1 ring-green-200">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-green-700">Net payout</div>
                                <div className="mt-1 font-semibold text-slate-900">${(gig.netPayout ?? (gig.amount - (gig.platformFee ?? gig.amount * 0.05) - (gig.stripeFee ?? (gig.amount * 0.029 + 0.3)))).toFixed(2)}</div>
                              </div>
                              <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Gross amount</div>
                                <div className="mt-1 font-semibold text-slate-900">${gig.amount.toFixed(2)}</div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs">
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Payment status</p>
                                <p className="truncate font-medium text-slate-900">{gig.paymentStatus}</p>
                              </div>
                              {gig.review ? (
                                <div className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                                  {gig.review.rating}★ review
                                </div>
                              ) : (
                                <span className="shrink-0 text-slate-500">No review</span>
                              )}
                            </div>

                            <div className="mt-auto flex justify-end">
                              <Button variant="outline" size="pillSm" className="ml-auto" onClick={() => setDetailGig(gig)}>
                                View Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sm:hidden">
                  <RailDots count={visibleGigs.length} activeIndex={gigRailDotIndex} />
                </div>

                {isDesktopViewport && filteredGigs.length > desktopGigsPerPage ? (
                  <div
                    ref={desktopPaginationRef}
                    className="hidden lg:mt-auto lg:flex lg:items-center lg:justify-between lg:gap-4 lg:rounded-[1.35rem] lg:border lg:border-slate-200/80 lg:bg-white/92 lg:px-5 lg:py-4 lg:shadow-lg lg:backdrop-blur"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Page {activeDesktopPage} of {desktopPageCount}
                      </p>
                      <p className="text-xs text-slate-500">
                        Showing {visibleGigs.length} of {filteredGigs.length} paid gigs
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="pillSm"
                        onClick={() => setActiveDesktopPage((prev) => Math.max(prev - 1, 1))}
                        disabled={activeDesktopPage === 1}
                        className="min-w-[7rem]"
                      >
                        Previous
                      </Button>

                      <div className="flex items-center gap-2">
                        {Array.from({ length: desktopPageCount }, (_, index) => {
                          const pageNumber = index + 1
                          const isCurrentPage = pageNumber === activeDesktopPage

                          return (
                            <Button
                              key={pageNumber}
                              type="button"
                              variant={isCurrentPage ? 'default' : 'outline'}
                              size="icon"
                              onClick={() => setActiveDesktopPage(pageNumber)}
                              className="h-10 w-10 rounded-2xl"
                              aria-label={`Go to page ${pageNumber}`}
                            >
                              {pageNumber}
                            </Button>
                          )
                        })}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="pillSm"
                        onClick={() => setActiveDesktopPage((prev) => Math.min(prev + 1, desktopPageCount))}
                        disabled={activeDesktopPage === desktopPageCount}
                        className="min-w-[7rem]"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </TabsContent>

          <TabsContent value="monthly-earnings">
            <Card className="overflow-hidden border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900 sm:text-lg">Monthly Earnings</CardTitle>
                <p className="text-sm text-slate-500">Breakdown of your earnings by month.</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-[1.25rem] border border-slate-200 bg-white">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Month</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Gigs</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyEarnings.length > 0 ? (
                        monthlyEarnings.map((month, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">{month.month}</td>
                            <td className="px-4 py-3 text-right text-sm text-slate-600">{month.count}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">${month.net.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">No monthly data available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payout-settings">
            {payoutSettingsPanel}
          </TabsContent>
        </Tabs>

      {/* Gig Details Modal */}
      <Dialog open={!!detailGig} onOpenChange={() => setDetailGig(null)}>
        <ModalShell aria-labelledby="contractorPaymentGigDetailsTitle" maxWidth="2xl">
          <div className="flex h-full min-h-0 flex-col">
            <ModalHeader
              eyebrow="Contractor payments"
              title="Gig Details"
              description="Review payout details, client info, booking context, and review notes for this paid gig."
              titleId="contractorPaymentGigDetailsTitle"
              onClose={() => setDetailGig(null)}
              closeAriaLabel="Close paid gig details"
            />
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {detailGig && (
            <section className="space-y-5 sm:space-y-6">
              {/* Status & Dates */}
              <div className="grid grid-cols-1 gap-4 rounded-[1.5rem] border border-slate-200 bg-gradient-to-r from-slate-50 to-green-50 p-4 sm:grid-cols-2 sm:p-5">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</span>
                  <StatusBadge status={detailGig.status} size="compact" />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Payment Status</span>
                  <StatusBadge status={detailGig.paymentStatus} size="compact" />
                </div>
                <div className="col-span-1 sm:col-span-2 mt-1">
                  <div className="flex w-full flex-col gap-2 rounded-xl bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Date & Time</span>
                      <span className="flex items-center gap-2 break-words text-sm font-semibold text-slate-900 sm:text-base">
                        {getGigDisplayDate(detailGig)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Client Info */}
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 sm:p-5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Client</span>
                <div className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">{detailGig?.clientName}</div>
              </div>
              {/* Animals Info */}
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 sm:p-5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Animals</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detailGig.petNames ? detailGig.petNames.split(',').map(name => (
                    <span key={name} className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 shadow-sm">{name}</span>
                  )) : <span className="text-sm text-slate-500">None</span>}
                </div>
              </div>
              {/* Payment Information */}
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
                  Payment Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 ring-1 ring-green-200">
                    <span className="text-sm font-semibold text-green-900">Your Earnings</span>
                    <span className="text-xl font-bold text-green-600">${detailGig?.netPayout?.toFixed(2) ?? (((detailGig?.amount || 0) - (detailGig?.platformFee || (detailGig?.amount || 0) * 0.05) - ((detailGig?.amount || 0) * 0.029 + 0.3)).toFixed(2))}</span>
                  </div>
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                    <p className="text-sm text-green-800">
                      💡 This is the amount you receive. All platform and processing fees are paid separately by the client.
                    </p>
                  </div>
                </div>
              </div>
              {/* Review */}
              {detailGig.review && (
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Review</div>
                  <div className="text-sm text-slate-700">Rating: <span className="font-bold text-slate-900">{detailGig.review.rating}</span></div>
                  {detailGig.review.comment && <div className="mt-1 text-sm italic text-slate-700">"{detailGig.review.comment}"</div>}
                </div>
              )}
              {/* Booking ID */}
              <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Booking ID</span>
                  <div className="mt-1 break-all font-mono text-xs text-slate-700">{detailGig?.id ?? ''}</div>
                </div>
              </div>
            </section>
          )}
            </div>
          <DialogFooter className="border-t border-slate-200 bg-white/95 px-4 py-4 sm:px-6">
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setDetailGig(null)}>Close</Button>
            </div>
          </DialogFooter>
          </div>
        </ModalShell>
      </Dialog>
      </DashboardPageContent>
    </DashboardPageShell>
  )
}

export default function ContractorPaymentsPage() {
  return (
    <Suspense fallback={null}>
      <ContractorPaymentsPageContent />
    </Suspense>
  )
} 
