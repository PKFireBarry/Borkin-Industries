"use client"
import { Suspense, useEffect, useState } from 'react'
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useUser } from '@clerk/nextjs'
import { useRequireRole } from './use-require-role'
import { getClientProfile } from '@/lib/firebase/client'
import { getBookingsForClient } from '@/lib/firebase/bookings'
import type { Client, Pet, PaymentMethod } from '@/types/client'
import type { Booking } from '@/types/booking'
import { 
  CreditCard, 
  PawPrint, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Plus, 
  ArrowRight,
  TrendingUp,
  Heart,
  Star,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Package
} from 'lucide-react'
import Link from 'next/link'
import { format, isAfter, isBefore, addDays, parseISO } from 'date-fns'

interface DashboardStats {
  totalBookings: number
  completedBookings: number
  totalSpent: number
  upcomingBookings: number
  activePets: number
  paymentMethods: number
}

function DashboardHomePageContent() {
  const { isLoaded, isAuthorized } = useRequireRole('client')
  const { user } = useUser()
  const [profile, setProfile] = useState<Client | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    completedBookings: 0,
    totalSpent: 0,
    upcomingBookings: 0,
    activePets: 0,
    paymentMethods: 0
  })

  useEffect(() => {
    if (!user) return
    
    async function fetchDashboardData() {
      setLoading(true)
      try {
        // Fetch client profile
        const clientProfile = await getClientProfile(user!.id)
        setProfile(clientProfile)

        // Fetch bookings
        const clientBookings = await getBookingsForClient(user!.id)
        setBookings(clientBookings)

        // Fetch payment methods if Stripe customer exists
        if (clientProfile?.stripeCustomerId) {
          try {
            const pmRes = await fetch('/api/stripe/list-payment-methods', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customerId: clientProfile.stripeCustomerId }),
            })
            if (pmRes.ok) {
              const { paymentMethods: methods } = await pmRes.json()
              setPaymentMethods(methods || [])
            }
          } catch (error) {
            console.warn('Failed to fetch payment methods:', error)
          }
        }

        // Calculate stats
        const now = new Date()
        const completedBookings = clientBookings.filter(b => b.status === 'completed').length
        const totalSpent = clientBookings
          .filter(b => b.paymentStatus === 'paid')
          .reduce((sum, b) => sum + (b.paymentAmount || 0), 0)
        
        const upcomingBookings = clientBookings.filter(b => {
          if (b.status === 'cancelled' || b.status === 'completed') return false
          const bookingDate = b.startDate ? parseISO(b.startDate) : null
          return bookingDate && isAfter(bookingDate, now)
        }).length

        setStats({
          totalBookings: clientBookings.length,
          completedBookings,
          totalSpent,
          upcomingBookings,
          activePets: clientProfile?.pets?.length || 0,
          paymentMethods: paymentMethods.length
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
        <div className="container mx-auto px-4 py-8">
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
  const bookingsTitle = upcomingBookings.length > 0 ? 'Upcoming Bookings' : 'Recent Bookings'

  // Get default payment method
  const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault) || paymentMethods[0]

  // Get favorite pets (first 3)
  const favoritePets = profile?.pets?.slice(0, 3) || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const getAnimalIcon = (animalType?: string) => {
    switch (animalType?.toLowerCase()) {
      case 'dog': return '🐕'
      case 'cat': return '🐱'
      case 'bird': return '🐦'
      case 'rabbit': return '🐰'
      case 'fish': return '🐠'
      default: return '🐾'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
              <AvatarImage 
                src={profile?.avatar || user?.imageUrl} 
                alt={profile?.name || user?.fullName || 'User'} 
                objectPosition="center"
              />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {(profile?.name || user?.fullName || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                Welcome back, {profile?.name?.split(' ')[0] || user?.firstName || 'there'}! 👋
              </h1>
              <p className="text-slate-600 text-lg">
                Here's what's happening with your pet care
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
                  <p className="text-blue-600 text-sm font-medium">Total Bookings</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.totalBookings}</p>
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
                  <p className="text-green-600 text-sm font-medium">Completed</p>
                  <p className="text-3xl font-bold text-green-900">{stats.completedBookings}</p>
                </div>
                <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Total Spent</p>
                  <p className="text-3xl font-bold text-purple-900">${stats.totalSpent.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Active Pets</p>
                  <p className="text-3xl font-bold text-orange-900">{stats.activePets}</p>
                </div>
                <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                  <PawPrint className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Payment Method Card */}
          <Card className="bg-white shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Payment Method
                </CardTitle>
                                 <Link href="/dashboard/payments">
                   <Button variant="outline" className="rounded-full text-sm px-3 py-1">
                     Manage
                   </Button>
                 </Link>
              </div>
            </CardHeader>
            <CardContent>
              {defaultPaymentMethod ? (
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <p className="text-slate-300 text-sm">Default Card</p>
                        <p className="text-white font-semibold">•••• •••• •••• {defaultPaymentMethod.last4}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-300 text-xs">Expires</p>
                        <p className="text-white text-sm">
                          {defaultPaymentMethod.expMonth?.toString().padStart(2, '0')}/{defaultPaymentMethod.expYear?.toString().slice(-2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="text-slate-300 text-sm uppercase tracking-wider">
                        {profile?.name || user?.fullName || 'Cardholder'}
                      </p>
                      <p className="text-white font-bold text-lg uppercase">
                        {defaultPaymentMethod.brand || 'CARD'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-xl">
                  <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium mb-2">No payment method on file</p>
                  <p className="text-slate-500 text-sm mb-4">Add a payment method to start booking services</p>
                  <Link href="/dashboard/payments">
                    <Button className="rounded-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pets Card */}
          <Card className="bg-white shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Your Pets
                </CardTitle>
                                 <Link href="/dashboard/pets">
                   <Button variant="outline" className="rounded-full text-sm px-3 py-1">
                     View All
                   </Button>
                 </Link>
              </div>
            </CardHeader>
            <CardContent>
              {favoritePets.length > 0 ? (
                <div className="space-y-4">
                  {favoritePets.map((pet) => (
                    <div key={pet.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="relative">
                        <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                          <AvatarImage src={pet.photoUrl} alt={pet.name} className="object-cover" />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {pet.name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 text-lg">
                          {getAnimalIcon(pet.animalType)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{pet.name}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span>{pet.age} years old</span>
                          {pet.breed && (
                            <>
                              <span>•</span>
                              <span>{pet.breed}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {pet.medications && (
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                          Meds
                        </Badge>
                      )}
                    </div>
                  ))}
                  {profile?.pets && profile.pets.length > 3 && (
                    <div className="text-center pt-2">
                      <Link href="/dashboard/pets">
                                                 <Button variant="outline" className="text-primary hover:text-primary/80 text-sm px-3 py-1">
                           View {profile.pets.length - 3} more pets
                           <ArrowRight className="w-4 h-4 ml-1" />
                         </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-xl">
                  <PawPrint className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium mb-2">No pets added yet</p>
                  <p className="text-slate-500 text-sm mb-4">Add your furry friends to get started</p>
                  <Link href="/dashboard/pets">
                    <Button className="rounded-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Pet
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bookings Section */}
        <Card className="bg-white shadow-sm border border-slate-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                {bookingsTitle}
              </CardTitle>
                             <Link href="/dashboard/bookings">
                 <Button variant="outline" className="rounded-full text-sm px-3 py-1">
                   View All
                 </Button>
               </Link>
            </div>
          </CardHeader>
          <CardContent>
            {displayBookings.length > 0 ? (
              <div className="space-y-4">
                {displayBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900">{booking.contractorName}</p>
                        <Badge className={`text-xs px-2 py-1 rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {booking.startDate ? format(parseISO(booking.startDate), 'MMM d, yyyy') : 'Date TBD'}
                          </span>
                        </div>
                        {booking.time?.startTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{booking.time.startTime}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span>${booking.paymentAmount?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                      
                      {/* Coupon Information */}
                      {booking.couponCode && (
                        <div className="mt-2 p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-green-700 font-medium">Coupon: {booking.couponCode}</span>
                            </div>
                            <span className="text-green-600 font-medium">
                              -${(booking.couponDiscount || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                                         <Link href="/dashboard/bookings">
                       <Button variant="outline" className="rounded-full text-sm p-2">
                         <ArrowRight className="w-4 h-4" />
                       </Button>
                     </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-xl">
                <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium mb-2">No bookings yet</p>
                <p className="text-slate-500 text-sm mb-6">Book your first pet care service to get started</p>
                <Link href="/dashboard/contractors">
                  <Button className="rounded-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Find Pet Care Professionals
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/dashboard/contractors">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <p className="font-semibold text-slate-900 mb-1">Book Service</p>
                <p className="text-sm text-slate-600">Find and book pet care professionals</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/pets">
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <PawPrint className="w-6 h-6 text-orange-600" />
                </div>
                <p className="font-semibold text-slate-900 mb-1">Manage Pets</p>
                <p className="text-sm text-slate-600">Add or update your pet profiles</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/payments">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
                <p className="font-semibold text-slate-900 mb-1">Payment Methods</p>
                <p className="text-sm text-slate-600">Manage your payment options</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function DashboardHomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    }>
      <DashboardHomePageContent />
    </Suspense>
  )
} 