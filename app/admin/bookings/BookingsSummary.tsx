'use client'
import { useMemo } from 'react'
import { Card, CardContent, CardTitle } from '@/components/ui/card'

// Define types for our booking metrics
interface BookingMetrics {
  total: number
  byStatus: Record<string, number>
  byServiceType: Record<string, number>
  byMonth: Record<string, number>
  byPaymentStatus: Record<string, number>
  totalRevenue: number
  averageBookingAmount: number
  completionRate: number
}

// Ideally, this Booking interface would be imported from a shared types file
interface Booking {
  id: string;
  clientId?: string;
  contractorId?: string;
  serviceType?: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  date: string | Date | { seconds: number, nanoseconds: number }; // Allow for Firestore Timestamp object
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'paid' | string;
  paymentStatus?: string;
  paymentAmount?: number;
  stripeCustomerId?: string;
  paymentIntentId?: string;
  petIds?: string[] | string;
  createdAt?: string | Date | { seconds: number, nanoseconds: number }; // Allow for Firestore Timestamp object
  [key: string]: any;
}

export default function BookingsSummary({ bookings }: { bookings: Booking[] }) { // Use Booking interface
  // Calculate metrics from the bookings data
  const metrics = useMemo<BookingMetrics>(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    
    // Initial metrics structure
    const metrics: BookingMetrics = {
      total: bookings.length,
      byStatus: {},
      byServiceType: {},
      byMonth: {},
      byPaymentStatus: {},
      totalRevenue: 0,
      averageBookingAmount: 0,
      completionRate: 0
    }
    
    // Early return for empty bookings
    if (!bookings.length) return metrics
    
    // Status counts
    bookings.forEach(booking => {
      // Count by status
      const status = booking.status || 'unknown'
      metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1
      
      // Count by service type
      const serviceType = booking.serviceType || 'unknown'
      metrics.byServiceType[serviceType] = (metrics.byServiceType[serviceType] || 0) + 1
      
      // Count by payment status
      const paymentStatus = booking.paymentStatus || 'unknown'
      metrics.byPaymentStatus[paymentStatus] = (metrics.byPaymentStatus[paymentStatus] || 0) + 1
      
      // Add to revenue if paid
      if (booking.paymentStatus === 'paid' && booking.paymentAmount) {
        metrics.totalRevenue += booking.paymentAmount
      }
      
      // Group by month for current year
      const dateToCheck = booking.startDate || booking.date
      if (dateToCheck) {
        let dateObject: Date;
        if (typeof dateToCheck === 'string') {
          dateObject = new Date(dateToCheck);
        } else if (dateToCheck instanceof Date) {
          dateObject = dateToCheck;
        } else if (typeof dateToCheck === 'object' && 'seconds' in dateToCheck) {
          // Handle Firestore Timestamp like object for booking.date
          dateObject = new Date((dateToCheck as { seconds: number, nanoseconds: number }).seconds * 1000 + (dateToCheck as { seconds: number, nanoseconds: number }).nanoseconds / 1000000);
        } else {
          // Skip if date format is unrecognized
          return; 
        }

        if (dateObject.getFullYear() === currentYear) {
          const month = dateObject.getMonth()
          metrics.byMonth[month] = (metrics.byMonth[month] || 0) + 1
        }
      }
    })
    
    // Calculate average booking amount (only from paid bookings)
    const paidBookings = bookings.filter(b => b.paymentStatus === 'paid' && b.paymentAmount)
    metrics.averageBookingAmount = paidBookings.length 
      ? metrics.totalRevenue / paidBookings.length 
      : 0
    
    // Calculate completion rate
    const completedCount = metrics.byStatus['completed'] || 0
    const totalNonCancelled = bookings.filter(b => b.status !== 'cancelled').length
    metrics.completionRate = totalNonCancelled ? (completedCount / totalNonCancelled) * 100 : 0
    
    return metrics
  }, [bookings])

  // Helper for percentage calculation with formatting
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Helper for dollar amount formatting
  const formatCurrency = (value: number) => {
    // Value is already in dollars
    return `$${value.toFixed(2)}`
  }

  // Create data for bar chart
  const chartData = useMemo(() => {
    // Get status data for the chart
    const statusData = Object.entries(metrics.byStatus).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: getStatusColor(status)
    }))
    
    return statusData.sort((a, b) => b.value - a.value)
  }, [metrics.byStatus])

  // Get color based on status
  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'bg-yellow-500'
      case 'approved': return 'bg-blue-500'
      case 'completed': return 'bg-green-500'
      case 'cancelled': return 'bg-red-500'
      case 'paid': return 'bg-green-400'
      default: return 'bg-gray-400'
    }
  }

  // Get month name
  function getMonthName(monthIndex: number): string {
    return new Date(0, monthIndex).toLocaleString('default', { month: 'short' })
  }

  // Calculate the highest value in the month data for scaling
  const maxMonthValue = useMemo(() => {
    return Math.max(...Object.values(metrics.byMonth), 1)
  }, [metrics.byMonth])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Bookings Summary</h2>
      
      {/* Top metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <CardTitle className="text-muted-foreground text-sm mb-2">Total Bookings</CardTitle>
            <div className="text-3xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <CardTitle className="text-muted-foreground text-sm mb-2">Total Revenue</CardTitle>
            <div className="text-3xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <CardTitle className="text-muted-foreground text-sm mb-2">Avg. Booking Value</CardTitle>
            <div className="text-3xl font-bold">{formatCurrency(metrics.averageBookingAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <CardTitle className="text-muted-foreground text-sm mb-2">Completion Rate</CardTitle>
            <div className="text-3xl font-bold">{formatPercent(metrics.completionRate)}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <CardTitle className="mb-4">Bookings by Status</CardTitle>
            <div className="space-y-4">
              {chartData.map(item => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                  <div className="w-full bg-accent rounded-full h-2">
                    <div 
                      className={`${item.color} h-2 rounded-full`} 
                      style={{ width: `${(item.value / metrics.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Service type breakdown */}
        <Card>
          <CardContent className="pt-6">
            <CardTitle className="mb-4">Bookings by Service Type</CardTitle>
            <div className="space-y-4">
              {Object.entries(metrics.byServiceType)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([service, count], index) => (
                  <div key={service} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{service}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="w-full bg-accent rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getChartColor(index)}`}
                        style={{ width: `${(count as number / metrics.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Monthly distribution */}
      <Card>
        <CardContent className="pt-6">
          <CardTitle className="mb-4">Monthly Distribution (This Year)</CardTitle>
          <div className="flex items-end h-40 gap-1">
            {Array.from({ length: 12 }).map((_, index) => {
              const count = metrics.byMonth[index] || 0
              const height = maxMonthValue ? `${(count / maxMonthValue) * 100}%` : '0%'
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full relative flex flex-col justify-end" style={{ height: '85%' }}>
                    <div 
                      className="bg-primary w-full rounded-t-md transition-all duration-300 relative group"
                      style={{ height }}
                    >
                      <div className="hidden group-hover:block absolute -top-8 left-1/2 transform -translate-x-1/2 bg-background border rounded px-2 py-1 z-10 text-xs">
                        {count} booking{count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{getMonthName(index)}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Payment metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <CardTitle className="mb-4">Payment Status</CardTitle>
            <div className="flex justify-center">
              <div className="w-full max-w-xs">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-green-200 text-green-800">
                        Paid
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block">
                        {(metrics.byPaymentStatus['paid'] || 0)} / {metrics.total}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-4 mb-4 overflow-hidden text-xs bg-accent rounded-full">
                    <div 
                      style={{ width: `${((metrics.byPaymentStatus['paid'] || 0) / metrics.total) * 100}%` }} 
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                    ></div>
                  </div>
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-yellow-200 text-yellow-800">
                        Pending
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block">
                        {(metrics.byPaymentStatus['pending'] || 0)} / {metrics.total}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-4 mb-4 overflow-hidden text-xs bg-accent rounded-full">
                    <div 
                      style={{ width: `${((metrics.byPaymentStatus['pending'] || 0) / metrics.total) * 100}%` }} 
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-yellow-500"
                    ></div>
                  </div>
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-red-200 text-red-800">
                        Refunded
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block">
                        {(metrics.byPaymentStatus['refunded'] || 0)} / {metrics.total}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-4 overflow-hidden text-xs bg-accent rounded-full">
                    <div 
                      style={{ width: `${((metrics.byPaymentStatus['refunded'] || 0) / metrics.total) * 100}%` }} 
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Top contractors */}
        <Card>
          <CardContent className="pt-6">
            <CardTitle className="mb-4">Top Services by Revenue</CardTitle>
            {Object.entries(metrics.byServiceType)
              .map(([service, count]) => {
                const serviceBookings = bookings.filter(b => b.serviceType === service && b.paymentStatus === 'paid')
                const revenue = serviceBookings.reduce((sum, b) => sum + (b.paymentAmount || 0), 0)
                return { service, count, revenue }
              })
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 5)
              .map((item, index) => (
                <div key={item.service} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getChartColor(index)}`}></div>
                    <span>{item.service}</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(item.revenue)}</span>
                </div>
              ))
            }
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Helper function to get chart colors for different data points
function getChartColor(index: number): string {
  const colors = [
    'bg-primary',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500'
  ]
  return colors[index % colors.length]
} 