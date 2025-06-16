"use client"
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { getClientProfile } from '@/lib/firebase/client'
import { ProfileForm } from './profile-form'
import { useRequireRole } from '../use-require-role'

export default function ProfilePage() {
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
    <section className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Update Profile</h1>
      <ProfileForm initialProfile={profile} isEditing={false} />
    </section>
  )
} 