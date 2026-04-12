'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import type { Client } from '@/types/client'
import { updateClientProfile } from '@/lib/firebase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PhotoUpload } from '@/components/PhotoUpload'
import { FormField } from '../components/form-field'
import { useSwipeSteps } from '@/hooks/use-swipe-steps'
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Heart,
  Home,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldPlus,
  Stethoscope,
  X,
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

type SectionId = 'personal' | 'location' | 'emergency' | 'provider' | 'clinic'

function buildForm(initialProfile: Client | null, fallbackAvatar?: string): ProfileFormState {
  return {
    name: initialProfile?.name || '',
    address: initialProfile?.address || '',
    city: initialProfile?.city || '',
    state: initialProfile?.state || '',
    postalCode: initialProfile?.postalCode || '',
    phone: initialProfile?.phone || '',
    email: initialProfile?.email || '',
    bio: initialProfile?.bio || '',
    avatar: initialProfile?.avatar || fallbackAvatar || '',
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
}

function FieldDisplay({
  label,
  value,
  icon,
}: {
  label: string
  value?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium leading-relaxed text-slate-900 sm:text-base">{value || 'Not provided'}</div>
    </div>
  )
}

export function ProfileForm({ initialProfile, isEditing }: ProfileFormProps) {
  const { user } = useUser()
  const formRef = useRef<HTMLFormElement>(null)
  const [form, setForm] = useState<ProfileFormState>(() => buildForm(initialProfile, user?.imageUrl))
  const [originalForm, setOriginalForm] = useState<ProfileFormState>(() => buildForm(initialProfile, user?.imageUrl))
  const [editing, setEditing] = useState(isEditing ?? false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const nextForm = buildForm(initialProfile, user?.imageUrl)
    setForm(nextForm)
    setOriginalForm(nextForm)
  }, [initialProfile, user])

  useEffect(() => {
    const handleEnterEdit = () => setEditing(true)
    window.addEventListener('borkin-profile-enter-edit', handleEnterEdit)
    return () => window.removeEventListener('borkin-profile-enter-edit', handleEnterEdit)
  }, [])

  const sections = useMemo(
    () => [
      {
        id: 'personal' as SectionId,
        title: 'Personal Information',
        description: 'Your main contact details and profile photo.',
        icon: <Heart className="h-4 w-4" />,
        accent: 'from-blue-50 to-indigo-50 border-blue-200',
      },
      {
        id: 'location' as SectionId,
        title: 'Location Information',
        description: 'Where your care takes place and how to find you.',
        icon: <MapPin className="h-4 w-4" />,
        accent: 'from-yellow-50 to-amber-50 border-yellow-200',
      },
      {
        id: 'emergency' as SectionId,
        title: 'Emergency Contact',
        description: 'Who we should contact if we cannot reach you.',
        icon: <ShieldPlus className="h-4 w-4" />,
        accent: 'from-red-50 to-pink-50 border-pink-200',
      },
      {
        id: 'provider' as SectionId,
        title: 'Primary Pet Care Provider',
        description: 'Your regular veterinarian or clinic information.',
        icon: <Stethoscope className="h-4 w-4" />,
        accent: 'from-green-50 to-emerald-50 border-green-200',
      },
      {
        id: 'clinic' as SectionId,
        title: 'Emergency Pet Clinic',
        description: 'Where your pets should go in an urgent situation.',
        icon: <Home className="h-4 w-4" />,
        accent: 'from-purple-50 to-fuchsia-50 border-purple-200',
      },
    ],
    []
  )

  const activeSection = sections[activeStep]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setForm((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof ProfileFormState] as Record<string, string>),
          [child]: value,
        },
      }))
      return
    }

    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      if (!user) throw new Error('User not found')
      await updateClientProfile(user.id, form)
      setOriginalForm(form)
      setEditing(false)
      setSuccess(true)
    } catch {
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
      const updatedForm = { ...form, avatar: url }
      setForm(updatedForm)
      await updateClientProfile(user.id, updatedForm)
      setOriginalForm(updatedForm)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Failed to update profile picture')
      console.error('Avatar upload error:', err)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleCancel = () => {
    setForm(originalForm)
    setEditing(false)
    setError(null)
    setSuccess(false)
    setActiveStep(0)
  }

  const handlePreviousStep = () => {
    setActiveStep((step) => Math.max(step - 1, 0))
  }

  const handleNextStep = () => {
    setActiveStep((step) => {
      if (step >= sections.length - 1) return step
      return step + 1
    })
  }

  const handleMobilePrimaryAction = () => {
    if (activeStep < sections.length - 1) {
      handleNextStep()
      return
    }

    formRef.current?.requestSubmit()
  }

  const { onTouchStart: handleStepTouchStart, onTouchMove: handleStepTouchMove, onTouchEnd: handleStepTouchEnd } = useSwipeSteps({
    step: activeStep,
    maxStep: sections.length - 1,
    threshold: 60,
    onNext: handleNextStep,
    onPrevious: handlePreviousStep,
  })

  const renderSectionFields = (sectionId: SectionId) => {
    if (sectionId === 'personal') {
      return (
        <>
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <PhotoUpload
              label=""
              storagePath={`avatars/${user?.id || 'unknown'}`}
              initialUrl={form.avatar}
              onUpload={handleAvatarUpload}
              disabled={isSaving || isUploadingAvatar}
              enableCropping={true}
              aspectRatio={1}
              previewSize="md"
              previewClassName="mx-auto aspect-square w-[42%] min-w-[96px] max-w-[152px] object-cover rounded-full border shadow-lg"
              quality={0.9}
            />
            <div className="mt-3 text-center text-xs text-slate-500">
              {isUploadingAvatar ? 'Saving profile picture...' : 'Tap to update your profile photo'}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Full Name" htmlFor="name" required>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                autoComplete="name"
                placeholder="Enter your full name"
                className="h-12 rounded-2xl border-slate-200 bg-white"
              />
            </FormField>

            <FormField label="Phone Number" htmlFor="phone" required>
              <Input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                autoComplete="tel"
                placeholder="(555) 123-4567"
                className="h-12 rounded-2xl border-slate-200 bg-white"
              />
            </FormField>
          </div>

          <FormField label="Email Address" htmlFor="email" required>
            <Input
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              type="email"
              placeholder="your.email@example.com"
              className="h-12 rounded-2xl border-slate-200 bg-white"
            />
          </FormField>

          <FormField label="Bio" htmlFor="bio">
            <Textarea
              id="bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell us a bit about yourself and your pets..."
              rows={5}
              className="rounded-2xl border-slate-200 bg-white resize-none"
            />
          </FormField>
        </>
      )
    }

    if (sectionId === 'location') {
      return (
        <>
          <FormField label="Street Address" htmlFor="address">
            <Input
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
              autoComplete="street-address"
              placeholder="123 Main Street"
              className="h-12 rounded-2xl border-slate-200 bg-white"
            />
          </FormField>

          <div className="grid gap-5 md:grid-cols-3">
            <FormField label="City" htmlFor="city">
              <Input
                id="city"
                name="city"
                value={form.city}
                onChange={handleChange}
                autoComplete="address-level2"
                placeholder="Miami"
                className="h-12 rounded-2xl border-slate-200 bg-white"
              />
            </FormField>

            <FormField label="State" htmlFor="state">
              <Input
                id="state"
                name="state"
                value={form.state}
                onChange={handleChange}
                autoComplete="address-level1"
                placeholder="FL"
                className="h-12 rounded-2xl border-slate-200 bg-white"
              />
            </FormField>

            <FormField label="ZIP Code" htmlFor="postalCode">
              <Input
                id="postalCode"
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                autoComplete="postal-code"
                placeholder="33101"
                className="h-12 rounded-2xl border-slate-200 bg-white"
              />
            </FormField>
          </div>
        </>
      )
    }

    if (sectionId === 'emergency') {
      return (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Name" htmlFor="emergencyContact.name">
              <Input
                id="emergencyContact.name"
                name="emergencyContact.name"
                value={form.emergencyContact.name}
                onChange={handleChange}
                placeholder="Full name of emergency contact"
                className="h-12 rounded-2xl border-slate-200 bg-white"
              />
            </FormField>

            <FormField label="Phone" htmlFor="emergencyContact.phone">
              <Input
                id="emergencyContact.phone"
                name="emergencyContact.phone"
                value={form.emergencyContact.phone}
                onChange={handleChange}
                placeholder="Emergency contact phone number"
                className="h-12 rounded-2xl border-slate-200 bg-white"
              />
            </FormField>
          </div>

          <FormField label="Relationship" htmlFor="emergencyContact.relationship">
            <Input
              id="emergencyContact.relationship"
              name="emergencyContact.relationship"
              value={form.emergencyContact.relationship}
              onChange={handleChange}
              placeholder="e.g. Spouse, Parent, Friend"
              className="h-12 rounded-2xl border-slate-200 bg-white"
            />
          </FormField>
        </>
      )
    }

    if (sectionId === 'provider') {
      return (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Name" htmlFor="petCareProvider.name">
              <Input
                id="petCareProvider.name"
                name="petCareProvider.name"
                value={form.petCareProvider.name}
                onChange={handleChange}
                placeholder="Name of veterinarian or clinic"
                className="h-12 rounded-2xl border-slate-200 bg-white"
              />
            </FormField>

            <FormField label="Phone" htmlFor="petCareProvider.phone">
              <Input
                id="petCareProvider.phone"
                name="petCareProvider.phone"
                value={form.petCareProvider.phone}
                onChange={handleChange}
                placeholder="Provider's phone number"
                className="h-12 rounded-2xl border-slate-200 bg-white"
              />
            </FormField>
          </div>

          <FormField label="Address" htmlFor="petCareProvider.address">
            <Input
              id="petCareProvider.address"
              name="petCareProvider.address"
              value={form.petCareProvider.address}
              onChange={handleChange}
              placeholder="Provider's address"
              className="h-12 rounded-2xl border-slate-200 bg-white"
            />
          </FormField>
        </>
      )
    }

    return (
      <>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="Name" htmlFor="emergencyClinic.name">
            <Input
              id="emergencyClinic.name"
              name="emergencyClinic.name"
              value={form.emergencyClinic.name}
              onChange={handleChange}
              placeholder="Emergency clinic name"
              className="h-12 rounded-2xl border-slate-200 bg-white"
            />
          </FormField>

          <FormField label="Phone" htmlFor="emergencyClinic.phone">
            <Input
              id="emergencyClinic.phone"
              name="emergencyClinic.phone"
              value={form.emergencyClinic.phone}
              onChange={handleChange}
              placeholder="Emergency phone"
              className="h-12 rounded-2xl border-slate-200 bg-white"
            />
          </FormField>
        </div>

        <FormField label="Address" htmlFor="emergencyClinic.address">
          <Input
            id="emergencyClinic.address"
            name="emergencyClinic.address"
            value={form.emergencyClinic.address}
            onChange={handleChange}
            placeholder="Emergency clinic address"
            className="h-12 rounded-2xl border-slate-200 bg-white"
          />
        </FormField>
      </>
    )
  }

  if (!editing) {
    return (
      <div>
        {success && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            Profile updated successfully.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-sm">
              <CardContent className="p-0">
                <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50 px-5 py-6 sm:px-7">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <Avatar className="h-24 w-24 border-4 border-white shadow-lg sm:h-28 sm:w-28">
                      <AvatarImage src={form.avatar} alt={form.name} className="object-cover" />
                      <AvatarFallback className="bg-slate-100 text-4xl text-slate-600">{form.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-2xl font-bold tracking-tight text-slate-900">{form.name || 'Your profile'}</h2>
                        <Badge className="border-blue-200 bg-blue-100 text-blue-700">Client</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                          <Mail className="h-3.5 w-3.5 text-blue-600" />
                          {form.email || 'No email added'}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                          <Phone className="h-3.5 w-3.5 text-green-600" />
                          {form.phone || 'No phone added'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 p-5 sm:p-7">
                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Personal Snapshot</div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldDisplay label="Full Name" value={form.name} icon={<Heart className="h-3.5 w-3.5 text-red-500" />} />
                      <FieldDisplay label="Phone" value={form.phone} icon={<Phone className="h-3.5 w-3.5 text-green-600" />} />
                      <FieldDisplay label="Email" value={form.email} icon={<Mail className="h-3.5 w-3.5 text-blue-600" />} />
                      <FieldDisplay
                        label="Location"
                        value={[form.address, form.city, form.state, form.postalCode].filter(Boolean).join(', ')}
                        icon={<MapPin className="h-3.5 w-3.5 text-amber-600" />}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">About You</div>
                    <div className="rounded-[1.75rem] border border-slate-200/80 bg-slate-50/80 p-5 text-sm leading-relaxed text-slate-700 sm:text-base">
                      {form.bio || 'No bio added yet.'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-red-50 to-pink-50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-slate-900">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <FieldDisplay label="Name" value={form.emergencyContact.name} />
                  <FieldDisplay label="Phone" value={form.emergencyContact.phone} />
                  <FieldDisplay label="Relationship" value={form.emergencyContact.relationship} />
                </CardContent>
              </Card>

              <Card className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-slate-900">Primary Pet Care Provider</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <FieldDisplay label="Name" value={form.petCareProvider.name} />
                  <FieldDisplay label="Phone" value={form.petCareProvider.phone} />
                  <FieldDisplay label="Address" value={form.petCareProvider.address} />
                </CardContent>
              </Card>

              <Card className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-purple-50 to-fuchsia-50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-slate-900">Emergency Pet Clinic</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <FieldDisplay label="Name" value={form.emergencyClinic.name} />
                  <FieldDisplay label="Phone" value={form.emergencyClinic.phone} />
                  <FieldDisplay label="Address" value={form.emergencyClinic.address} />
                </CardContent>
              </Card>
            </div>
          </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur-sm">
        <div className="w-full px-4 py-3 sm:px-6 lg:px-8 lg:py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Edit Profile</h1>
              <p className="mt-1 text-sm text-slate-600 lg:text-base">Update your personal, location, and emergency information.</p>
            </div>

            <div className="hidden xl:flex xl:flex-wrap xl:gap-2">
              <Button type="button" variant="outline" size="pillSm" onClick={handleCancel} leftIcon={<X className="h-4 w-4" />}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="clientProfileForm"
                variant="petCta"
                size="pillSm"
                disabled={isSaving}
                leftIcon={isSaving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            Profile updated successfully.
          </div>
        )}

        <form id="clientProfileForm" ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <div className="xl:hidden">
            <Card className={`rounded-[2rem] border bg-gradient-to-br ${activeSection.accent} shadow-sm`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge className="border-white/70 bg-white/80 text-slate-700">
                    Step {activeStep + 1} of {sections.length}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCancel}
                    className="h-9 w-9 rounded-full border-white/80 bg-white/80 text-slate-600 shadow-sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                    {activeSection.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">{activeSection.title}</CardTitle>
                    <p className="mt-1 text-xs text-slate-600">{activeSection.description}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5" onTouchStart={handleStepTouchStart} onTouchMove={handleStepTouchMove} onTouchEnd={handleStepTouchEnd}>
                <div className="min-h-[30rem] space-y-5">
                  {renderSectionFields(activeSection.id)}
                </div>

                <div className="rounded-2xl border border-white/80 bg-white/70 p-3">
                  <div className="mb-2 flex gap-2">
                    {sections.map((section, index) => (
                      <div
                        key={section.id}
                        className={`h-2 flex-1 rounded-full ${index === activeStep ? 'bg-primary' : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="pillSm"
                      onClick={handlePreviousStep}
                      disabled={activeStep === 0}
                      leftIcon={<ChevronLeft className="h-4 w-4" />}
                    >
                      Back
                    </Button>

                    <Button
                      type="button"
                      variant="petCta"
                      size="pillSm"
                      onClick={handleMobilePrimaryAction}
                      disabled={isSaving}
                      leftIcon={activeStep === sections.length - 1 ? <Save className="h-4 w-4" /> : undefined}
                      rightIcon={activeStep < sections.length - 1 ? <ChevronRight className="h-4 w-4" /> : undefined}
                    >
                      {activeStep < sections.length - 1 ? 'Next Section' : isSaving ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="hidden xl:block">
          <div className="grid grid-cols-12 gap-6">
              {sections.map((section, index) => (
                <Card
                  key={section.id}
                  className={`rounded-[2rem] border bg-gradient-to-br ${section.accent} shadow-sm ${
                    index === 0
                      ? 'col-span-7'
                      : index === 1
                        ? 'col-span-5'
                        : index === 2
                          ? 'col-span-5'
                          : index === 3
                            ? 'col-span-7'
                            : 'col-span-12'
                  }`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                        {section.icon}
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold text-slate-900">{section.title}</CardTitle>
                        <p className="mt-1 text-sm text-slate-600">{section.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">{renderSectionFields(section.id)}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
