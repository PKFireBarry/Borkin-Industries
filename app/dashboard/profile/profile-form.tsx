'use client'

import { useState } from 'react'
import type { Client } from '@/types/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateClientProfile } from '@/lib/firebase/client'
import { useUser } from '@clerk/nextjs'

interface ProfileFormProps {
  initialProfile: Client | null
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const { user } = useUser()
  const [form, setForm] = useState({
    name: initialProfile?.name || '',
    address: initialProfile?.address || '',
    phone: initialProfile?.phone || '',
    email: initialProfile?.email || '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(false)
    try {
      if (!user) throw new Error('User not found')
      await updateClientProfile(user.id, form)
      setSuccess(true)
    } catch (err) {
      setError('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Update profile form">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
        <Input id="name" name="name" value={form.name} onChange={handleChange} required autoComplete="name" />
      </div>
      <div>
        <label htmlFor="address" className="block text-sm font-medium mb-1">Address</label>
        <Input id="address" name="address" value={form.address} onChange={handleChange} autoComplete="street-address" />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone</label>
        <Input id="phone" name="phone" value={form.phone} onChange={handleChange} required autoComplete="tel" />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
        <Input id="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" type="email" />
      </div>
      {error && <div className="text-destructive text-sm">{error}</div>}
      {success && <div className="text-success text-sm">Profile updated!</div>}
      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
} 