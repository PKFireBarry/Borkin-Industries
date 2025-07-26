import { currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/role-helpers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAllContractorApplications } from '@/lib/firebase/contractors'
import { getAllCoupons } from '@/lib/firebase/coupons'
import { getAllBookings } from '@/lib/firebase/bookings'
import { getAllContractors } from '@/lib/firebase/contractors'
import { getAllClients } from '@/lib/firebase/clients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  UserCheck, 
  UserX, 
  FileText, 
  Calendar, 
  CreditCard, 
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const user = await currentUser()
  if (!user || !isAdmin(user)) {
    redirect('/not-authorized')
  }

  // Fetch dashboard data
  const [applications, coupons, bookings, contractors, clients] = await Promise.all([
    getAllContractorApplications(),
    getAllCoupons(),
    getAllBookings(),
    getAllContractors(),
    getAllClients()
  ])

  // Calculate stats with type safety
  const pendingApplications = applications.filter((app: any) => app.status === 'pending').length
  const approvedApplications = applications.filter((app: any) => app.status === 'approved').length
  const rejectedApplications = applications.filter((app: any) => app.status === 'rejected').length
  
  const activeCoupons = coupons.filter((coupon: any) => coupon.isActive).length
  const expiredCoupons = coupons.filter((coupon: any) => 
    coupon.expirationDate && new Date(coupon.expirationDate) < new Date()
  ).length
  
  const recentBookings = bookings.filter((booking: any) => {
    const bookingDate = new Date(booking.createdAt || booking.updatedAt || Date.now())
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return bookingDate > weekAgo
  }).length

  const totalRevenue = bookings.reduce((sum: number, booking: any) => {
    if (booking.paymentStatus === 'paid' && booking.paymentAmount) {
      return sum + booking.paymentAmount // Amount is already in dollars
    }
    return sum
  }, 0)

  const activeContractors = contractors.filter((contractor: any) => 
    contractor.application?.status === 'approved'
  ).length

  const bannedContractors = contractors.filter((contractor: any) => 
    contractor.application?.status === 'rejected'
  ).length

  const activeClients = clients.length
  const bannedClients = clients.filter((client: any) => client.isBanned).length

  // Get recent applications (last 5)
  const recentApplications = applications
    .filter((app: any) => app.status === 'pending')
    .sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })
    .slice(0, 5)

  // Get recent bookings (last 5)
  const recentBookingsList = bookings
    .sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening on the platform.
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Link href="/admin/applications">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Review Applications
            </Button>
          </Link>
          <Link href="/admin/bookings">
            <Button>
              <Calendar className="w-4 h-4 mr-2" />
              View Bookings
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApplications}</div>
            <p className="text-xs text-muted-foreground">
              {pendingApplications > 0 ? 'Needs review' : 'All caught up'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Coupons</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCoupons}</div>
            <p className="text-xs text-muted-foreground">
              {expiredCoupons > 0 && `${expiredCoupons} expired`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Bookings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentBookings}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From paid bookings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Platform Users
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Overview of contractors and clients on the platform
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Contractors</span>
                  <Badge variant="secondary">{activeContractors}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Banned Contractors</span>
                  <Badge variant="destructive">{bannedContractors}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Clients</span>
                  <Badge variant="secondary">{activeClients}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Banned Clients</span>
                  <Badge variant="destructive">{bannedClients}</Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/contractors" className="flex-1">
                <Button variant="outline" className="w-full">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Manage Contractors
                </Button>
              </Link>
              <Link href="/admin/clients" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Clients
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Applications Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Applications Status
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Current status of contractor applications
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Pending</span>
                </div>
                <Badge variant="outline">{pendingApplications}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Approved</span>
                </div>
                <Badge variant="secondary">{approvedApplications}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Rejected</span>
                </div>
                <Badge variant="destructive">{rejectedApplications}</Badge>
              </div>
            </div>
            <Link href="/admin/applications">
              <Button className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Review Applications
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Applications
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest contractor applications requiring review
            </p>
          </CardHeader>
          <CardContent>
            {recentApplications.length > 0 ? (
              <div className="space-y-3">
                {recentApplications.map((app: any) => (
                  <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {app.name || `${app.firstName || ''} ${app.lastName || ''}`.trim()}
                      </p>
                      <p className="text-xs text-muted-foreground">{app.email}</p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                ))}
                {recentApplications.length === 5 && (
                  <Link href="/admin/applications">
                    <Button variant="outline" className="w-full">
                      View All Applications
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending applications</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Bookings
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest booking activity on the platform
            </p>
          </CardHeader>
          <CardContent>
            {recentBookingsList.length > 0 ? (
              <div className="space-y-3">
                {recentBookingsList.map((booking: any) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        ${(booking.paymentAmount || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.services?.[0]?.name || 'Service'}
                      </p>
                    </div>
                    <Badge variant={
                      booking.status === 'completed' ? 'default' :
                      booking.status === 'confirmed' ? 'secondary' :
                      booking.status === 'pending' ? 'outline' :
                      'destructive'
                    }>
                      {booking.status}
                    </Badge>
                  </div>
                ))}
                <Link href="/admin/bookings">
                  <Button variant="outline" className="w-full">
                    View All Bookings
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent bookings</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Common administrative tasks
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/admin/applications" className="block">
              <div className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">Review Applications</h3>
                    <p className="text-sm text-muted-foreground">
                      {pendingApplications} pending applications
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/admin/bookings" className="block">
              <div className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">Manage Bookings</h3>
                    <p className="text-sm text-muted-foreground">
                      View and manage all bookings
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/admin/coupons" className="block">
              <div className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">Coupon Management</h3>
                    <p className="text-sm text-muted-foreground">
                      {activeCoupons} active coupons
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/admin/contractors" className="block">
              <div className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">Contractor Management</h3>
                    <p className="text-sm text-muted-foreground">
                      {activeContractors} active contractors
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/admin/clients" className="block">
              <div className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">Client Management</h3>
                    <p className="text-sm text-muted-foreground">
                      {activeClients} active clients
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/admin/services" className="block">
              <div className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">Platform Services</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage available services
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 