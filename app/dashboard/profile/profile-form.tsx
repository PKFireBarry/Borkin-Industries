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
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit3, 
  Save, 
  X, 
  Shield, 
  Heart, 
  Building2,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'

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
      setOriginalForm(form)
      setTimeout(() => {
        setEditing(false)
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError('Failed to update profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setForm(originalForm)
    setEditing(false)
    setSuccess(false)
    setError(null)
  }

  if (!editing) {
    // VIEW MODE - Modern Profile Display
    return (
      <div className="space-y-6">
        {/* Profile Header Card */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar Section */}
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-white shadow-xl ring-4 ring-slate-100 dark:ring-slate-700">
                  {form.avatar ? (
                    <AvatarImage src={form.avatar} alt={form.name} className="object-cover" />
                  ) : (
                    <AvatarFallback className="text-3xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {form.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {form.name || 'Your Name'}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />

                    </Badge>
                  </div>
                </div>

                {form.bio && (
                  <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-2xl">
                    {form.bio}
                  </p>
                )}

                {/* Quick Contact Info */}
                <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                  {form.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{form.email}</span>
                    </div>
                  )}
                  {form.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{form.phone}</span>
                    </div>
                  )}
                  {(form.city || form.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{[form.city, form.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <Button 
                onClick={() => setEditing(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <User className="h-5 w-5 text-blue-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Full Name</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{form.name || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{form.email || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Phone</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{form.phone || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Address</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">
                    {[form.address, form.city, form.state, form.postalCode].filter(Boolean).join(', ') || 'Not provided'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Shield className="h-5 w-5 text-red-600" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{form.emergencyContact.name || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Phone</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{form.emergencyContact.phone || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Relationship</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{form.emergencyContact.relationship || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pet Care Provider */}
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Heart className="h-5 w-5 text-green-600" />
                Primary Pet Care Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{form.petCareProvider.name || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Phone</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{form.petCareProvider.phone || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Address</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{form.petCareProvider.address || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Clinic */}
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Building2 className="h-5 w-5 text-orange-600" />
                Emergency Pet Clinic
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{form.emergencyClinic.name || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Phone</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{form.emergencyClinic.phone || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Address</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{form.emergencyClinic.address || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // EDIT MODE - Modern Form Design
  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Update profile form">
      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-green-800 dark:text-green-200 font-medium">Profile updated successfully!</span>
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800 dark:text-red-200 font-medium">{error}</span>
        </div>
      )}

      {/* Personal Information */}
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <User className="h-5 w-5 text-blue-600" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32 border-4 border-white shadow-xl ring-4 ring-slate-100 dark:ring-slate-700">
              {form.avatar ? (
                <AvatarImage src={form.avatar} alt={form.name} className="object-cover" />
              ) : (
                <AvatarFallback className="text-3xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {form.name.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="w-full max-w-sm">
              <PhotoUpload
                label="Update Profile Picture"
                storagePath={`avatars/${user?.id || 'unknown'}`}
                initialUrl={form.avatar}
                onUpload={url => setForm(prev => ({ ...prev, avatar: url }))}
                disabled={isSaving}
              />
            </div>
          </div>

          <Separator />

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</Label>
              <Input 
                id="name" 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                required 
                autoComplete="name"
                className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</Label>
              <Input 
                id="phone" 
                name="phone" 
                value={form.phone} 
                onChange={handleChange} 
                required 
                autoComplete="tel"
                className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</Label>
            <Input 
              id="email" 
              name="email" 
              value={form.email} 
              onChange={handleChange} 
              required 
              autoComplete="email" 
              type="email"
              className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter your email address"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm font-medium text-slate-700 dark:text-slate-300">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell us a bit about yourself and your pets"
              className="resize-none border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
              rows={4}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium text-slate-700 dark:text-slate-300">Street Address</Label>
            <Input 
              id="address" 
              name="address" 
              value={form.address} 
              onChange={handleChange} 
              autoComplete="street-address"
              className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter your street address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium text-slate-700 dark:text-slate-300">City</Label>
              <Input 
                id="city" 
                name="city" 
                value={form.city} 
                onChange={handleChange} 
                autoComplete="address-level2"
                className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm font-medium text-slate-700 dark:text-slate-300">State</Label>
              <Input 
                id="state" 
                name="state" 
                value={form.state} 
                onChange={handleChange} 
                autoComplete="address-level1"
                className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                placeholder="State"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode" className="text-sm font-medium text-slate-700 dark:text-slate-300">Postal Code</Label>
              <Input 
                id="postalCode" 
                name="postalCode" 
                value={form.postalCode} 
                onChange={handleChange} 
                autoComplete="postal-code"
                className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                placeholder="ZIP Code"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Shield className="h-5 w-5 text-red-600" />
            Emergency Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="emergencyContact.name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Contact Name</Label>
              <Input 
                id="emergencyContact.name" 
                name="emergencyContact.name" 
                value={form.emergencyContact.name} 
                onChange={handleChange} 
                placeholder="Full name of emergency contact"
                className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContact.phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Contact Phone</Label>
              <Input 
                id="emergencyContact.phone" 
                name="emergencyContact.phone" 
                value={form.emergencyContact.phone} 
                onChange={handleChange}
                placeholder="Emergency contact phone number"
                className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContact.relationship" className="text-sm font-medium text-slate-700 dark:text-slate-300">Relationship</Label>
            <Input 
              id="emergencyContact.relationship" 
              name="emergencyContact.relationship" 
              value={form.emergencyContact.relationship} 
              onChange={handleChange}
              placeholder="e.g. Spouse, Parent, Friend, Sibling"
              className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pet Care Provider */}
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Heart className="h-5 w-5 text-green-600" />
            Primary Pet Care Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="petCareProvider.name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Provider Name</Label>
              <Input 
                id="petCareProvider.name" 
                name="petCareProvider.name" 
                value={form.petCareProvider.name} 
                onChange={handleChange}
                placeholder="Name of veterinarian or clinic"
                className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="petCareProvider.phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Provider Phone</Label>
              <Input 
                id="petCareProvider.phone" 
                name="petCareProvider.phone" 
                value={form.petCareProvider.phone} 
                onChange={handleChange}
                placeholder="Provider's phone number"
                className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="petCareProvider.address" className="text-sm font-medium text-slate-700 dark:text-slate-300">Provider Address</Label>
            <Input 
              id="petCareProvider.address" 
              name="petCareProvider.address" 
              value={form.petCareProvider.address} 
              onChange={handleChange}
              placeholder="Provider's full address"
              className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Clinic */}
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Building2 className="h-5 w-5 text-orange-600" />
            Emergency Pet Clinic
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="emergencyClinic.name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Clinic Name</Label>
              <Input 
                id="emergencyClinic.name" 
                name="emergencyClinic.name" 
                value={form.emergencyClinic.name} 
                onChange={handleChange}
                placeholder="Name of emergency pet clinic"
                className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyClinic.phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Clinic Phone</Label>
              <Input 
                id="emergencyClinic.phone" 
                name="emergencyClinic.phone" 
                value={form.emergencyClinic.phone} 
                onChange={handleChange}
                placeholder="Emergency clinic phone number"
                className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyClinic.address" className="text-sm font-medium text-slate-700 dark:text-slate-300">Clinic Address</Label>
            <Input 
              id="emergencyClinic.address" 
              name="emergencyClinic.address" 
              value={form.emergencyClinic.address} 
              onChange={handleChange}
              placeholder="Emergency clinic full address"
              className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <Button 
          type="submit" 
          disabled={isSaving}
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleCancel}
          disabled={isSaving}
          className="flex-1 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  )
} 