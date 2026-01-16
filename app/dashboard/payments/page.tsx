"use client"
import { Suspense, useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { getClientProfile } from '@/lib/firebase/client'
import { useRequireRole } from '../use-require-role'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, MoreHorizontal, CheckCircle2, Check, ArrowUpRight, ArrowDownLeft, CreditCard, Activity, TrendingUp, Calendar, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
  date?: string // For backward compatibility
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

// Map brand names to card colors with enhanced visual design
const brandColors: Record<string, {bg: string, text: string, accent: string}> = {
  visa: { bg: 'bg-gradient-to-br from-blue-600 to-blue-700', text: 'text-white', accent: 'border-blue-400' },
  mastercard: { bg: 'bg-gradient-to-br from-red-600 to-red-800', text: 'text-white', accent: 'border-red-400' },
  amex: { bg: 'bg-gradient-to-br from-blue-700 to-blue-900', text: 'text-white', accent: 'border-blue-500' },
  discover: { bg: 'bg-gradient-to-br from-orange-500 to-orange-700', text: 'text-white', accent: 'border-orange-400' },
  default: { bg: 'bg-gradient-to-br from-gray-700 to-gray-900', text: 'text-white', accent: 'border-gray-500' }
};

// Get card logos based on brand
const getCardLogo = (brand: string) => {
  const brandLower = brand.toLowerCase();
  
  if (brandLower === 'visa') {
    return (
      <div className="text-white font-bold italic tracking-wider uppercase">
        VISA
      </div>
    );
  } else if (brandLower === 'mastercard') {
    return (
      <div className="flex items-center space-x-1">
        <div className="w-4 sm:w-6 h-4 sm:h-6 bg-red-500 rounded-full"></div>
        <div className="w-4 sm:w-6 h-4 sm:h-6 bg-yellow-500 rounded-full -ml-2 sm:-ml-3"></div>
      </div>
    );
  } else if (brandLower === 'amex') {
    return (
      <div className="text-white font-bold tracking-wider uppercase">
        AMEX
      </div>
    );
  } else {
    return (
      <div className="text-white font-bold tracking-wider uppercase">
        {brand}
      </div>
    );
  }
};

function PaymentsPageContent() {
  const { isLoaded, isAuthorized } = useRequireRole('client')
  const { user } = useUser()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    async function fetchData() {
      if (!user) return
      setLoading(true)
      setError(null)
      try {
        const profile = await getClientProfile(user.id)
        console.log('[payments] profile:', profile)
        if (!profile?.stripeCustomerId) {
          setError('No Stripe customer ID found.')
          setLoading(false)
          return
        }
        
        // Fetch payment methods
        const methodsRes = await fetch('/api/stripe/list-payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: profile.stripeCustomerId }),
        })
        if (!methodsRes.ok) throw new Error('Failed to fetch payment methods')
        const methodsData = await methodsRes.json()
        setMethods(methodsData.paymentMethods)

        // Fetch payment history
        try {
          const historyRes = await fetch('/api/stripe/list-client-payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              customerId: profile.stripeCustomerId,
              clientId: user.id 
            }),
          })
          if (!historyRes.ok) {
            const errorData = await historyRes.json()
            console.error('[payments] payment history error:', errorData)
            throw new Error('Failed to fetch payment history')
          }
          const historyData = await historyRes.json()
          setPaymentData(historyData)
        } catch (historyError) {
          console.error('[payments] payment history failed, using empty data:', historyError)
          // Set empty payment data so the UI still works
          setPaymentData({
            payments: [],
            completedBookings: [],
            totalSpent: 0,
            totalBookings: 0
          })
        }
        
      } catch (err) {
        setError('Failed to load payment data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  async function handleManagePayments() {
    try {
      const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create portal session')
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      setError('Failed to redirect to Stripe portal')
    }
  }

  if (!isLoaded || !isAuthorized) return null

  // Format MM/YY nicely
  const formatExpiry = (month: number, year: number) => {
    if (!month || !year) return 'MM/YY';
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <main className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Manage your payment methods and view transaction history</p>
        </div>
        <Button onClick={handleManagePayments} className="w-fit">
          <Plus className="w-4 h-4 mr-2" />
          Add Payment Method
        </Button>
          </div>
          
          {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading your payment data...</p>
          </div>
        </div>
          ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive">
              <div className="text-sm font-medium">{error}</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-fit">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Cards
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-xs sm:text-sm font-medium text-blue-700 truncate">Total Spent</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 truncate">
                        {formatCurrency(paymentData?.totalSpent || 0)}
                      </p>
                    </div>
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-xs sm:text-sm font-medium text-green-700 truncate">Completed Bookings</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900 truncate">
                        {paymentData?.totalBookings || 0}
                      </p>
                    </div>
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 sm:col-span-2 lg:col-span-1">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-xs sm:text-sm font-medium text-purple-700 truncate">Payment Methods</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-900 truncate">
                        {methods.length}
                      </p>
                    </div>
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentData?.completedBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm">Your completed bookings will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentData?.completedBookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start space-x-3 min-w-0 flex-1">
                            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <ArrowUpRight className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm sm:text-base truncate">{booking.contractorName}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">{booking.serviceType}</p>
                              <p className="text-xs text-muted-foreground mt-1 sm:hidden">
                                {(() => {
                                  const dateStr = booking.startDate || booking.date;
                                  if (!dateStr) return 'Invalid Date';
                                  try {
                                    return new Date(dateStr).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    });
                                  } catch {
                                    return 'Invalid Date';
                                  }
                                })()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-sm sm:text-base">{formatCurrency(booking.paymentAmount)}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                              {(() => {
                                const dateStr = booking.startDate || booking.date;
                                if (!dateStr) return 'Invalid Date';
                                try {
                                  return new Date(dateStr).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  });
                                } catch {
                                  return 'Invalid Date';
                                }
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cards Tab */}
          <TabsContent value="cards" className="space-y-6">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {methods.map((method) => {
                const brandLower = method.brand?.toLowerCase() || 'default';
                const colors = brandColors[brandLower] || brandColors.default;
                
                return (
                  <div key={method.id} className="relative group perspective-1000">
                    {/* Default card badge */}
                    {method.isDefault && (
                      <div className="absolute -top-2 -right-2 z-10 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center shadow-md">
                        <Check size={12} className="mr-1" />
                        Default
                      </div>
                    )}
                    
                    {/* Card design */}
                    <div 
                      className={`relative ${colors.bg} ${colors.text} rounded-xl h-48 sm:h-52 shadow-lg 
                      transition-all duration-300 overflow-hidden
                      hover:shadow-xl transform-gpu hover:-translate-y-1 
                      border-2 ${method.isDefault ? 'border-green-500' : 'border-transparent'}`}
                    >
                      {/* EMV Chip - more realistic */}
                      <div className="absolute top-4 sm:top-6 left-4 sm:left-6 w-9 sm:w-11 h-6 sm:h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md 
                        border border-yellow-600 overflow-hidden flex items-center justify-center">
                        <div className="w-full h-full grid grid-cols-4 grid-rows-3 gap-px opacity-50">
                          {[...Array(12)].map((_, i) => (
                            <div key={i} className="bg-gray-800"></div>
                          ))}
                        </div>
                      </div>

                      {/* Card Brand Logo - top right */}
                      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 text-base sm:text-xl">
                        {getCardLogo(method.brand || 'Card')}
                      </div>
                      
                      {/* Card Number */}
                      <div className="absolute top-20 sm:top-24 left-4 sm:left-6 right-4 sm:right-6">
                        <div className="text-xs text-white/70 mb-1 uppercase tracking-wider">Card Number</div>
                        <div className="text-base sm:text-lg font-mono tracking-wider">
                          •••• •••• •••• {method.last4}
                        </div>
                      </div>
                      
                      {/* Card Details (Expiry and Name) */}
                      <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 flex justify-between items-end">
                        <div className="flex-shrink-0">
                          <div className="text-xs text-white/70 mb-1 uppercase tracking-wider">Expiry</div>
                          <div className="text-sm font-mono">{formatExpiry(method.expMonth, method.expYear)}</div>
                        </div>
                        
                        <div className="text-right min-w-0 flex-1 ml-4">
                          <div className="text-xs text-white/70 mb-1 uppercase tracking-wider">Name</div>
                          <div className="text-xs sm:text-sm font-mono truncate">{user?.fullName || 'Card Holder'}</div>
                        </div>
                      </div>
                      
                      {/* Decorative network lines */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-16 sm:left-24 top-8 sm:top-10 w-6 sm:w-8 h-6 sm:h-8 border-t-2 border-l-2 border-white/10 rounded-tl-xl"></div>
                        <div className="absolute right-16 sm:right-24 bottom-8 sm:bottom-10 w-8 sm:w-10 h-8 sm:h-10 border-b-2 border-r-2 border-white/10 rounded-br-xl"></div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Add New Card Button */}
              <div 
                className="flex items-center justify-center h-48 sm:h-52 border-2 border-dashed 
                border-gray-300 rounded-xl hover:border-gray-400 transition-colors cursor-pointer
                bg-gray-50 hover:bg-gray-100" 
                onClick={handleManagePayments}
              >
                <div className="flex flex-col items-center text-gray-500">
                  <Plus size={20} className="sm:size-6 mb-2" />
                  <div className="font-medium text-sm sm:text-base">Add another card</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentData?.completedBookings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No payment history</p>
                    <p className="text-sm">Your completed payments will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentData?.completedBookings.map((booking) => (
                      <div key={booking.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start space-x-3 min-w-0 flex-1">
                            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <ArrowUpRight className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div>
                                <p className="font-medium text-sm sm:text-base truncate">{booking.contractorName}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">{booking.serviceType}</p>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <Badge variant="secondary" className="text-xs w-fit">
                                  Completed
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {(() => {
                                    const dateStr = booking.startDate || booking.date;
                                    if (!dateStr) return 'Invalid Date';
                                    try {
                                      return new Date(dateStr).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      });
                                    } catch {
                                      return 'Invalid Date';
                                    }
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right space-y-1 flex-shrink-0">
                            <p className="font-semibold text-base sm:text-lg">{formatCurrency(booking.paymentAmount)}</p>
                            {booking.platformFee && (
                              <p className="text-xs text-muted-foreground">
                                Fee: {formatCurrency(booking.platformFee)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
          </div>
                )}
        </CardContent>
      </Card>
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsPageContent />
    </Suspense>
  )
} 