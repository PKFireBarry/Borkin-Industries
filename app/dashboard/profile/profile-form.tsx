'use client'

import { useState, useEffect } from 'react'
import type { Client } from '@/types/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateClientProfile } from '@/lib/firebase/client'
import { useUser } from '@clerk/nextjs'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { PhotoUpload } from '@/components/PhotoUpload'
import { Save, X, Edit3 } from 'lucide-react'

interface ProfileFormProps {
  initialProfile: Client | null
  isEditing?: boolean
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

export function ProfileForm({ initialProfile, isEditing }: ProfileFormProps) {
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
  const [editing, setEditing] = useState(isEditing ?? false)
  const [originalForm, setOriginalForm] = useState(form)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  useEffect(() => {
    const newForm = {
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
    }
    setForm(newForm)
    setOriginalForm(newForm)
  }, [initialProfile, user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
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
      setEditing(false)
    } catch (err) {
      setError('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (url: string) => {
    setIsUploadingAvatar(true)
    setError(null)
    try {
      if (!user) throw new Error('User not found')
      setForm(prev => ({ ...prev, avatar: url }))
      await updateClientProfile(user.id, { ...form, avatar: url })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Failed to update profile picture')
      console.error('Avatar upload error:', err)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  if (!editing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Profile</h1>
                  <p className="text-slate-600 mt-1">Your personal information and preferences</p>
                </div>
                <Button 
                  type="button" 
                  onClick={() => setEditing(true)}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 py-2 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Personal Information */}
            <Card className="border-0 shadow-sm bg-white rounded-2xl xl:col-span-2">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold text-slate-900">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96 border-4 border-slate-200 shadow-lg">
                    <AvatarImage 
                      src={form.avatar} 
                      alt={form.name} 
                      className="object-cover"
                    />
                    <AvatarFallback className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl bg-slate-100 text-slate-600">
                      {form.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Full Name</Label>
                    <div className="text-slate-900 font-medium">{form.name || 'Not provided'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Phone</Label>
                    <div className="text-slate-900 font-medium">{form.phone || 'Not provided'}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Email</Label>
                  <div className="text-slate-900 font-medium">{form.email || 'Not provided'}</div>
                </div>
                
                {form.bio && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Bio</Label>
                    <div className="text-slate-700 leading-relaxed">{form.bio}</div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Address</Label>
                  <div className="text-slate-900 font-medium">{form.address || 'Not provided'}</div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">City</Label>
                    <div className="text-slate-900 font-medium">{form.city || 'Not provided'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">State</Label>
                    <div className="text-slate-900 font-medium">{form.state || 'Not provided'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">ZIP Code</Label>
                    <div className="text-slate-900 font-medium">{form.postalCode || 'Not provided'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="border-0 shadow-sm bg-white rounded-2xl">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold text-slate-900">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Name</Label>
                    <div className="text-slate-900 font-medium">{form.emergencyContact.name || 'Not provided'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Phone</Label>
                    <div className="text-slate-900 font-medium">{form.emergencyContact.phone || 'Not provided'}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Relationship</Label>
                  <div className="text-slate-900 font-medium">{form.emergencyContact.relationship || 'Not provided'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Primary Care Provider */}
            <Card className="border-0 shadow-sm bg-white rounded-2xl">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold text-slate-900">Primary Pet Care Provider</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Name</Label>
                    <div className="text-slate-900 font-medium">{form.petCareProvider.name || 'Not provided'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Phone</Label>
                    <div className="text-slate-900 font-medium">{form.petCareProvider.phone || 'Not provided'}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Address</Label>
                  <div className="text-slate-900 font-medium">{form.petCareProvider.address || 'Not provided'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Clinic */}
            <Card className="border-0 shadow-sm bg-white rounded-2xl">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold text-slate-900">Emergency Pet Clinic</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Name</Label>
                    <div className="text-slate-900 font-medium">{form.emergencyClinic.name || 'Not provided'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Phone</Label>
                    <div className="text-slate-900 font-medium">{form.emergencyClinic.phone || 'Not provided'}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Address</Label>
                  <div className="text-slate-900 font-medium">{form.emergencyClinic.address || 'Not provided'}</div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="h-8"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Edit Profile</h1>
                <p className="text-slate-600 mt-1">Update your personal information</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { 
                    setForm(originalForm); 
                    setEditing(false); 
                    setError(null); 
                    setSuccess(false); 
                  }}
                  className="rounded-xl px-4 py-2 border-2 hover:bg-slate-50 transition-all duration-200"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="clientProfileForm"
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 py-2 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <form id="clientProfileForm" onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Personal Information */}
          <Card className="border-0 shadow-sm bg-white rounded-2xl xl:col-span-2">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl font-semibold text-slate-900">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <PhotoUpload
                  label=""
                  storagePath={`avatars/${user?.id || 'unknown'}`}
                  initialUrl={form.avatar}
                  onUpload={handleAvatarUpload}
                  disabled={isSaving || isUploadingAvatar}
                  enableCropping={true}
                  aspectRatio={1}
                  previewSize="xl"
                  quality={0.9}
                />
                {isUploadingAvatar && (
                  <p className="text-sm text-blue-600 mt-2">Saving profile picture...</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Full Name *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={form.name} 
                    onChange={handleChange} 
                    required 
                    autoComplete="name"
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">Phone Number *</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    value={form.phone} 
                    onChange={handleChange} 
                    required 
                    autoComplete="tel"
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address *</Label>
                <Input 
                  id="email" 
                  name="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  required 
                  autoComplete="email" 
                  type="email"
                  className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-semibold text-slate-700">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  placeholder="Tell us a bit about yourself and your pets..."
                  className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0 resize-none"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card className="border-0 shadow-sm bg-white rounded-2xl xl:col-span-2">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl font-semibold text-slate-900">Location Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-semibold text-slate-700">Street Address</Label>
                <Input 
                  id="address" 
                  name="address" 
                  value={form.address} 
                  onChange={handleChange} 
                  autoComplete="street-address"
                  className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-semibold text-slate-700">City</Label>
                  <Input 
                    id="city" 
                    name="city" 
                    value={form.city} 
                    onChange={handleChange} 
                    autoComplete="address-level2"
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                    placeholder="Miami"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm font-semibold text-slate-700">State</Label>
                  <Input 
                    id="state" 
                    name="state" 
                    value={form.state} 
                    onChange={handleChange} 
                    autoComplete="address-level1"
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                    placeholder="FL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="text-sm font-semibold text-slate-700">ZIP Code</Label>
                  <Input 
                    id="postalCode" 
                    name="postalCode" 
                    value={form.postalCode} 
                    onChange={handleChange} 
                    autoComplete="postal-code"
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                    placeholder="33101"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="border-0 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl font-semibold text-slate-900">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact.name" className="text-sm font-semibold text-slate-700">Name</Label>
                  <Input 
                    id="emergencyContact.name" 
                    name="emergencyContact.name" 
                    value={form.emergencyContact.name} 
                    onChange={handleChange} 
                    placeholder="Full name of emergency contact"
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact.phone" className="text-sm font-semibold text-slate-700">Phone</Label>
                  <Input 
                    id="emergencyContact.phone" 
                    name="emergencyContact.phone" 
                    value={form.emergencyContact.phone} 
                    onChange={handleChange}
                    placeholder="Emergency contact phone number"
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact.relationship" className="text-sm font-semibold text-slate-700">Relationship</Label>
                <Input 
                  id="emergencyContact.relationship" 
                  name="emergencyContact.relationship" 
                  value={form.emergencyContact.relationship} 
                  onChange={handleChange}
                  placeholder="e.g. Spouse, Parent, Friend"
                  className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Primary Pet Care Provider */}
          <Card className="border-0 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl font-semibold text-slate-900">Primary Pet Care Provider</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="petCareProvider.name" className="text-sm font-semibold text-slate-700">Name</Label>
                  <Input 
                    id="petCareProvider.name" 
                    name="petCareProvider.name" 
                    value={form.petCareProvider.name} 
                    onChange={handleChange}
                    placeholder="Name of veterinarian or clinic"
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="petCareProvider.phone" className="text-sm font-semibold text-slate-700">Phone</Label>
                  <Input 
                    id="petCareProvider.phone" 
                    name="petCareProvider.phone" 
                    value={form.petCareProvider.phone} 
                    onChange={handleChange}
                    placeholder="Provider's phone number"
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="petCareProvider.address" className="text-sm font-semibold text-slate-700">Address</Label>
                <Input 
                  id="petCareProvider.address" 
                  name="petCareProvider.address" 
                  value={form.petCareProvider.address} 
                  onChange={handleChange}
                  placeholder="Provider's address"
                  className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Pet Clinic */}
          <Card className="border-0 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl font-semibold text-slate-900">Emergency Pet Clinic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emergencyClinic.name" className="text-sm font-semibold text-slate-700">Name</Label>
                  <Input 
                    id="emergencyClinic.name" 
                    name="emergencyClinic.name" 
                    value={form.emergencyClinic.name} 
                    onChange={handleChange}
                    placeholder="Emergency clinic name"
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyClinic.phone" className="text-sm font-semibold text-slate-700">Phone</Label>
                  <Input 
                    id="emergencyClinic.phone" 
                    name="emergencyClinic.phone" 
                    value={form.emergencyClinic.phone} 
                    onChange={handleChange}
                    placeholder="Emergency phone"
                    className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyClinic.address" className="text-sm font-semibold text-slate-700">Address</Label>
                <Input 
                  id="emergencyClinic.address" 
                  name="emergencyClinic.address" 
                  value={form.emergencyClinic.address} 
                  onChange={handleChange}
                  placeholder="Emergency clinic address"
                  className="border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0"
                />
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}