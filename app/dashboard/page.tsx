"use client"

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { format, formatDistanceToNow, isAfter, parseISO } from 'date-fns'
import { useUser } from '@clerk/nextjs'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRequireRole } from './use-require-role'
import { DashboardPageContent, DashboardPageShell } from './components/dashboard-shell'
import { EmptyState } from './components/empty-state'
import { RailDots } from './components/rail-dots'
import { StatusBadge } from './components/status-badge'
import { useRailScroll } from '@/hooks/use-rail-scroll'
import { getClientProfile } from '@/lib/firebase/client'
import { getBookingsForClient } from '@/lib/firebase/bookings'
import { db } from '@/firebase'
import type { Client, PaymentMethod } from '@/types/client'
import type { Booking } from '@/types/booking'
import type { Chat } from '@/types/messaging'
import {
  ArrowUpRight,
  Calendar,
  CreditCard,
  Heart,
  MessageCircle,
  Package,
  PawPrint,
  Plus,
  Search,
  Repeat2,
} from 'lucide-react'

interface DashboardStats {
  completedBookings: number
  totalSpent: number
  upcomingBookings: number
  activePets: number
}

function toMillis(value: unknown): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
  }
  return Date.now()
}

function normalizeChat(docId: string, data: Record<string, unknown>): Chat {
  const lastMessage = data.lastMessage as Chat['lastMessage'] | null | undefined

  return {
    ...(data as unknown as Chat),
    id: docId,
    bookingId: (data.bookingId as string) || docId,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    lastMessageAt: toMillis(data.lastMessageAt),
    lastMessage: lastMessage
      ? {
          ...lastMessage,
          timestamp: toMillis(lastMessage.timestamp),
        }
      : null,
  }
}

function DashboardHomePageContent() {
  const { isLoaded, isAuthorized } = useRequireRole('client')
  const { user } = useUser()
  const [profile, setProfile] = useState<Client | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [recentChats, setRecentChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    completedBookings: 0,
    totalSpent: 0,
    upcomingBookings: 0,
    activePets: 0,
  })
  const now = new Date()
  const recentBookings = bookings
    .filter((b) => b.status === 'completed')
    .sort((a, b) => new Date(b.startDate || b.createdAt || 0).getTime() - new Date(a.startDate || a.createdAt || 0).getTime())
    .slice(0, 4)

  const upcomingBookings = bookings
    .filter((b) => {
      if (b.status === 'cancelled' || b.status === 'completed') return false
      const bookingDate = b.startDate ? parseISO(b.startDate) : null
      return bookingDate && isAfter(bookingDate, now)
    })
    .sort((a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime())
    .slice(0, 4)

  const displayBookings = upcomingBookings.length > 0 ? upcomingBookings : recentBookings
  const { railRef: bookingRailRef, clampedDotIndex: bookingRailDotIndex, onScroll: handleBookingRailScroll } = useRailScroll({
    slideSelector: '[data-dashboard-booking-slide="true"]',
    itemCount: displayBookings.length,
  })

  useEffect(() => {
    if (!user) return
    const userId = user.id

    async function fetchDashboardData() {
      setLoading(true)
      try {
        const clientProfile = await getClientProfile(userId)
        setProfile(clientProfile)

        const clientBookings = await getBookingsForClient(userId)
        setBookings(clientBookings)

        try {
          const chatsQuery = query(collection(db, 'chats'), where('client.userId', '==', userId))
          const chatsSnapshot = await getDocs(chatsQuery)
          const chats = chatsSnapshot.docs
            .map((docSnapshot) => normalizeChat(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
            .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
          setRecentChats(chats)
        } catch (chatError) {
          console.warn('Failed to fetch recent chats:', chatError)
        }

        if (clientProfile?.stripeCustomerId) {
          try {
            const pmRes = await fetch('/api/stripe/list-payment-methods', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customerId: clientProfile.stripeCustomerId }),
            })
            if (pmRes.ok) {
              const { paymentMethods } = await pmRes.json()
              setPaymentMethods(paymentMethods || [])
            }
          } catch (error) {
            console.warn('Failed to fetch payment methods:', error)
          }
        }

        const now = new Date()
        const completedBookings = clientBookings.filter((b) => b.status === 'completed').length
        const totalSpent = clientBookings
          .filter((b) => b.paymentStatus === 'paid')
          .reduce((sum, b) => sum + (b.paymentAmount || 0), 0)
        const upcomingBookings = clientBookings.filter((b) => {
          if (b.status === 'cancelled' || b.status === 'completed') return false
          const bookingDate = b.startDate ? parseISO(b.startDate) : null
          return bookingDate && isAfter(bookingDate, now)
        }).length

        setStats({
          completedBookings,
          totalSpent,
          upcomingBookings,
          activePets: clientProfile?.pets?.length || 0,
        })
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  if (!isLoaded || !isAuthorized) {
    return (
      <DashboardPageShell className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="font-medium text-slate-600">Loading your dashboard...</p>
        </div>
      </DashboardPageShell>
    )
  }

  if (loading) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <DashboardPageContent>
          <div className="space-y-6 animate-pulse">
            <div className="h-8 w-1/3 rounded bg-slate-200"></div>
            <div className="h-36 rounded-3xl bg-slate-200"></div>
            <div className="h-80 rounded-3xl bg-slate-200"></div>
          </div>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }

  const bookingsTitle = upcomingBookings.length > 0 ? 'Upcoming Bookings' : 'Recent Bookings'
  const nextBooking = upcomingBookings[0]
  const defaultPaymentMethod = paymentMethods.find((pm) => pm.isDefault) || paymentMethods[0]
  const pets = profile?.pets || []
  const petsWithMeds = pets.filter((pet) => Boolean(pet.medications)).length
  const petNameById = Object.fromEntries(pets.map((pet) => [pet.id, pet.name])) as Record<string, string>
  const highlightedChat = recentChats.find((chat) => chat.clientUnreadMessages > 0) || recentChats[0]
  const unreadChats = recentChats.reduce((count, chat) => count + (chat.clientUnreadMessages > 0 ? 1 : 0), 0)

  const contractorSummary = Object.values(
    bookings.reduce<Record<string, { contractorId: string; contractorName: string; bookingCount: number; latestBooking: Booking; latestActionableBooking?: Booking }>>((acc, booking) => {
      if (!acc[booking.contractorId]) {
        acc[booking.contractorId] = {
          contractorId: booking.contractorId,
          contractorName: booking.contractorName,
          bookingCount: 0,
          latestBooking: booking,
          latestActionableBooking: undefined,
        }
      }

      acc[booking.contractorId].bookingCount += 1

      const currentLatest = new Date(acc[booking.contractorId].latestBooking.startDate || acc[booking.contractorId].latestBooking.createdAt || 0).getTime()
      const candidateLatest = new Date(booking.startDate || booking.createdAt || 0).getTime()

      if (candidateLatest > currentLatest) {
        acc[booking.contractorId].latestBooking = booking
      }

      if (booking.status === 'pending' || booking.status === 'approved') {
        const actionable = acc[booking.contractorId].latestActionableBooking
        const actionableTime = actionable ? new Date(actionable.startDate || actionable.createdAt || 0).getTime() : 0
        if (!actionable || candidateLatest > actionableTime) {
          acc[booking.contractorId].latestActionableBooking = booking
        }
      }

      return acc
    }, {})
  ).sort((a, b) => b.bookingCount - a.bookingCount || new Date(b.latestBooking.startDate || b.latestBooking.createdAt || 0).getTime() - new Date(a.latestBooking.startDate || a.latestBooking.createdAt || 0).getTime())[0]

  const contractorChat = contractorSummary ? recentChats.find((chat) => chat.contractor.userId === contractorSummary.contractorId) : undefined

  const getAnimalIcon = (animalType?: string) => {
    switch (animalType?.toLowerCase()) {
      case 'dog':
        return '🐕'
      case 'cat':
        return '🐱'
      case 'bird':
        return '🐦'
      case 'rabbit':
        return '🐰'
      case 'fish':
        return '🐠'
      default:
        return '🐾'
    }
  }

  return (
    <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <DashboardPageContent className="space-y-4 pb-12 sm:space-y-5 lg:space-y-7">
        <Card className="overflow-hidden rounded-[1.75rem] border-primary/10 bg-gradient-to-r from-white via-blue-50/70 to-indigo-50/70 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
                  Dashboard
                </Badge>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="h-12 w-12 border-4 border-white shadow-md sm:h-16 sm:w-16">
                  <AvatarImage src={profile?.avatar || user?.imageUrl} alt={profile?.name || user?.fullName || 'User'} objectPosition="center" />
                  <AvatarFallback className="bg-primary/10 text-base font-bold text-primary sm:text-xl">
                    {(profile?.name || user?.fullName || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                    Welcome back, {profile?.name?.split(' ')[0] || user?.firstName || 'there'}
                  </h1>
                  <p className="mt-1 text-sm leading-6 text-slate-600 sm:text-[15px]">Pick up where you left off with bookings, messages, and care setup.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className="border-blue-200 bg-blue-100 text-[11px] text-blue-700 sm:text-xs">{stats.upcomingBookings} upcoming</Badge>
                <Badge className="border-green-200 bg-green-100 text-[11px] text-green-700 sm:text-xs">{stats.completedBookings} completed</Badge>
                <Badge className="border-yellow-200 bg-yellow-100 text-[11px] text-amber-700 sm:text-xs">{stats.activePets} pets</Badge>
                <Badge className="border-purple-200 bg-purple-100 text-[11px] text-purple-700 sm:text-xs">${stats.totalSpent.toFixed(0)} spent</Badge>
                {unreadChats > 0 ? <Badge className="border-slate-200 bg-white text-[11px] text-slate-700 sm:text-xs">{unreadChats} unread chats</Badge> : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-xl">
                  <Package className="h-5 w-5 text-primary" />
                  {bookingsTitle}
                </CardTitle>
                <p className="mt-1 text-[11px] text-slate-500 sm:text-sm">
                  {nextBooking?.startDate ? `Next visit on ${format(parseISO(nextBooking.startDate), 'MMM d, yyyy')}` : 'Browse your latest booking activity'}
                </p>
              </div>
              <Link href="/dashboard/bookings">
                <Button variant="outline" size="pillSm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {displayBookings.length > 0 ? (
              <>
                <div className="-mx-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:py-0">
                  <div ref={bookingRailRef} onScroll={handleBookingRailScroll} className="flex snap-x snap-mandatory gap-4 overscroll-x-contain overflow-x-auto scroll-px-[12vw] pl-[12vw] pr-[12vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:block sm:space-y-3 sm:overflow-visible sm:pl-0 sm:pr-0 sm:scroll-px-0">
                  {displayBookings.map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/dashboard/bookings?bookingId=${booking.id}`}
                      data-dashboard-booking-slide="true"
                      className="block w-[76vw] min-w-[16.25rem] max-w-[17.5rem] shrink-0 snap-center snap-always sm:w-auto sm:min-w-0 sm:max-w-none"
                    >
                      <Card className="h-full rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                        <CardContent className="p-3.5 sm:p-4">
                          <div className="mb-2.5 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{booking.contractorName}</p>
                              <p className="truncate text-xs text-slate-600 sm:text-sm">
                                {booking.services?.length
                                  ? booking.services.map((service) => service.name || service.serviceId).join(', ')
                                  : booking.serviceType || 'Pet care service'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={booking.status} size="compact" capitalize={false} />
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white ring-1 ring-slate-200 sm:h-9 sm:w-9">
                                <ArrowUpRight className="h-4 w-4 text-slate-700" />
                              </div>
                            </div>
                          </div>

                          <div className="mb-3 space-y-1.5 text-xs text-slate-700 sm:text-sm">
                            <p className="truncate">
                              <span className="font-semibold text-slate-900">Pets:</span>{' '}
                              {booking.petIds?.length
                                ? booking.petIds.map((id) => petNameById[id]).filter(Boolean).join(', ') || `${booking.petIds.length} pets`
                                : 'Not specified'}
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-700 sm:gap-2 sm:text-xs">
                            <div className="rounded-lg bg-blue-50 px-2 py-1.5 ring-1 ring-blue-200">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">Date</div>
                              <div className="mt-1 font-medium text-slate-900">
                                {booking.startDate ? format(parseISO(booking.startDate), 'MMM d') : 'TBD'}
                              </div>
                            </div>
                            <div className="rounded-lg bg-purple-50 px-2 py-1.5 ring-1 ring-purple-200">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-700">Time</div>
                              <div className="mt-1 font-medium text-slate-900">{booking.time?.startTime || 'TBD'}</div>
                            </div>
                            <div className="rounded-lg bg-green-50 px-2 py-1.5 ring-1 ring-green-200">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-green-700">Total</div>
                              <div className="mt-1 font-medium text-slate-900">${booking.paymentAmount?.toFixed(2) || '0.00'}</div>
                            </div>
                          </div>

                          {booking.couponCode && (
                            <div className="mt-3 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-green-100 px-2.5 py-2 text-[11px] sm:px-3 sm:text-xs">
                              <span className="font-medium text-green-700">Coupon {booking.couponCode}</span>
                              <span className="ml-2 font-medium text-green-600">-${(booking.couponDiscount || 0).toFixed(2)}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                  </div>
                </div>
                <RailDots count={displayBookings.length} activeIndex={bookingRailDotIndex} />
              </>
            ) : (
              <EmptyState
                icon={<Calendar className="h-12 w-12 text-slate-400" />}
                title="No bookings yet"
                description="Book your first pet care service to get started"
              >
                <Link href="/dashboard/contractors">
                  <Button variant="petCta" size="pill" leftIcon={<Plus className="h-4 w-4" />}>
                    Find Pet Care Professionals
                  </Button>
                </Link>
              </EmptyState>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          <Card className="border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-xl">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  Messages
                </CardTitle>
                <Link href="/dashboard/messages">
                  <Button variant="outline" size="pillSm">Open</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {highlightedChat ? (
                <Link href={`/dashboard/messages/${highlightedChat.id}`} className="block rounded-[1.5rem] border border-slate-200 bg-white/90 p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm sm:h-12 sm:w-12">
                      <AvatarImage src={highlightedChat.contractor.avatarUrl} alt={highlightedChat.contractor.displayName} className="object-cover" />
                      <AvatarFallback className="bg-blue-100 font-semibold text-blue-700">
                        {highlightedChat.contractor.displayName[0]?.toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{highlightedChat.contractor.displayName}</p>
                        <div className="flex items-center gap-2">
                          {highlightedChat.clientUnreadMessages > 0 && (
                            <Badge className="border-blue-200 bg-blue-100 text-[11px] text-blue-700 sm:text-xs">
                              {highlightedChat.clientUnreadMessages} new
                            </Badge>
                          )}
                          <span className="text-[11px] text-slate-500 sm:text-xs">{formatDistanceToNow(highlightedChat.lastMessageAt, { addSuffix: true })}</span>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-slate-600 sm:text-sm">
                        {highlightedChat.lastMessage?.text || 'Open this conversation to continue planning your care.'}
                      </p>
                    </div>
                  </div>
                </Link>
              ) : (
                <EmptyState
                  icon={<MessageCircle className="h-10 w-10 text-slate-400" />}
                  title="No conversations yet"
                  description="Messages with contractors will show up here once a booking conversation starts."
                  className="bg-white/70 p-6"
                />
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-gradient-to-br from-purple-50 via-white to-pink-50 shadow-sm transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-xl">
                  <Repeat2 className="h-5 w-5 text-purple-600" />
                  Your Go-To Contractor
                </CardTitle>
                {contractorSummary && (
                  <Badge className="hidden border-purple-200 bg-purple-100 text-purple-700 sm:inline-flex">
                    {contractorSummary.bookingCount} bookings
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {contractorSummary ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-3.5 shadow-sm sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 sm:text-lg">{contractorSummary.contractorName}</p>
                      <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                        Last booking {formatDistanceToNow(new Date(contractorSummary.latestBooking.startDate || contractorSummary.latestBooking.createdAt || Date.now()), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/dashboard/contractors?contractorId=${contractorSummary.contractorId}`}>
                      <Button variant="outline" size="pillSm" leftIcon={<Search className="h-3.5 w-3.5" />} className="h-7 px-2.5 text-xs">
                        View Profile
                      </Button>
                    </Link>
                    {contractorSummary.latestActionableBooking ? (
                      <Link href={`/dashboard/bookings?bookingId=${contractorSummary.latestActionableBooking.id}`}>
                        <Button variant="petCta" size="pillSm" className="h-7 px-2.5 text-xs">Open Booking</Button>
                      </Link>
                    ) : contractorChat ? (
                      <Link href={`/dashboard/messages/${contractorChat.id}`}>
                        <Button variant="petCta" size="pillSm" leftIcon={<MessageCircle className="h-3.5 w-3.5" />} className="h-7 px-2.5 text-xs">
                          Message
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/dashboard/contractors?contractorId=${contractorSummary.contractorId}`}>
                        <Button variant="petCta" size="pillSm" className="h-7 px-2.5 text-xs">Book Again</Button>
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<Repeat2 className="h-10 w-10 text-slate-400" />}
                  title="No repeat contractor yet"
                  description="After a few visits, your most-booked contractor will show up here."
                  className="bg-white/70 p-6"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          <Card className="border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-xl">
                  <Heart className="h-5 w-5 text-red-500" />
                  Your Pets
                </CardTitle>
                <Link href="/dashboard/pets">
                  <Button variant="outline" size="pillSm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {pets.length > 0 ? (
                <div className="space-y-3">
                  {pets.map((pet) => (
                    <div key={pet.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 transition-colors hover:bg-slate-100 sm:p-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm sm:h-11 sm:w-11">
                          <AvatarImage src={pet.photoUrl} alt={pet.name} className="object-cover" />
                          <AvatarFallback className="bg-primary/10 font-bold text-primary">{pet.name[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 text-base">{getAnimalIcon(pet.animalType)}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{pet.name}</p>
                        <p className="truncate text-xs text-slate-600 sm:text-sm">
                          {pet.age} years old{pet.breed ? ` • ${pet.breed}` : ''}
                        </p>
                      </div>
                      {pet.medications && (
                        <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-xs text-yellow-700">Meds</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<PawPrint className="h-12 w-12 text-slate-400" />}
                  title="No pets added yet"
                  description="Add your furry friends to get started"
                >
                  <Link href="/dashboard/pets">
                    <Button variant="petCta" size="pill" leftIcon={<Plus className="h-4 w-4" />}>
                      Add Your First Pet
                    </Button>
                  </Link>
                </EmptyState>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-xl">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Setup
                </CardTitle>
                <Link href="/dashboard/payments">
                  <Button variant="outline" size="pillSm">Manage</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {defaultPaymentMethod ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white shadow-sm sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-300 sm:text-sm">Default Card</p>
                      <p className="mt-1 text-base font-semibold text-white sm:text-lg">•••• •••• •••• {defaultPaymentMethod.last4}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-400 sm:text-xs">{defaultPaymentMethod.brand || 'Card ready'}</p>
                    </div>
                    <div className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-200 sm:px-3 sm:text-xs">
                      {defaultPaymentMethod.expMonth?.toString().padStart(2, '0')}/{defaultPaymentMethod.expYear?.toString().slice(-2)}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<CreditCard className="h-10 w-10 text-slate-400 sm:h-12 sm:w-12" />}
                  title="No payment method on file"
                  description="Add a payment method to start booking services"
                  titleClassName="text-sm font-medium text-slate-600 sm:text-base"
                  descriptionClassName="text-xs text-slate-500 sm:text-sm"
                  className="py-6 sm:py-8"
                >
                  <Link href="/dashboard/payments">
                    <Button variant="petCta" size="pill" leftIcon={<Plus className="h-4 w-4" />}>
                      Add Payment Method
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

export default function DashboardHomePage() {
  return (
    <Suspense
      fallback={
        <DashboardPageShell className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="space-y-4 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="font-medium text-slate-600">Loading your dashboard...</p>
          </div>
        </DashboardPageShell>
      }
    >
      <DashboardHomePageContent />
    </Suspense>
  )
}
