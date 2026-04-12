"use client"
import { Suspense, useEffect, useState } from 'react'
import { useRequireRole } from '../../use-require-role'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { getContractorProfile, updateContractorProfile } from '@/lib/firebase/contractors'
import { getClientById } from '@/lib/firebase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Clock,
  CheckCircle,
  AlertCircle,
  CalendarX
} from 'lucide-react'
import { TimeBasedAvailabilityCalendar, type AvailabilityCalendarBooking } from './components/time-based-availability-calendar'
import type { DayAvailability } from '@/types/contractor'
import { getGigsForContractor } from '@/lib/firebase/bookings'
import { DashboardPageContent, DashboardPageHeader, DashboardPageShell } from '../../components/dashboard-shell'

function ContractorAvailabilityPageContent() {
  const { isLoaded, isAuthorized } = useRequireRole('contractor')
  const { user } = useUser()
  const [dailyAvailability, setDailyAvailability] = useState<DayAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [existingBookings, setExistingBookings] = useState<AvailabilityCalendarBooking[]>([])

  useEffect(() => {
    if (!user) return
    setLoading(true)

    Promise.all([
      getContractorProfile(user.id),
      getGigsForContractor(user.id)
    ])
      .then(async ([profile, bookings]) => {
        const availability = profile?.availability

        // Load time-based availability if it exists
        if (availability?.dailyAvailability) {
          setDailyAvailability(availability.dailyAvailability)
        }

        const activeBookings = bookings.filter(b => b.status === 'approved' || b.status === 'completed')
        const uniqueClientIds = [...new Set(activeBookings.map((booking) => booking.clientId).filter(Boolean))]
        const clientEntries = await Promise.all(
          uniqueClientIds.map(async (clientId) => [clientId, await getClientById(clientId)] as const)
        )
        const clientsById = new Map(clientEntries)

        setExistingBookings(
          activeBookings.map((booking) => ({
            ...booking,
            clientName: clientsById.get(booking.clientId)?.name || 'Client'
          }))
        )
      })
      .catch(() => setError('Failed to load availability'))
      .finally(() => setLoading(false))
  }, [user])

  const handleAvailabilityChange = (newAvailability: DayAvailability[]) => {
    setDailyAvailability(newAvailability)
  }



  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      // Save time-based availability
      await updateContractorProfile(user.id, {
        availability: {
          availableSlots: [],
          unavailableDates: [],
          ranges: [],
          dailyAvailability
        }
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  const getTotalBlockedPeriods = () => {
    const fullyBlockedDays = dailyAvailability.filter(day => day.isFullyUnavailable).length
    const partiallyBlockedDays = dailyAvailability.filter(day =>
      !day.isFullyUnavailable && day.unavailableSlots && day.unavailableSlots.length > 0
    ).length
    const totalTimeSlots = dailyAvailability.reduce((total, day) =>
      total + (day.unavailableSlots?.length || 0), 0
    )
    return { fullyBlockedDays, partiallyBlockedDays, totalTimeSlots }
  }

  const { fullyBlockedDays, partiallyBlockedDays, totalTimeSlots } = getTotalBlockedPeriods()

  if (!isLoaded || !isAuthorized) {
    return (
      <DashboardPageShell className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/60">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="font-medium text-slate-600">Loading availability...</p>
        </div>
      </DashboardPageShell>
    )
  }

  if (loading) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/60">
        <DashboardPageContent className="space-y-6 pb-8 pt-5 sm:space-y-8 lg:pb-12">
          <DashboardPageHeader
            variant="summary"
            title="Availability Calendar"
            description="Manage your availability with precise time control."
            eyebrow={
              <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
                Contractor availability
              </Badge>
            }
          />
          <div className="animate-pulse space-y-8">
            <div className="bg-slate-200 rounded-xl h-96"></div>
          </div>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/60">
      <DashboardPageContent className="space-y-6 pb-8 pt-5 sm:space-y-8 lg:flex lg:min-h-[calc(100dvh-4rem)] lg:flex-col lg:pb-6">
        <DashboardPageHeader
          variant="summary"
          title="Availability Calendar"
          description="Manage your availability with precise time control so clients always see an accurate schedule."
          eyebrow={
            <>
              <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
                Contractor availability
              </Badge>
              <Badge variant="secondary" className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                {existingBookings.length} active bookings
              </Badge>
            </>
          }
          meta={
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-white/80 text-slate-700 border-slate-300">
                <CalendarX className="mr-1 h-4 w-4" />
                {fullyBlockedDays} full days blocked
              </Badge>
              {partiallyBlockedDays > 0 ? (
                <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">
                  <Clock className="mr-1 h-4 w-4" />
                  {partiallyBlockedDays} partial days
                </Badge>
              ) : null}
              {totalTimeSlots > 0 ? (
                <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">
                  <Clock className="mr-1 h-4 w-4" />
                  {totalTimeSlots} blocked time slots
                </Badge>
              ) : null}
            </div>
          }
          actions={
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="petCta"
              size="pill"
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Save Availability
                </>
              )}
            </Button>
          }
        />

      <div className="space-y-4 lg:min-h-0 lg:flex-1">
        {/* Calendar Content */}
        <TimeBasedAvailabilityCalendar
          dailyAvailability={dailyAvailability}
          onAvailabilityChange={handleAvailabilityChange}
          existingBookings={existingBookings}
        />

        {(error || success) ? (
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
          <CardContent className="pt-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700">Availability saved successfully!</span>
              </div>
            )}
          </CardContent>
        </Card>
        ) : null}
      </div>
      </DashboardPageContent>
    </DashboardPageShell>
  )
}

export default function ContractorAvailabilityPage() {
  return (
    <Suspense fallback={null}>
      <ContractorAvailabilityPageContent />
    </Suspense>
  )
}
