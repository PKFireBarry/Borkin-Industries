import { getClientProfile } from '@/lib/firebase/client'
import { ProfileForm } from './profile-form'
import { currentUser } from '@clerk/nextjs/server'

export default async function ProfilePage() {
  const user = await currentUser()
  const profile = user ? await getClientProfile(user.id) : null

  return (
    <section className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Update Profile</h1>
      <ProfileForm initialProfile={profile} />
    </section>
  )
} 