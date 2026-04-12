"use client"
import { Suspense, useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { getClientProfile } from '@/lib/firebase/client'
import { ProfileForm } from './profile-form'
import { useRequireRole } from '../use-require-role'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DashboardPageContent, DashboardPageHeader, DashboardPageShell } from '../components/dashboard-shell'
import { Edit3 } from 'lucide-react'

function ProfilePageContent() {
  const { isLoaded, isAuthorized } = useRequireRole('client')
  const { user } = useUser()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getClientProfile(user.id)
      .then((data) => setProfile(data))
      .finally(() => setLoading(false))
  }, [user])

  if (!isLoaded || !isAuthorized || loading) {
    return (
      <DashboardPageShell className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="font-medium text-slate-600">Loading your profile...</p>
        </div>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <DashboardPageContent className="space-y-4 pb-8 pt-4 sm:space-y-6 sm:pb-10 sm:pt-6 lg:pb-12">
        <DashboardPageHeader
          variant="summary"
          title="My profile"
          description="Keep your contact, location, and emergency care details current so every booking is easier to review and manage."
          surfaceClassName="from-white via-pink-50/55 to-blue-50/70"
          eyebrow={
            <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
              Profile
            </Badge>
          }
          actions={
            <Button
              type="button"
              variant="outline"
              size="pill"
              onClick={() => window.dispatchEvent(new CustomEvent('borkin-profile-enter-edit'))}
              className="h-11 w-full rounded-2xl border-slate-200 bg-white/85 px-5 text-sm sm:h-12 sm:w-auto sm:text-base"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          }
        />

        <section className="w-full">
          <ProfileForm initialProfile={profile} isEditing={false} />
        </section>
      </DashboardPageContent>
    </DashboardPageShell>
  )
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <DashboardPageShell className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
          <div className="space-y-4 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="font-medium text-slate-600">Loading your profile...</p>
          </div>
        </DashboardPageShell>
      }
    >
      <ProfilePageContent />
    </Suspense>
  )
} 
