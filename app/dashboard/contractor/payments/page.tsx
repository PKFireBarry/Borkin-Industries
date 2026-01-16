"use client"
import { Suspense, useEffect, useState } from 'react'
import { useRequireRole } from '../../use-require-role'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { CalendarIcon, DollarSign, TrendingUp, Clock } from 'lucide-react'
import { getPlatformServiceById } from '@/lib/firebase/services'

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

function ContractorPaymentsPageContent() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gigs, setGigs] = useState<PaymentGig[]>([])
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [payoutMethod, setPayoutMethod] = useState<{ last4: string; brand: string } | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [detailGig, setDetailGig] = useState<PaymentGig | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('date-desc')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [stripeOnboardingLoading, setStripeOnboardingLoading] = useState(false)

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
          } catch {
            setPayoutMethod(null)
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
            setGigs(mappedGigs.filter(g => g.paymentStatus === 'paid'))
          } catch (apiError) {
            console.error('Error fetching payouts:', apiError)
            setGigs([])
          }
        } else {
          setPayoutMethod(null)
          setGigs([])
        }
      })
      .catch((profileError) => {
        console.error('Error fetching contractor profile:', profileError)
        setError('Failed to load payments')
      })
      .finally(() => setLoading(false))
  }, [user])

  // Payment summary calculations with new fee structure
  const totalNetPayout = gigs.reduce((acc, gig) => {
    // New fee structure: contractor receives full base service amount
    // Legacy: contractor receives amount minus fees
    if (gig.netPayout !== undefined) {
      return acc + gig.netPayout;
    } else {
      // Legacy calculation for backward compatibility
      return acc + (gig.amount - (gig.platformFee ?? gig.amount * 0.05) - (gig.stripeFee ?? (gig.amount * 0.029 + 0.3)));
    }
  }, 0);
  const totalGrossAmount = gigs.reduce((acc, gig) => acc + gig.amount, 0)
  const totalPlatformFees = gigs.reduce((acc, gig) => acc + (gig.platformFee ?? gig.amount * 0.05), 0)
  const totalStripeFees = gigs.reduce((acc, gig) => acc + (gig.stripeFee ?? (gig.amount * 0.029 + 0.3)), 0)
  const paidGigsCount = gigs.length
  const avgEarningPerGig = paidGigsCount > 0 ? totalNetPayout / paidGigsCount : 0

  // Monthly earnings breakdown
  const getMonthlyEarnings = (): MonthlyEarnings[] => {
    const monthlyData: Record<string, MonthlyEarnings> = {}

    gigs.forEach(gig => {
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
        const netAmount = gig.netPayout !== undefined ? gig.netPayout : (gig.amount - (gig.platformFee ?? gig.amount * 0.05) - (gig.stripeFee ?? (gig.amount * 0.029 + 0.3)));
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

  // Helper for status badge
  function StatusBadge({ status }: { status: string }) {
    let color = 'bg-gray-200 text-gray-700'
    if (status === 'pending') color = 'bg-yellow-100 text-yellow-800'
    if (status === 'approved') color = 'bg-blue-100 text-blue-800'
    if (status === 'completed') color = 'bg-green-100 text-green-800'
    if (status === 'cancelled') color = 'bg-red-100 text-red-800'
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  // Filter and sort gigs
  const filteredGigs = gigs.filter(gig => {
    // Filter by status
    if (activeTab !== 'all' && gig.status !== activeTab) {
      return false
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

  if (!isLoaded || !isAuthorized) return null
  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading payments...</div>
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>

  return (
    <main className="max-w-6xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Payment Dashboard</h1>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Net Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-blue-500 mr-2" />
              <div className="text-2xl font-bold">${totalNetPayout.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Average Per Gig</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
              <div className="text-2xl font-bold">${avgEarningPerGig.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Completed Gigs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-purple-500 mr-2" />
              <div className="text-2xl font-bold">{paidGigsCount}</div>
            </div>
          </CardContent>
        </Card>


        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Paid Gigs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-amber-500 mr-2" />
              <div className="text-2xl font-bold">{paidGigsCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Method UI */}
      {!stripeAccountId ? (
        <div className="mb-6 p-4 border rounded bg-yellow-50 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-medium mb-1">Set up payouts to receive your earnings</div>
            <div className="text-sm text-muted-foreground mb-2">Add a card or bank account to receive payments via Stripe.</div>
          </div>
          <Button
            variant="default"
            onClick={handleStripeOnboarding}
            disabled={stripeOnboardingLoading}
          >
            {stripeOnboardingLoading ? 'Setting up...' : 'Set Up Payouts'}
          </Button>
        </div>
      ) : !payoutMethod ? (
        <div className="mb-6 p-4 border rounded bg-yellow-50 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-medium mb-1">No payout method on file</div>
            <div className="text-sm text-muted-foreground">Add a card or bank account to receive payments via Stripe.</div>
          </div>
          <Button
            variant="outline"
            onClick={handleStripeOnboarding}
            disabled={stripeOnboardingLoading}
          >
            {stripeOnboardingLoading ? 'Setting up...' : 'Add Payout Method'}
          </Button>
        </div>
      ) : (
        <div className="mb-6 p-4 border rounded bg-green-50 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-medium mb-1">Payout Method on File</div>
            <div className="text-sm text-muted-foreground">
              {payoutMethod.brand} •••• {payoutMethod.last4}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleStripeOnboarding}
            disabled={stripeOnboardingLoading}
          >
            {stripeOnboardingLoading ? 'Updating...' : 'Update Payout Method'}
          </Button>
        </div>
      )}

      {/* Monthly Earnings Breakdown */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Monthly Earnings</CardTitle>
          <div className="text-sm text-muted-foreground pt-1">Breakdown of your earnings by month</div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Month</th>
                  <th className="text-right py-3 px-4">Gigs</th>
                  <th className="text-right py-3 px-4">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {monthlyEarnings.length > 0 ? (
                  monthlyEarnings.map((month, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{month.month}</td>
                      <td className="py-3 px-4 text-right">{month.count}</td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">${month.net.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted-foreground">No monthly data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Tabs defaultValue="all" className="w-full sm:w-auto" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Gigs</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search gigs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-[200px]"
            />
          </div>

          <div className="flex items-center gap-2">
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
      </div>

      {/* Paid Gigs List */}
      {filteredGigs.length === 0 ? (
        <div className="text-center p-8 bg-muted/20 rounded-lg">
          <div className="text-muted-foreground">No paid gigs found matching your filters.</div>
          {(searchTerm || activeTab !== 'all') && (
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => {
                setSearchTerm('');
                setActiveTab('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGigs.map(gig => (
            <Card key={gig.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <div>
                  <CardTitle className="text-lg">{gig.serviceName || gig.serviceType}</CardTitle>
                  <div className="text-sm text-muted-foreground">{getGigDisplayDate(gig)}</div>
                </div>
                <StatusBadge status={gig.status} />
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Client</div>
                    <div className="font-medium">{gig.clientName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Animals</div>
                    <div className="font-medium">{gig.petNames || 'None'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Your Earnings</div>
                    <div className="font-medium text-green-600">${(gig.netPayout ?? (gig.amount - (gig.platformFee ?? gig.amount * 0.05) - (gig.stripeFee ?? (gig.amount * 0.029 + 0.3)))).toFixed(2)}</div>
                  </div>
                </div>

                {gig.review && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center">
                      <div className="text-xs text-muted-foreground mr-2">Rating:</div>
                      <div className="flex items-center">
                        <span className="font-medium">{gig.review.rating}</span>
                        <span className="text-yellow-500 ml-1">★</span>
                      </div>
                      {gig.review.comment && (
                        <div className="ml-4 text-sm italic truncate">{gig.review.comment}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="p-6 pt-0 flex justify-end">
                <Button variant="outline" className="ml-auto" onClick={() => setDetailGig(gig)}>
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Gig Details Modal */}
      <Dialog open={!!detailGig} onOpenChange={() => setDetailGig(null)}>
        <DialogContent className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gig Details</DialogTitle>
          </DialogHeader>
          {detailGig && (
            <section className="space-y-6">
              {/* Status & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b pb-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold shadow-sm
                    ${detailGig.status === 'completed' ? 'bg-green-100 text-green-800' :
                      detailGig.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        detailGig.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-200 text-gray-700'}`}
                  >
                    {detailGig.status?.charAt(0).toUpperCase() + detailGig.status?.slice(1)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">Payment Status</span>
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800 capitalize shadow-sm${detailGig.paymentStatus === 'cancelled' ? ' bg-red-100 text-red-800' : ''}`}>
                    {detailGig.paymentStatus}
                  </span>
                </div>
                <div className="col-span-1 sm:col-span-2 mt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 bg-muted/50 rounded-md px-4 py-3 w-full">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground">Date & Time</span>
                      <span className="font-bold text-base flex items-center gap-2 break-words">
                        {getGigDisplayDate(detailGig)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Client Info */}
              <div className="border-b pb-4">
                <span className="text-xs text-muted-foreground">Client</span>
                <div className="font-semibold text-lg mt-1">{detailGig?.clientName}</div>
              </div>
              {/* Animals Info */}
              <div className="border-b pb-4">
                <span className="text-xs text-muted-foreground">Animals</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {detailGig.petNames ? detailGig.petNames.split(',').map(name => (
                    <span key={name} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium shadow-sm">{name}</span>
                  )) : <span className="text-muted-foreground text-sm">None</span>}
                </div>
              </div>
              {/* Payment Information */}
              <div className="border-b pb-4">
                <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                  Payment Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-t pt-3 mt-2">
                    <span className="font-semibold text-base">Your Earnings</span>
                    <span className="font-bold text-green-600 text-xl">${detailGig?.netPayout?.toFixed(2) ?? (((detailGig?.amount || 0) - (detailGig?.platformFee || (detailGig?.amount || 0) * 0.05) - ((detailGig?.amount || 0) * 0.029 + 0.3)).toFixed(2))}</span>
                  </div>
                  <div className="mt-2 p-3 bg-green-50 rounded-md border border-green-200">
                    <p className="text-sm text-green-800">
                      💡 This is the amount you receive. All platform and processing fees are paid separately by the client.
                    </p>
                  </div>
                </div>
              </div>
              {/* Review */}
              {detailGig.review && (
                <div className="border-b pb-4">
                  <div className="text-xs text-muted-foreground mb-2 font-semibold">Review</div>
                  <div className="text-sm">Rating: <span className="font-bold">{detailGig.review.rating}</span></div>
                  {detailGig.review.comment && <div className="text-sm mt-1">"{detailGig.review.comment}"</div>}
                </div>
              )}
              {/* Booking ID */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t pt-4 mt-2">
                <div>
                  <span className="text-xs text-muted-foreground">Booking ID</span>
                  <div className="font-mono break-all text-xs mt-1">{detailGig?.id ?? ''}</div>
                </div>
              </div>
            </section>
          )}
          <DialogFooter>
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setDetailGig(null)}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default function ContractorPaymentsPage() {
  return (
    <Suspense fallback={null}>
      <ContractorPaymentsPageContent />
    </Suspense>
  )
} 