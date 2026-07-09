"use client"
import { Suspense, useEffect, useState } from 'react'
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useRequireRole } from '../use-require-role'
import { DashboardPageContent, DashboardPageHeader, DashboardPageShell } from '../components/dashboard-shell'
import { EmptyState } from '../components/empty-state'
import { RailDots } from '../components/rail-dots'
import { StatusBadge } from '../components/status-badge'
import { useRailScroll } from '@/hooks/use-rail-scroll'
import { getContractorProfile } from '@/lib/firebase/contractors'
import { getGigsForContractor, setContractorCompleted, updateBookingStatus } from '@/lib/firebase/bookings'
import { getClientById } from '@/lib/firebase/client'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import type { Contractor } from '@/types/contractor'
import type { Booking } from '@/types/booking'
import {
  DollarSign,
  Star,
  Calendar,
  MessageSquare,
  ArrowRight,
  CreditCard,
  Package,
} from 'lucide-react'
import Link from 'next/link'
import { format, isAfter, isBefore, parseISO, subDays } from 'date-fns'
import { ModalHeader } from '../components/modal-header'
import { ModalShell } from '../components/modal-shell'

interface DashboardStats {
  totalGigs: number
  completedGigs: number
  totalEarnings: number
  upcomingGigs: number
  averageRating: number
  totalReviews: number
  pendingPayouts: number
  thisMonthEarnings: number
}

interface EnhancedBooking extends Booking {
  clientName?: string
  clientAvatar?: string
  petNames?: string[]
}

function ContractorDashboardHomeContent() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const router = useRouter()
  const [profile, setProfile] = useState<Contractor | null>(null)
  const [bookings, setBookings] = useState<EnhancedBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<{ bookingId: string; action: 'accept' | 'decline' | 'complete' } | null>(null)
  const [confirmCompleteBookingId, setConfirmCompleteBookingId] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalGigs: 0,
    completedGigs: 0,
    totalEarnings: 0,
    upcomingGigs: 0,
    averageRating: 0,
    totalReviews: 0,
    pendingPayouts: 0,
    thisMonthEarnings: 0
  })

  useEffect(() => {
    if (!user) return
    
    async function fetchDashboardData() {
      setLoading(true)
      try {
        // Fetch contractor profile
        const contractorProfile = await getContractorProfile(user!.id)
        setProfile(contractorProfile)

        // Fetch bookings/gigs
        const contractorBookings = await getGigsForContractor(user!.id)
        
        // Enhance bookings with client information
        const enhancedBookings = await Promise.all(
          contractorBookings.map(async (booking) => {
            let clientName = 'N/A'
            let clientAvatar = undefined
            let petNames: string[] = []

            if (booking.clientId) {
              try {
                const client = await getClientById(booking.clientId)
                if (client) {
                  clientName = client.name || 'N/A'
                  clientAvatar = client.avatar
                  if (booking.petIds && booking.petIds.length && client.pets) {
                    petNames = client.pets
                      .filter((p: any) => booking.petIds!.includes(p.id))
                      .map((p: any) => p.name)
                  }
                }
              } catch (error) {
                console.warn('Failed to fetch client data:', error)
              }
            }

            return {
              ...booking,
              clientName,
              clientAvatar,
              petNames
            }
          })
        )
        
        setBookings(enhancedBookings)

        // Calculate stats
        const now = new Date()
        const thirtyDaysAgo = subDays(now, 30)
        const completedGigs = enhancedBookings.filter(b => b.status === 'completed').length
        const totalEarnings = enhancedBookings
          .filter(b => b.status === 'completed' && b.paymentStatus === 'paid')
          .reduce((sum, b) => sum + (b.netPayout || b.paymentAmount || 0), 0)
        
        const thisMonthEarnings = enhancedBookings
          .filter(b => {
            if (b.status !== 'completed' || b.paymentStatus !== 'paid') return false
            const bookingDate = b.startDate ? parseISO(b.startDate) : null
            return bookingDate && isAfter(bookingDate, thirtyDaysAgo)
          })
          .reduce((sum, b) => sum + (b.netPayout || b.paymentAmount || 0), 0)
        
        const upcomingGigs = enhancedBookings.filter(b => {
          if (b.status === 'cancelled' || b.status === 'completed') return false
          const bookingDate = b.startDate ? parseISO(b.startDate) : null
          return bookingDate && isAfter(bookingDate, now)
        }).length

        const pendingPayouts = enhancedBookings.filter(b => 
          b.status === 'completed' && b.paymentStatus === 'pending'
        ).length

        // Calculate average rating
        const ratings = contractorProfile?.ratings || []
        const averageRating = ratings.length > 0 
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
          : 0

        setStats({
          totalGigs: enhancedBookings.length,
          completedGigs,
          totalEarnings,
          upcomingGigs,
          averageRating,
          totalReviews: ratings.length,
          pendingPayouts,
          thisMonthEarnings
        })

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  const refreshDashboardBookings = async () => {
    if (!user) return

    const contractorBookings = await getGigsForContractor(user.id)
    const enhancedBookings = await Promise.all(
      contractorBookings.map(async (booking) => {
        let clientName = 'N/A'
        let clientAvatar = undefined
        let petNames: string[] = []

        if (booking.clientId) {
          try {
            const client = await getClientById(booking.clientId)
            if (client) {
              clientName = client.name || 'N/A'
              clientAvatar = client.avatar
              if (booking.petIds && booking.petIds.length && client.pets) {
                petNames = client.pets
                  .filter((p: any) => booking.petIds!.includes(p.id))
                  .map((p: any) => p.name)
              }
            }
          } catch (error) {
            console.warn('Failed to fetch client data:', error)
          }
        }

        return {
          ...booking,
          clientName,
          clientAvatar,
          petNames
        }
      })
    )

    setBookings(enhancedBookings)
  }

  const handleDashboardAccept = async (bookingId: string) => {
    setActionLoading({ bookingId, action: 'accept' })
    try {
      await updateBookingStatus(bookingId, 'approved')

      const approvedGig = bookings.find((booking) => booking.id === bookingId)
      if (approvedGig) {
        try {
          await fetch('/api/notifications/booking-approved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              booking: {
                id: approvedGig.id,
                clientId: approvedGig.clientId,
                contractorId: user?.id,
                services: approvedGig.services,
                startDate: approvedGig.startDate,
                endDate: approvedGig.endDate,
                paymentAmount: approvedGig.paymentAmount || 0,
                status: 'approved',
                paymentStatus: approvedGig.paymentStatus,
                petIds: approvedGig.petIds,
                numberOfDays: approvedGig.numberOfDays,
                platformFee: approvedGig.platformFee,
                stripeFee: approvedGig.stripeFee,
                netPayout: approvedGig.netPayout,
                paymentIntentId: approvedGig.paymentIntentId,
              },
            }),
          })
        } catch (error) {
          console.error('Error sending booking approved notification:', error)
        }
      }

      await refreshDashboardBookings()
    } catch (error) {
      console.error('Error accepting booking from dashboard:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDashboardDecline = async (bookingId: string) => {
    setActionLoading({ bookingId, action: 'decline' })
    try {
      await updateBookingStatus(bookingId, 'cancelled')

      const declinedGig = bookings.find((booking) => booking.id === bookingId)
      if (declinedGig) {
        try {
          await fetch('/api/notifications/booking-declined', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              booking: {
                id: declinedGig.id,
                clientId: declinedGig.clientId,
                contractorId: user?.id,
                services: declinedGig.services,
                startDate: declinedGig.startDate,
                endDate: declinedGig.endDate,
                paymentAmount: declinedGig.paymentAmount || 0,
                status: 'cancelled',
                paymentStatus: declinedGig.paymentStatus,
                petIds: declinedGig.petIds,
                numberOfDays: declinedGig.numberOfDays,
                platformFee: declinedGig.platformFee,
                stripeFee: declinedGig.stripeFee,
                netPayout: declinedGig.netPayout,
                paymentIntentId: declinedGig.paymentIntentId,
              },
            }),
          })
        } catch (error) {
          console.error('Error sending booking declined notification:', error)
        }
      }

      await refreshDashboardBookings()
    } catch (error) {
      console.error('Error declining booking from dashboard:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDashboardComplete = async (bookingId: string) => {
    setActionLoading({ bookingId, action: 'complete' })
    try {
      await setContractorCompleted(bookingId, true)

      const reminderResponse = await fetch('/api/notifications/completion-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, reminderNumber: 1 }),
      })

      if (!reminderResponse.ok) {
        console.error('Failed to send initial completion reminder for booking', bookingId)
      }

      await refreshDashboardBookings()
    } catch (error) {
      console.error('Error completing booking from dashboard:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const now = new Date()
  const recentBookings = bookings
    .filter(b => b.status === 'completed')
    .sort((a, b) => new Date(b.startDate || b.createdAt || 0).getTime() - new Date(a.startDate || a.createdAt || 0).getTime())
    .slice(0, 3)

  const upcomingBookings = bookings
    .filter(b => {
      if (b.status === 'cancelled' || b.status === 'completed') return false
      const bookingDate = b.startDate ? parseISO(b.startDate) : null
      return bookingDate && isAfter(bookingDate, now)
    })
    .sort((a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime())
    .slice(0, 3)

  const displayBookings = upcomingBookings.length > 0 ? upcomingBookings : recentBookings
  const bookingsTitle = upcomingBookings.length > 0 ? 'Upcoming Gigs' : 'Recent Gigs'
  const firstName = profile?.name?.split(' ')[0] || user?.firstName || 'there'

  const recentReviews = (profile?.ratings || [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Safe date formatting function to prevent RangeError
  const formatSafeDate = (dateString: string | undefined | null, fallback: string = 'Date not available') => {
    if (!dateString) return fallback
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return fallback
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      console.warn('Invalid date format:', dateString, error)
      return fallback
    }
  }

  const { railRef: bookingRailRef, clampedDotIndex: bookingRailDotIndex, onScroll: handleBookingRailScroll } = useRailScroll({
    slideSelector: '[data-contractor-booking-slide="true"]',
    itemCount: displayBookings.length,
  })

  const { railRef: reviewRailRef, clampedDotIndex: reviewRailDotIndex, onScroll: handleReviewRailScroll } = useRailScroll({
    slideSelector: '[data-contractor-review-slide="true"]',
    itemCount: recentReviews.length,
  })

  if (!isLoaded || !isAuthorized) {
    return (
      <DashboardPageShell className="flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </DashboardPageShell>
    )
  }

  if (loading) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
        <DashboardPageContent>
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-64 bg-slate-200 rounded-xl"></div>
              <div className="h-64 bg-slate-200 rounded-xl"></div>
            </div>
          </div>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
      <DashboardPageContent className="space-y-6 pb-12 lg:space-y-8">
        <DashboardPageHeader
          variant="summary"
          title={`Welcome back, ${firstName}`}
          description="Review recent gigs, payout readiness, and client feedback from one contractor dashboard."
          surfaceClassName="from-white via-blue-50/80 to-indigo-50/70"
          eyebrow={
            <>
              <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
                Contractor dashboard
              </Badge>
              <Badge className="border-green-200 bg-green-100 text-green-700">{stats.pendingPayouts} pending payouts</Badge>
            </>
          }
          meta={
            <div className="flex flex-wrap gap-2">
              <Badge className="border-blue-200 bg-blue-100 text-blue-700">{stats.totalGigs} gigs</Badge>
              <Badge className="border-green-200 bg-green-100 text-green-700">{formatCurrency(stats.totalEarnings)} earned</Badge>
              <Badge className="border-purple-200 bg-purple-100 text-purple-700">{stats.totalReviews} reviews</Badge>
              <Badge className="border-amber-200 bg-amber-100 text-amber-700">{formatCurrency(stats.thisMonthEarnings)} this month</Badge>
            </div>
          }
        />

        {/* Recent Gigs Section */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-xl">
                <Package className="h-5 w-5 text-primary" />
                {bookingsTitle}
              </CardTitle>
              <Link href="/dashboard/contractor/gigs">
                <Button variant="outline" size="pillSm">
                  View All Gigs
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {displayBookings.length > 0 ? (
              <>
                <div className="-mx-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:py-0">
                  <div
                    ref={bookingRailRef}
                    onScroll={handleBookingRailScroll}
                    className="flex snap-x snap-mandatory gap-4 overscroll-x-contain overflow-x-auto scroll-px-[12vw] pl-[12vw] pr-[12vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:block sm:space-y-3 sm:overflow-visible sm:pl-0 sm:pr-0 sm:scroll-px-0"
                  >
                    {displayBookings.map((booking) => (
                      <div
                        key={booking.id}
                        data-contractor-booking-slide="true"
                        className="block w-[76vw] min-w-[16.25rem] max-w-[17.5rem] shrink-0 snap-center snap-always sm:w-auto sm:min-w-0 sm:max-w-none"
                      >
                        <div
                          role="link"
                          tabIndex={0}
                          onClick={() => router.push(`/dashboard/contractor/gigs?detail=${booking.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              router.push(`/dashboard/contractor/gigs?detail=${booking.id}`)
                            }
                          }}
                          className="flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 lg:p-6 cursor-pointer"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-slate-200">
                                <AvatarImage src={booking.clientAvatar} alt={booking.clientName} />
                                <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                                  {booking.clientName?.[0] || 'C'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{booking.clientName}</p>
                                <p className="truncate text-xs text-slate-600 sm:text-sm">
                                  {booking.petNames?.join(', ') || `${booking.petIds?.length || 0} pet(s)`}
                                </p>
                              </div>
                            </div>
                            <StatusBadge status={booking.status} size="compact" capitalize={false} />
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-700 sm:gap-2 sm:text-xs">
                            <div className="rounded-lg bg-blue-50 px-2 py-1.5 ring-1 ring-blue-200">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">Date</div>
                              <div className="mt-1 font-medium text-slate-900">
                                {formatSafeDate(booking.startDate, 'Date TBD')}
                              </div>
                            </div>
                            <div className="rounded-lg bg-green-50 px-2 py-1.5 ring-1 ring-green-200">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-green-700">Earnings</div>
                              <div className="mt-1 font-medium text-slate-900">
                                {formatCurrency(booking.netPayout || booking.paymentAmount || 0)}
                              </div>
                            </div>
                            <div className="rounded-lg bg-purple-50 px-2 py-1.5 ring-1 ring-purple-200">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-700">Services</div>
                              <div className="mt-1 font-medium text-slate-900">
                                {booking.services?.length || 1}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 hidden items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600 lg:flex">
                            <span className="truncate font-medium text-slate-900">
                              {booking.services?.length ? `${booking.services.length} service${booking.services.length === 1 ? '' : 's'}` : 'Service details available'}
                            </span>
                            <span className="shrink-0 text-primary">Open details</span>
                          </div>

                          {booking.couponCode && (
                            <div className="mt-3 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-2.5 py-2 text-[11px] sm:px-3 sm:text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-medium text-green-700">Coupon {booking.couponCode}</span>
                                <span className="shrink-0 font-medium text-green-600">
                                  -${(booking.couponDiscount || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="mt-auto border-t border-slate-200/80 pt-4">
                            {booking.status === 'pending' ? (
                              <div className="space-y-2">
                                <Button
                                  type="button"
                                  variant="petCta"
                                  size="pill"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    handleDashboardAccept(booking.id)
                                  }}
                                  disabled={actionLoading?.bookingId === booking.id}
                                  className="w-full justify-center bg-green-600 text-white hover:bg-green-700"
                                >
                                  {actionLoading?.bookingId === booking.id && actionLoading.action === 'accept' ? 'Accepting...' : 'Accept Booking'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="pillSm"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    handleDashboardDecline(booking.id)
                                  }}
                                  disabled={actionLoading?.bookingId === booking.id}
                                  className="w-full justify-center border-red-200 bg-red-50/60 text-red-600 hover:border-red-300 hover:bg-red-50"
                                >
                                  {actionLoading?.bookingId === booking.id && actionLoading.action === 'decline' ? 'Declining...' : 'Decline'}
                                </Button>
                              </div>
                            ) : booking.status === 'approved' && !booking.contractorCompleted ? (
                              <Button
                                type="button"
                                variant="petCta"
                                size="pill"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    setConfirmCompleteBookingId(booking.id)
                                  }}
                                  disabled={actionLoading?.bookingId === booking.id}
                                  className="w-full justify-center"
                                >
                                {actionLoading?.bookingId === booking.id && actionLoading.action === 'complete' ? 'Marking Complete...' : 'Mark Complete'}
                              </Button>
                            ) : booking.status === 'approved' && booking.contractorCompleted ? (
                              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                                Awaiting client confirmation
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <RailDots count={displayBookings.length} activeIndex={bookingRailDotIndex} />
              </>
            ) : (
              <EmptyState
                icon={<Package className="h-14 w-14 text-slate-400" />}
                title="No gigs yet"
                description={upcomingBookings.length === 0 && recentBookings.length === 0 ? 'Start accepting gigs to see them here.' : 'No upcoming gigs scheduled.'}
                className="py-12"
              >
                <Link href="/dashboard/contractor/gigs">
                  <Button className="rounded-full">
                    <Calendar className="mr-2 h-4 w-4" />
                    View Available Gigs
                  </Button>
                </Link>
              </EmptyState>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!confirmCompleteBookingId} onOpenChange={(open) => !open && setConfirmCompleteBookingId(null)}>
          <ModalShell maxWidth="lg" aria-labelledby="contractorDashboardCompleteTitle">
            <div className="flex h-full min-h-0 flex-col">
              <ModalHeader
                eyebrow="Confirm completion"
                title="Mark Gig Complete"
                description="Only confirm this after the service has actually been completed."
                titleId="contractorDashboardCompleteTitle"
                onClose={() => setConfirmCompleteBookingId(null)}
                closeAriaLabel="Close completion confirmation modal"
                eyebrowClassName="text-green-600"
                className="border-green-100/70"
              />

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
                <div className="space-y-4">
                  <p className="text-sm text-slate-700">
                    Marking a gig complete tells the client the booking is finished and starts the payment confirmation flow.
                  </p>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Only continue if you have fully completed the service. If anything is still outstanding, choose Cancel and return later.
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-slate-200 bg-white/95 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setConfirmCompleteBookingId(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="petCta"
                    onClick={async () => {
                      if (!confirmCompleteBookingId) return
                      await handleDashboardComplete(confirmCompleteBookingId)
                      setConfirmCompleteBookingId(null)
                    }}
                    disabled={actionLoading?.bookingId === confirmCompleteBookingId && actionLoading.action === 'complete'}
                  >
                    {actionLoading?.bookingId === confirmCompleteBookingId && actionLoading.action === 'complete'
                      ? 'Marking Complete...'
                      : 'Yes, Mark Complete'}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </ModalShell>
        </Dialog>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:gap-8 xl:grid-cols-2">
          {/* Recent Reviews Card */}
          <Card className="border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-xl">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Recent Reviews
                </CardTitle>
                <Link href="/dashboard/contractor/reviews">
                  <Button variant="outline" size="pillSm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentReviews.length > 0 ? (
                <>
                  <div className="-mx-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:py-0">
                    <div
                      ref={reviewRailRef}
                      onScroll={handleReviewRailScroll}
                      className="flex snap-x snap-mandatory gap-4 overscroll-x-contain overflow-x-auto scroll-px-[12vw] pl-[12vw] pr-[12vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:block sm:space-y-3 sm:overflow-visible sm:pl-0 sm:pr-0 sm:scroll-px-0"
                    >
                      {recentReviews.map((review, index) => (
                        <div
                          key={`${review.date}-${index}`}
                          data-contractor-review-slide="true"
                          className="block w-[76vw] min-w-[16.25rem] max-w-[17.5rem] shrink-0 snap-center snap-always sm:w-auto sm:min-w-0 sm:max-w-none"
                        >
                          <div className="h-full rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm sm:p-5">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                                  />
                                ))}
                              </div>
                              <p className="text-[11px] font-medium text-slate-500 sm:text-xs">
                                {formatSafeDate(review.date)}
                              </p>
                            </div>
                            <p className="text-sm leading-6 text-slate-700">
                              {review.comment || 'No comment provided'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <RailDots count={recentReviews.length} activeIndex={reviewRailDotIndex} />
                  {profile?.ratings && profile.ratings.length > 3 && (
                    <div className="pt-2 text-center">
                      <Link href="/dashboard/contractor/reviews">
                        <Button variant="outline" size="pillSm" className="text-primary hover:text-primary/80">
                          View {profile.ratings.length - 3} more reviews
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  icon={<Star className="h-12 w-12 text-slate-400" />}
                  title="No reviews yet"
                  description="Complete your first gig to start receiving reviews."
                  className="border-0 bg-transparent px-0 py-8 shadow-none"
                />
              )}
            </CardContent>
          </Card>

          {/* Payout Information Card */}
          <Card className="border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-xl">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payout Account
                </CardTitle>
                <Link href="/dashboard/contractor/payments">
                  <Button variant="outline" size="pillSm">
                    Manage
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {profile?.stripeAccountId ? (
                <div className="relative aspect-[1.586/1] max-h-[14rem] overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-lg ring-1 ring-white/10 sm:p-6">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.18),_transparent_40%)]"></div>
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full border border-white/10 bg-white/5"></div>
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-4 h-10 w-14 rounded-xl border border-amber-200/50 bg-gradient-to-br from-amber-200 to-amber-500 shadow-inner"></div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300">Pending payouts</p>
                        <p className="mt-1 text-lg font-semibold text-white sm:text-xl">{stats.pendingPayouts}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300">Status</p>
                        <p className="mt-1 text-sm font-semibold text-green-300">Active</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Account number</p>
                        <p className="mt-2 font-mono text-lg tracking-[0.28em] text-white sm:text-xl">
                          •••• •••• •••• ••••
                        </p>
                      </div>

                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Payout account</p>
                          <p className="mt-1 text-sm font-semibold text-white">Account Connected</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Network</p>
                          <p className="mt-1 text-lg font-bold uppercase tracking-[0.18em] text-white">STRIPE</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<CreditCard className="h-12 w-12 text-slate-400" />}
                  title="No payout account connected"
                  description="Connect your bank account to receive payments."
                >
                  <Link href="/dashboard/contractor/payments">
                    <Button className="rounded-full">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Connect Account
                    </Button>
                  </Link>
                </EmptyState>
              )}
            </CardContent>
          </Card>
        </div>

      </DashboardPageContent>
    </DashboardPageShell>
  )
}

export default function ContractorDashboardHome() {
  return (
    <Suspense fallback={null}>
      <ContractorDashboardHomeContent />
    </Suspense>
  )
} 
