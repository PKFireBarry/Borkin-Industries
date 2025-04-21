import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { getClientProfile } from '@/lib/firebase/client'
import { currentUser } from '@clerk/nextjs/server'

export default async function DashboardHomePage() {
  const user = await currentUser()
  const profile = user ? await getClientProfile(user.id) : null

  const petCount = profile?.pets?.length ?? 0
  const upcomingBookings = profile?.bookingHistory?.length ?? 0 // Adjust logic if you want only future bookings
  const paymentMethods = profile?.paymentMethods?.length ?? 0

  return (
    <section className="max-w-2xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6">Welcome to Your Dashboard</h1>
      <p className="text-muted-foreground mb-8">Here's a quick snapshot of your account. Use the navigation on the left to manage your profile, pets, bookings, and more.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="py-6 text-center">
            <CardTitle>Pets</CardTitle>
            <div className="text-3xl font-bold mt-2">{petCount}</div>
            <div className="text-sm text-muted-foreground">Total pets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <CardTitle>Upcoming Bookings</CardTitle>
            <div className="text-3xl font-bold mt-2">{upcomingBookings}</div>
            <div className="text-sm text-muted-foreground">Next 7 days</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <CardTitle>Payment Methods</CardTitle>
            <div className="text-3xl font-bold mt-2">{paymentMethods}</div>
            <div className="text-sm text-muted-foreground">On file</div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
} 