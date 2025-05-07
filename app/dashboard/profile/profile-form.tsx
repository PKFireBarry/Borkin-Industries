'use client'

import { useState } from 'react'
import type { Client } from '@/types/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateClientProfile } from '@/lib/firebase/client'
import { useUser } from '@clerk/nextjs'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'

interface ProfileFormProps {
  initialProfile: Client | null
}

interface ProfileFormState {
  name: string
  address: string
  city: string
  state: string
  postalCode: string
  phone: string
  email: string
  bio: string
  avatar: string
  emergencyContact: {
    name: string
    phone: string
    relationship: string
  }
  petCareProvider: {
    name: string
    phone: string
    address: string
  }
  emergencyClinic: {
    name: string
    phone: string
    address: string
  }
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const { user } = useUser()
  const [form, setForm] = useState<ProfileFormState>({
    name: initialProfile?.name || '',
    address: initialProfile?.address || '',
    city: initialProfile?.city || '',
    state: initialProfile?.state || '',
    postalCode: initialProfile?.postalCode || '',
    phone: initialProfile?.phone || '',
    email: initialProfile?.email || '',
    bio: initialProfile?.bio || '',
    avatar: initialProfile?.avatar || user?.imageUrl || '',
    emergencyContact: {
      name: initialProfile?.emergencyContact?.name || '',
      phone: initialProfile?.emergencyContact?.phone || '',
      relationship: initialProfile?.emergencyContact?.relationship || '',
    },
    petCareProvider: {
      name: initialProfile?.petCareProvider?.name || '',
      phone: initialProfile?.petCareProvider?.phone || '',
      address: initialProfile?.petCareProvider?.address || '',
    },
    emergencyClinic: {
      name: initialProfile?.emergencyClinic?.name || '',
      phone: initialProfile?.emergencyClinic?.phone || '',
      address: initialProfile?.emergencyClinic?.address || '',
    },
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setForm(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof ProfileFormState] as Record<string, string>),
          [child]: value
        }
      }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
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
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center mb-6 space-y-4">
            <Avatar className="h-24 w-24">
              {form.avatar ? (
                <AvatarImage src={form.avatar} alt={form.name} />
              ) : (
                <AvatarFallback>{form.name.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
            <div className="w-full">
              <Label htmlFor="avatar">Profile Picture URL</Label>
              <Input id="avatar" name="avatar" value={form.avatar} onChange={handleChange} placeholder="https://example.com/profile.jpg" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} required autoComplete="name" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" value={form.phone} onChange={handleChange} required autoComplete="tel" />
            </div>
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" type="email" />
          </div>
          
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell us a bit about yourself"
              className="resize-none"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" value={form.address} onChange={handleChange} autoComplete="street-address" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" value={form.city} onChange={handleChange} autoComplete="address-level2" />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" value={form.state} onChange={handleChange} autoComplete="address-level1" />
            </div>
          </div>

          <div>
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input id="postalCode" name="postalCode" value={form.postalCode} onChange={handleChange} autoComplete="postal-code" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="emergencyContact.name">Name</Label>
            <Input 
              id="emergencyContact.name" 
              name="emergencyContact.name" 
              value={form.emergencyContact.name} 
              onChange={handleChange} 
              placeholder="Full name of emergency contact"
            />
          </div>
          <div>
            <Label htmlFor="emergencyContact.phone">Phone</Label>
            <Input 
              id="emergencyContact.phone" 
              name="emergencyContact.phone" 
              value={form.emergencyContact.phone} 
              onChange={handleChange}
              placeholder="Emergency contact phone number"
            />
          </div>
          <div>
            <Label htmlFor="emergencyContact.relationship">Relationship</Label>
            <Input 
              id="emergencyContact.relationship" 
              name="emergencyContact.relationship" 
              value={form.emergencyContact.relationship} 
              onChange={handleChange}
              placeholder="e.g. Spouse, Parent, Friend"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Primary Pet Care Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="petCareProvider.name">Name</Label>
            <Input 
              id="petCareProvider.name" 
              name="petCareProvider.name" 
              value={form.petCareProvider.name} 
              onChange={handleChange}
              placeholder="Name of veterinarian or clinic"
            />
          </div>
          <div>
            <Label htmlFor="petCareProvider.phone">Phone</Label>
            <Input 
              id="petCareProvider.phone" 
              name="petCareProvider.phone" 
              value={form.petCareProvider.phone} 
              onChange={handleChange}
              placeholder="Provider's phone number"
            />
          </div>
          <div>
            <Label htmlFor="petCareProvider.address">Address</Label>
            <Input 
              id="petCareProvider.address" 
              name="petCareProvider.address" 
              value={form.petCareProvider.address} 
              onChange={handleChange}
              placeholder="Provider's address"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Local Emergency Pet Clinic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="emergencyClinic.name">Name</Label>
            <Input 
              id="emergencyClinic.name" 
              name="emergencyClinic.name" 
              value={form.emergencyClinic.name} 
              onChange={handleChange}
              placeholder="Name of emergency pet clinic"
            />
          </div>
          <div>
            <Label htmlFor="emergencyClinic.phone">Phone</Label>
            <Input 
              id="emergencyClinic.phone" 
              name="emergencyClinic.phone" 
              value={form.emergencyClinic.phone} 
              onChange={handleChange}
              placeholder="Emergency clinic phone number"
            />
          </div>
          <div>
            <Label htmlFor="emergencyClinic.address">Address</Label>
            <Input 
              id="emergencyClinic.address" 
              name="emergencyClinic.address" 
              value={form.emergencyClinic.address} 
              onChange={handleChange}
              placeholder="Emergency clinic address"
            />
          </div>
        </CardContent>
      </Card>

      {error && <div className="text-destructive text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">Profile updated!</div>}
      <Button type="submit" disabled={isSaving} className="w-full">
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
} 