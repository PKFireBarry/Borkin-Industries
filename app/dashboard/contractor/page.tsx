"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useUser } from '@clerk/nextjs'
import { useRequireRole } from '../use-require-role'
import { getContractorProfile } from '@/lib/firebase/contractors'
import { getGigsForContractor } from '@/lib/firebase/bookings'
import { getClientById } from '@/lib/firebase/client'
import type { Contractor } from '@/types/contractor'
import type { Booking } from '@/types/booking'
import { 
  DollarSign, 
  Star, 
  Calendar, 
  Clock, 
  TrendingUp,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  PawPrint,
  ArrowRight,
  CreditCard,
  Package,
  Users,
  Award
} from 'lucide-react'
import Link from 'next/link'
import { format, isAfter, isBefore, parseISO, subDays } from 'date-fns'

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

export default function ContractorDashboardHome() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const [profile, setProfile] = useState<Contractor | null>(null)
  const [bookings, setBookings] = useState<EnhancedBooking[]>([])
  const [loading, setLoading] = useState(true)
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

  if (!isLoaded || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
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
        </div>
      </div>
    )
  }

  // Get recent and upcoming bookings
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

  // Get recent reviews
  const recentReviews = (profile?.ratings || [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
              <AvatarImage src={profile?.profileImage || user?.imageUrl} alt={profile?.name || user?.fullName || 'Contractor'} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {(profile?.name || user?.fullName || 'C')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                Welcome back, {profile?.name?.split(' ')[0] || user?.firstName || 'there'}! 👋
              </h1>
              <p className="text-slate-600 text-lg">
                Here's your contractor dashboard overview
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Gigs</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.totalGigs}</p>
                </div>
                <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Total Earnings</p>
                  <p className="text-3xl font-bold text-green-900">{formatCurrency(stats.totalEarnings)}</p>
                </div>
                <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Average Rating</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">This Month</p>
                  <p className="text-3xl font-bold text-orange-900">{formatCurrency(stats.thisMonthEarnings)}</p>
                </div>
                <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Payout Information Card */}
          <Card className="bg-white shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Payout Account
                </CardTitle>
                <Link href="/dashboard/contractor/payments">
                  <Button variant="outline" className="rounded-full text-sm px-3 py-1">
                    Manage
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {profile?.stripeAccountId ? (
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <p className="text-slate-300 text-sm">Stripe Connect</p>
                        <p className="text-white font-semibold">Account Connected</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-300 text-xs">Status</p>
                        <p className="text-green-400 text-sm font-semibold">Active</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-slate-300 text-sm">Pending Payouts</p>
                        <p className="text-white font-bold text-lg">{stats.pendingPayouts}</p>
                      </div>
                      <p className="text-white font-bold text-lg uppercase">STRIPE</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-xl">
                  <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium mb-2">No payout account connected</p>
                  <p className="text-slate-500 text-sm mb-4">Connect your bank account to receive payments</p>
                  <Link href="/dashboard/contractor/payments">
                    <Button className="rounded-full">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Connect Account
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Reviews Card */}
          <Card className="bg-white shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Recent Reviews
                </CardTitle>
                <Link href="/dashboard/contractor/reviews">
                  <Button variant="outline" className="rounded-full text-sm px-3 py-1">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentReviews.length > 0 ? (
                <div className="space-y-4">
                  {recentReviews.map((review, index) => (
                    <div key={index} className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} 
                          />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 line-clamp-2">
                          {review.comment || 'No comment provided'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(review.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {profile?.ratings && profile.ratings.length > 3 && (
                    <div className="text-center pt-2">
                      <Link href="/dashboard/contractor/reviews">
                        <Button variant="outline" className="text-primary hover:text-primary/80 text-sm px-3 py-1">
                          View {profile.ratings.length - 3} more reviews
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium mb-2">No reviews yet</p>
                  <p className="text-slate-500 text-sm">Complete your first gig to start receiving reviews</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Gigs Section */}
        <Card className="bg-white shadow-sm border border-slate-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                {bookingsTitle}
              </CardTitle>
              <Link href="/dashboard/contractor/gigs">
                <Button variant="outline" className="rounded-full text-sm px-3 py-1">
                  View All Gigs
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {displayBookings.length > 0 ? (
              <div className="space-y-4">
                {displayBookings.map((booking) => (
                  <div key={booking.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border-2 border-slate-200">
                          <AvatarImage src={booking.clientAvatar} alt={booking.clientName} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                            {booking.clientName?.[0] || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-900">{booking.clientName}</p>
                          <p className="text-sm text-slate-600">
                            {booking.petNames?.join(', ') || `${booking.petIds?.length || 0} pet(s)`}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-600">
                          {booking.startDate ? format(new Date(booking.startDate), 'MMM d, yyyy') : 'Date TBD'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-600">
                          {formatCurrency(booking.netPayout || booking.paymentAmount || 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-600">
                          {booking.services?.length || 1} service(s)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium mb-2">No gigs yet</p>
                <p className="text-slate-500 text-sm mb-4">
                  {upcomingBookings.length === 0 && recentBookings.length === 0 
                    ? "Start accepting gigs to see them here"
                    : "No upcoming gigs scheduled"
                  }
                </p>
                <Link href="/dashboard/contractor/gigs">
                  <Button className="rounded-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    View Available Gigs
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/contractor/profile">
            <Card className="bg-white border border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">Update Profile</h3>
                <p className="text-sm text-slate-600">Manage your contractor profile and services</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/contractor/availability">
            <Card className="bg-white border border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer">
              <CardContent className="p-6 text-center">
                <Calendar className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">Set Availability</h3>
                <p className="text-sm text-slate-600">Update your calendar and availability</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/messages">
            <Card className="bg-white border border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer">
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">Messages</h3>
                <p className="text-sm text-slate-600">Communicate with your clients</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
} 