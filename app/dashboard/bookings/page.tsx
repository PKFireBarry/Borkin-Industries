"use client"
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { getBookingsForClient } from '@/lib/firebase/bookings'
import { BookingList } from './booking-list'
import { BookingRequestForm } from './booking-request-form'
import { useRequireRole } from '../use-require-role'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useProfileValidation } from '@/hooks/use-profile-validation'
import { ProfileValidationModal } from '@/components/profile-validation-modal'
import { DashboardPageContent, DashboardPageHeader, DashboardPageShell } from '../components/dashboard-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ModalShell } from '../components/modal-shell'

function BookingsPageContent() {
  const { isLoaded, isAuthorized } = useRequireRole('client')
  const { user } = useUser()
  const searchParams = useSearchParams()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const { validateBeforeBooking, isValidationModalOpen, validationError, closeValidationModal, isChecking } = useProfileValidation()
  const initialBookingId = searchParams.get('bookingId')
  const emailAction = searchParams.get('emailAction')

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getBookingsForClient(user.id)
      .then((data) => setBookings(data))
      .finally(() => setLoading(false))
  }, [user])

  const handleNewBookingClick = async () => {
    const isValid = await validateBeforeBooking()
    if (isValid) {
      setIsNewBookingOpen(true)
    }
  }

  const handleNewBookingSuccess = async () => {
    setIsNewBookingOpen(false)
    if (!user) return
    setLoading(true)
    try {
      const latest = await getBookingsForClient(user.id)
      setBookings(latest)
    } catch (err) {
      console.error('Error refreshing bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || !isAuthorized || loading) {
    return (
      <DashboardPageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-slate-600 font-medium">Loading your bookings...</p>
          </div>
        </div>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <DashboardPageContent className="space-y-4 pb-8 pt-4 sm:space-y-6 sm:pb-10 sm:pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <DashboardPageHeader
            variant="summary"
            title="Bookings"
            description="Track upcoming care, review completed visits, and manage changes without leaving the dashboard."
            surfaceClassName="from-white via-blue-50/70 to-indigo-50/60"
            eyebrow={
              <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
                Booking hub
              </Badge>
            }
            actions={
              <Button
                onClick={handleNewBookingClick}
                variant="petCta"
                size="pill"
                disabled={isChecking}
                className="w-full sm:w-auto"
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {isChecking ? 'Checking profile...' : 'New Booking'}
              </Button>
            }
            meta={
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 sm:text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <span>{bookings.length} total</span>
                </div>
                <TabsList className="grid h-11 w-full grid-cols-5 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm sm:h-12">
                  <TabsTrigger
                    value="all"
                    className="rounded-xl px-1 text-[11px] font-medium transition-all duration-200 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-2 sm:text-sm"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="pending"
                    className="rounded-xl px-1 text-[11px] font-medium transition-all duration-200 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-2 sm:text-sm"
                  >
                    Pending
                  </TabsTrigger>
                  <TabsTrigger
                    value="approved"
                    className="rounded-xl px-1 text-[11px] font-medium transition-all duration-200 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-2 sm:text-sm"
                  >
                    Approved
                  </TabsTrigger>
                  <TabsTrigger
                    value="completed"
                    className="rounded-xl px-1 text-[11px] font-medium transition-all duration-200 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-2 sm:text-sm"
                  >
                    Completed
                  </TabsTrigger>
                  <TabsTrigger
                    value="cancelled"
                    className="rounded-xl px-1 text-[11px] font-medium transition-all duration-200 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-2 sm:text-sm"
                  >
                    Cancelled
                  </TabsTrigger>
                </TabsList>
              </div>
            }
          />
          <BookingList
            bookings={bookings}
            onNewBooking={handleNewBookingClick}
            initialBookingId={initialBookingId}
            emailAction={emailAction}
            activeTab={activeTab as 'all' | 'pending' | 'approved' | 'completed' | 'cancelled'}
          />
        </Tabs>
      </DashboardPageContent>

      {/* New Booking Modal */}
      {isNewBookingOpen && (
        <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
          <ModalShell aria-labelledby="newBookingTitle">
            <DialogTitle id="newBookingTitle" className="sr-only">New Booking Request</DialogTitle>
            <DialogDescription id="newBookingDescription" className="sr-only">
              Create a new booking request for pet care services.
            </DialogDescription>
            <div className="h-full min-h-0">
              <BookingRequestForm 
                onSuccess={handleNewBookingSuccess}
                onClose={() => setIsNewBookingOpen(false)}
                preselectedContractorId={null}
              />
            </div>
          </ModalShell>
        </Dialog>
      )}

      {/* Profile Validation Modal */}
      {validationError && (
        <ProfileValidationModal
          isOpen={isValidationModalOpen}
          onClose={closeValidationModal}
          error={validationError}
        />
      )}
    </DashboardPageShell>
  )
}

function LoadingFallback() {
  return (
    <DashboardPageShell>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">Loading your bookings...</p>
        </div>
      </div>
    </DashboardPageShell>
  )
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BookingsPageContent />
    </Suspense>
  )
} 
