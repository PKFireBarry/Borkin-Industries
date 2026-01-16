"use client"
import { Suspense, useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { getClientProfile } from '@/lib/firebase/client'
import { ProfileForm } from './profile-form'
import { useRequireRole } from '../use-require-role'

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

  if (!isLoaded || !isAuthorized || loading) return null

  return (
    <section className="w-full">
      <ProfileForm initialProfile={profile} isEditing={false} />
    </section>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageContent />
    </Suspense>
  )
} 