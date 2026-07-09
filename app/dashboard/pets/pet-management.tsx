'use client'

import { useEffect, useRef, useState } from 'react'
import type { Pet } from '@/types/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DashboardPageContent, DashboardPageHeader, DashboardPageShell } from '../components/dashboard-shell'
import { EmptyState } from '../components/empty-state'
import { FormField } from '../components/form-field'
import { ModalHeader } from '../components/modal-header'
import { ModalShell } from '../components/modal-shell'
import { MobileStepFooter } from '../components/mobile-step-footer'
import { RailDots } from '../components/rail-dots'
import { SectionHeader } from '../components/section-header'
import {
  AlertCircle,
  Bird,
  Camera,
  Cat,
  Clock,
  Dog,
  Fish,
  Heart,
  Info,
  PencilLine,
  Pill,
  Plus,
  Rabbit,
  ShieldAlert,
  Squirrel,
  Star,
  Trash2,
  Turtle,
  Utensils,
  Weight,
} from 'lucide-react'
import {
  addPetForClient,
  getPetsForClient,
  removePetForClient,
  updatePetForClient,
} from '@/lib/firebase/pets'
import { useUser } from '@clerk/nextjs'
import { PhotoUpload } from '@/components/PhotoUpload'
import { cn } from '@/lib/utils'
import { useRailScroll } from '@/hooks/use-rail-scroll'
import { useSwipeSteps } from '@/hooks/use-swipe-steps'

interface PetManagementProps {
  initialPets?: Pet[]
}

type PetFormValues = {
  name: string
  age: string
  food: string
  foodSchedule: string
  animalType: string
  breed: string
  weight: string
  temperament: string
  medications: string
  allergies: string
  needToKnow: string
  photoUrl: string
}

type FormMode = 'add' | 'edit'

const emptyPetForm = (): PetFormValues => ({
  name: '',
  age: '',
  food: '',
  foodSchedule: '',
  animalType: '',
  breed: '',
  weight: '',
  temperament: '',
  medications: '',
  allergies: '',
  needToKnow: '',
  photoUrl: '',
})

const animalTypes = [
  { value: 'dog', label: 'Dog', icon: Dog, color: 'bg-amber-100 text-amber-700 border-amber-200', accent: 'border-amber-100 bg-gradient-to-br from-amber-50 to-white' },
  { value: 'cat', label: 'Cat', icon: Cat, color: 'bg-purple-100 text-purple-700 border-purple-200', accent: 'border-purple-100 bg-gradient-to-br from-purple-50 to-white' },
  { value: 'fish', label: 'Fish', icon: Fish, color: 'bg-blue-100 text-blue-700 border-blue-200', accent: 'border-blue-100 bg-gradient-to-br from-blue-50 to-white' },
  { value: 'bird', label: 'Bird', icon: Bird, color: 'bg-green-100 text-green-700 border-green-200', accent: 'border-green-100 bg-gradient-to-br from-green-50 to-white' },
  { value: 'rabbit', label: 'Rabbit', icon: Rabbit, color: 'bg-pink-100 text-pink-700 border-pink-200', accent: 'border-pink-100 bg-gradient-to-br from-pink-50 to-white' },
  { value: 'turtle', label: 'Turtle', icon: Turtle, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', accent: 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-white' },
  { value: 'other', label: 'Other', icon: Squirrel, color: 'bg-slate-100 text-slate-700 border-slate-200', accent: 'border-slate-200 bg-gradient-to-br from-slate-50 to-white' },
] as const

const petAccentFamilies = [
  'border-pink-100 bg-gradient-to-br from-pink-50 via-white to-white',
  'border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white',
  'border-purple-100 bg-gradient-to-br from-purple-50 via-white to-white',
  'border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white',
  'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white',
]

const petCardHeightClassName = 'h-[31rem] sm:h-[32rem]'

const getAnimalMeta = (type: string | undefined) => {
  const animal = animalTypes.find((entry) => entry.value === type?.toLowerCase())
  return {
    Icon: animal?.icon || Squirrel,
    color: animal?.color || 'bg-slate-100 text-slate-700 border-slate-200',
    accent: animal?.accent || 'border-slate-200 bg-gradient-to-br from-slate-50 to-white',
    label: animal?.label || type || 'Pet',
  }
}

const buildFormFromPet = (pet: Pet): PetFormValues => ({
  name: pet.name,
  age: String(pet.age),
  food: pet.food || '',
  foodSchedule: pet.foodSchedule || '',
  animalType: pet.animalType || '',
  breed: pet.breed || '',
  weight: pet.weight || '',
  temperament: pet.temperament || '',
  medications: pet.medications || '',
  allergies: pet.allergies || '',
  needToKnow: pet.needToKnow || '',
  photoUrl: pet.photoUrl || '',
})

const buildPetPayload = (form: PetFormValues) => ({
  name: form.name,
  age: Number(form.age),
  food: form.food,
  foodSchedule: form.foodSchedule,
  animalType: form.animalType,
  breed: form.breed,
  weight: form.weight,
  temperament: form.temperament,
  medications: form.medications,
  allergies: form.allergies,
  needToKnow: form.needToKnow,
  photoUrl: form.photoUrl,
  schedule: '',
})

function PetFormModal({
  mode,
  open,
  onOpenChange,
  value,
  onChange,
  onSubmit,
  submitting,
  error,
  userId,
}: {
  mode: FormMode
  open: boolean
  onOpenChange: (open: boolean) => void
  value: PetFormValues
  onChange: (name: keyof PetFormValues, nextValue: string) => void
  onSubmit: () => void
  submitting: boolean
  error: string | null
  userId?: string
}) {
  const [activeStep, setActiveStep] = useState(0)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open) setActiveStep(0)
  }, [open, mode])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeStep])

  const stepCount = 4
  const title = mode === 'add' ? 'Add Pet' : 'Edit Pet'
  const subtitle = mode === 'add' ? 'Build a clear care profile for your pet.' : 'Update your pet details without losing any care info.'
  const canAdvance = (() => {
    if (activeStep === 0) return !!value.name && !!value.age
    return true
  })()

  const { onTouchStart: handleStepTouchStart, onTouchMove: handleStepTouchMove, onTouchEnd: handleStepTouchEnd } = useSwipeSteps({
    step: activeStep,
    maxStep: stepCount - 1,
    threshold: 60,
    canGoNext: canAdvance,
    onNext: () => setActiveStep((prev) => Math.min(prev + 1, stepCount - 1)),
    onPrevious: () => setActiveStep((prev) => Math.max(prev - 1, 0)),
  })

  const animalMeta = getAnimalMeta(value.animalType)
  const StepIcon = animalMeta.Icon

  const basicStep = (
        <div className="h-full rounded-[1.75rem] border border-primary/10 bg-gradient-to-br from-primary/5 via-white to-blue-50 p-4 shadow-sm sm:p-6">
          <SectionHeader
            icon={<Camera className="h-4 w-4" />}
            title="Basics"
            description="Start with the photo, name, age, and species."
            iconWrapClassName="bg-primary/10 text-primary"
            className="mb-5"
            iconContainerClassName="h-10 w-10"
            align="start"
            shadow
            descriptionClassName="mt-1 text-xs text-slate-600"
          />

          <div className="space-y-4.5">
            <div className="rounded-[1.5rem] border border-white/80 bg-white/70 p-3.5">
              <PhotoUpload
                label="Upload Photo"
                storagePath={`pets/${userId || 'unknown'}-${value.name || 'pet'}`}
                initialUrl={value.photoUrl}
                onUpload={(url) => onChange('photoUrl', url)}
                disabled={submitting}
                enableCropping={true}
                aspectRatio={1}
                previewSize="md"
                quality={0.8}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Pet Name" htmlFor={`${mode}-name`} required>
                <Input id={`${mode}-name`} value={value.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Enter your pet's name" className="rounded-2xl border-slate-200 bg-white/90" />
              </FormField>
              <FormField label="Age (years)" htmlFor={`${mode}-age`} required>
                <Input id={`${mode}-age`} value={value.age} onChange={(e) => onChange('age', e.target.value)} type="number" min={0} placeholder="0" className="rounded-2xl border-slate-200 bg-white/90" />
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Type of Animal" htmlFor={`${mode}-animalType`}>
                <select
                  id={`${mode}-animalType`}
                  value={value.animalType}
                  onChange={(e) => onChange('animalType', e.target.value)}
                  className="flex h-11 w-full items-center rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Select animal type</option>
                  {animalTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Breed" htmlFor={`${mode}-breed`}>
                <Input id={`${mode}-breed`} value={value.breed} onChange={(e) => onChange('breed', e.target.value)} placeholder="e.g., Golden Retriever" className="rounded-2xl border-slate-200 bg-white/90" />
              </FormField>
            </div>

            <FormField label="Weight" htmlFor={`${mode}-weight`}>
              <Input id={`${mode}-weight`} value={value.weight} onChange={(e) => onChange('weight', e.target.value)} placeholder="e.g., 15 lbs" className="rounded-2xl border-slate-200 bg-white/90" />
            </FormField>

            <FormField label="Temperament" htmlFor={`${mode}-temperament`}>
              <Textarea id={`${mode}-temperament`} value={value.temperament} onChange={(e) => onChange('temperament', e.target.value)} placeholder="Describe your pet's personality and behavior" rows={3} className="rounded-2xl border-slate-200 bg-white/90" />
            </FormField>
          </div>
        </div>
  )

  const careStep = (
        <div className="h-full rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm sm:p-6">
          <SectionHeader
            icon={<Utensils className="h-4 w-4" />}
            title="Food & Care"
            description="Capture what the sitter needs for daily routines."
            iconWrapClassName="bg-emerald-100 text-emerald-700"
            iconContainerClassName="h-10 w-10"
            align="start"
            shadow
            descriptionClassName="mt-1 text-xs text-slate-600"
          />

          <div className="space-y-5">
            <FormField label="Food Type" htmlFor={`${mode}-food`}>
              <Input id={`${mode}-food`} value={value.food} onChange={(e) => onChange('food', e.target.value)} placeholder="Type of food your pet eats" className="rounded-2xl border-slate-200 bg-white/90" />
            </FormField>

            <FormField label="Feeding Schedule" htmlFor={`${mode}-foodSchedule`}>
              <Input id={`${mode}-foodSchedule`} value={value.foodSchedule} onChange={(e) => onChange('foodSchedule', e.target.value)} placeholder="When and how often to feed" className="rounded-2xl border-slate-200 bg-white/90" />
            </FormField>

            <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-4">
              <SectionHeader
                icon={<Clock className="h-4 w-4" />}
                title="Daily routine notes"
                description="If there is a best time for walks, potty breaks, play, or medication reminders, you can include it in the final notes step."
                iconWrapClassName="bg-emerald-100 text-emerald-700"
                iconContainerClassName="h-10 w-10"
                align="start"
                titleAs="p"
                titleClassName="text-sm font-semibold text-slate-900"
                descriptionClassName="mt-1 text-sm text-slate-600"
                className="mb-0"
              />
            </div>
          </div>
        </div>
  )

  const healthStep = (
        <div className="h-full rounded-[1.75rem] border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm sm:p-6">
          <SectionHeader
            icon={<ShieldAlert className="h-4 w-4" />}
            title="Health & Notes"
            description="Add medication, allergies, and anything a sitter should watch for."
            iconWrapClassName="bg-rose-100 text-rose-700"
            iconContainerClassName="h-10 w-10"
            align="start"
            shadow
            descriptionClassName="mt-1 text-xs text-slate-600"
          />

          <div className="space-y-5">
            <FormField label="Medications" htmlFor={`${mode}-medications`}>
              <Textarea id={`${mode}-medications`} value={value.medications} onChange={(e) => onChange('medications', e.target.value)} placeholder="List any medications your pet takes" rows={3} className="rounded-2xl border-slate-200 bg-white/90" />
            </FormField>

            <FormField label="Allergies" htmlFor={`${mode}-allergies`}>
              <Textarea id={`${mode}-allergies`} value={value.allergies} onChange={(e) => onChange('allergies', e.target.value)} placeholder="List any known allergies" rows={3} className="rounded-2xl border-slate-200 bg-white/90" />
            </FormField>

            <FormField label="Important Notes" htmlFor={`${mode}-needToKnow`}>
              <Textarea id={`${mode}-needToKnow`} value={value.needToKnow} onChange={(e) => onChange('needToKnow', e.target.value)} placeholder="Anything else the sitter should know" rows={4} className="rounded-2xl border-slate-200 bg-white/90" />
            </FormField>
          </div>
        </div>
  )

  const confirmStep = (
      <div className="h-full rounded-[1.75rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm sm:p-6">
        <SectionHeader
          icon={<StepIcon className="h-4 w-4" />}
          title={`Confirm ${mode === 'add' ? 'new pet' : 'pet updates'}`}
          description="Review everything before you save. This final card prevents accidental submission."
          iconWrapClassName="bg-amber-100 text-amber-700"
          iconContainerClassName="h-10 w-10"
          align="start"
          shadow
          descriptionClassName="mt-1 text-xs text-slate-600"
        />

        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-[1.5rem] border border-white/80 bg-white/80 p-4">
            <Avatar className="h-16 w-16 rounded-2xl border border-white shadow-sm">
              <AvatarImage src={value.photoUrl} alt={value.name || 'Pet'} className="object-cover" />
              <AvatarFallback className="rounded-2xl bg-primary/10 text-lg font-semibold text-primary">{value.name?.[0]?.toUpperCase() || 'P'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-slate-900">{value.name || 'Unnamed Pet'}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>{value.age ? `${value.age} year${value.age === '1' ? '' : 's'} old` : 'Age not set'}</span>
                {value.breed ? <span>{value.breed}</span> : null}
                {value.weight ? <span>{value.weight}</span> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className={cn('border', animalMeta.color)}>
                  <StepIcon className="mr-1 h-3 w-3" />
                  {animalMeta.label}
                </Badge>
                {value.food ? <Badge variant="secondary" className="rounded-full bg-emerald-50 text-emerald-700">Food added</Badge> : null}
                {value.medications || value.allergies ? <Badge variant="secondary" className="rounded-full bg-rose-50 text-rose-700">Health notes added</Badge> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white/85 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Temperament</p>
              <p className="mt-1 text-sm text-slate-700">{value.temperament || 'No temperament notes added.'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/85 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Food Schedule</p>
              <p className="mt-1 text-sm text-slate-700">{value.foodSchedule || value.food || 'No food details added.'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/85 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Important Notes</p>
            <p className="mt-1 text-sm text-slate-700">{value.needToKnow || value.allergies || value.medications || 'No additional sitter notes added.'}</p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      </div>
  )

  const stepCards = [basicStep, careStep, healthStep, confirmStep]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalShell aria-labelledby={`${mode}PetTitle`}>
        <div className="flex h-full min-h-0 flex-col">
          <ModalHeader
            eyebrow="Pet profile"
            title={title}
            description={subtitle}
            titleId={`${mode}PetTitle`}
            onClose={() => onOpenChange(false)}
            closeAriaLabel="Close pet profile modal"
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="flex h-full min-h-0 flex-col sm:hidden">
              <div className="min-h-0 flex-1 px-4 pb-5 pt-4">
                <div
                  ref={scrollRef}
                  className="min-h-0 h-full overflow-y-auto"
                  onTouchStart={handleStepTouchStart}
                  onTouchMove={handleStepTouchMove}
                  onTouchEnd={handleStepTouchEnd}
                >
                  {stepCards[activeStep]}
                </div>
              </div>

              <MobileStepFooter
                step={activeStep}
                maxStep={stepCount - 1}
                onBack={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
                onNext={() => setActiveStep((prev) => Math.min(prev + 1, stepCount - 1))}
                onClose={() => onOpenChange(false)}
                canGoNext={canAdvance}
                backDisabled={submitting}
                nextDisabled={submitting}
                finalActionLabel={submitting ? (mode === 'add' ? 'Adding...' : 'Saving...') : mode === 'add' ? 'Add Pet' : 'Save Changes'}
                onFinalAction={onSubmit}
                finalActionDisabled={submitting}
              />
            </div>

            <div className="hidden h-full min-h-0 sm:flex sm:flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-6 p-6">
                  <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                    <div className="space-y-4">
                      {stepCards.slice(0, 2).map((stepCard, index) => (
                        <div key={`left-step-${index}`}>{stepCard}</div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      {stepCards.slice(2).map((stepCard, index) => (
                        <div key={`right-step-${index}`}>{stepCard}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white/95 p-6">
                {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" size="pill" onClick={() => onOpenChange(false)} className="h-12 flex-1 rounded-2xl border-slate-200 text-base">
                    Close
                  </Button>
                  <Button type="button" variant="petCta" size="pill" onClick={onSubmit} disabled={submitting} className="h-12 flex-1 rounded-2xl text-base">
                    {submitting ? (mode === 'add' ? 'Adding...' : 'Saving...') : mode === 'add' ? 'Add Pet' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalShell>
    </Dialog>
  )
}

export function PetManagement({ initialPets = [] }: PetManagementProps) {
  const { user, isLoaded } = useUser()
  const [pets, setPets] = useState<Pet[]>(initialPets)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { railRef: mobileRailRef, clampedDotIndex: activeRailDotIndex, onScroll: handlePetRailScroll } = useRailScroll({
    slideSelector: '[data-pet-slide="true"]',
    itemCount: pets.length,
  })

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<PetFormValues>(emptyPetForm())
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<PetFormValues>(emptyPetForm())
  const [editError, setEditError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [isRemoveOpen, setIsRemoveOpen] = useState(false)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (!isLoaded || !user) return
    setLoading(true)
    setError(null)
    getPetsForClient(user.id)
      .then((data) => setPets(data))
      .catch(() => setError('Failed to load pets'))
      .finally(() => setLoading(false))
  }, [isLoaded, user])

  const animalBreakdown = animalTypes
    .map((type) => ({ label: type.label, count: pets.filter((pet) => pet.animalType?.toLowerCase() === type.value).length, color: type.color }))
    .filter((entry) => entry.count > 0)

  const openEdit = (index: number) => {
    setEditIndex(index)
    setEditForm(buildFormFromPet(pets[index]))
    setEditError(null)
    setIsEditOpen(true)
  }

  const openRemove = (index: number) => {
    setRemoveIndex(index)
    setIsRemoveOpen(true)
  }

  const handleAddChange = (name: keyof PetFormValues, nextValue: string) => {
    setAddForm((prev) => ({ ...prev, [name]: nextValue }))
  }

  const handleEditChange = (name: keyof PetFormValues, nextValue: string) => {
    setEditForm((prev) => ({ ...prev, [name]: nextValue }))
  }

  const handleAddSubmit = async () => {
    setAddError(null)
    if (!addForm.name || !addForm.age) {
      setAddError('Name and age are required')
      return
    }
    if (!user) return

    const payload = buildPetPayload(addForm)
    const tempId = `pending-${Date.now()}`
    setIsAdding(true)

    try {
      setPets((prev) => [...prev, { ...payload, id: tempId } as Pet])
      const id = await addPetForClient(user.id, payload)
      setPets((prev) => prev.map((pet) => (pet.id === tempId ? { ...pet, id } : pet)))
      setAddForm(emptyPetForm())
      setIsAddOpen(false)
    } catch {
      setAddError('Failed to add pet')
      setPets((prev) => prev.filter((pet) => pet.id !== tempId))
    } finally {
      setIsAdding(false)
    }
  }

  const handleEditSubmit = async () => {
    setEditError(null)
    if (!editForm.name || !editForm.age) {
      setEditError('Name and age are required')
      return
    }
    if (!user || editIndex === null) return

    const currentPet = pets[editIndex]
    const updatedPet: Pet = { ...currentPet, ...buildPetPayload(editForm) }
    const previousPets = pets
    setIsEditing(true)

    try {
      setPets((prev) => prev.map((pet, index) => (index === editIndex ? updatedPet : pet)))
      await updatePetForClient(user.id, updatedPet)
      setIsEditOpen(false)
    } catch {
      setEditError('Failed to update pet')
      setPets(previousPets)
    } finally {
      setIsEditing(false)
    }
  }

  const handleRemove = async () => {
    if (!user || removeIndex === null) return
    const pet = pets[removeIndex]
    const previousPets = pets
    setIsRemoving(true)

    try {
      setPets((prev) => prev.filter((_, index) => index !== removeIndex))
      await removePetForClient(user.id, pet.id)
      setIsRemoveOpen(false)
      setRemoveIndex(null)
    } catch {
      setError('Failed to remove pet')
      setPets(previousPets)
    } finally {
      setIsRemoving(false)
    }
  }

  if (loading) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
        <DashboardPageContent className="pt-4 sm:pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 rounded-[1.75rem] bg-white/80 shadow-sm" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-72 rounded-[1.75rem] bg-white/80 shadow-sm" />
              ))}
            </div>
          </div>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
      <DashboardPageContent className="space-y-4 pb-8 pt-4 sm:space-y-6 sm:pb-10 sm:pt-6 lg:pb-12">
        <DashboardPageHeader
          variant="summary"
          title="Your pets"
          description="Keep every pet’s routine, personality, and health notes in one clean place so bookings are easier to request and review."
          surfaceClassName="from-white via-pink-50/60 to-blue-50/70"
          eyebrow={
            <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
              Pet profiles
            </Badge>
          }
          actions={
            <Button type="button" variant="petCta" size="pill" onClick={() => setIsAddOpen(true)} className="h-11 w-full rounded-2xl px-5 text-sm sm:h-12 sm:w-auto sm:text-base">
              <Plus className="mr-2 h-4 w-4" />
              Add Pet
            </Button>
          }
        />

        {error ? (
          <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {pets.length > 0 ? (
          <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Pet summary</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">{pets.length} saved pet{pets.length === 1 ? '' : 's'}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {animalBreakdown.map((entry) => (
                  <Badge key={entry.label} className={cn('border rounded-full', entry.color)}>
                    {entry.count} {entry.label}{entry.count === 1 ? '' : 's'}
                  </Badge>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {pets.length === 0 && !error ? (
          <EmptyState
            icon={<Heart className="h-7 w-7 text-primary" />}
            title="No pets yet"
            description="Add your first pet profile to make future bookings faster and clearer."
            iconInCircle
            iconWrapperClassName="bg-primary/10"
          >
            <Button type="button" variant="petCta" size="pill" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Pet
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="sm:hidden">
              <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div ref={mobileRailRef} onScroll={handlePetRailScroll} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-[12vw] pl-[12vw] pr-[12vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {pets.map((pet, index) => {
                    const animal = getAnimalMeta(pet.animalType)
                    const Icon = animal.Icon
                    const accentShell = petAccentFamilies[index % petAccentFamilies.length]

                    return (
                      <Card key={pet.id} data-pet-slide="true" className={`flex w-[76vw] min-w-[16.25rem] max-w-[17.5rem] shrink-0 snap-center snap-always flex-col rounded-[1.75rem] border shadow-sm ${petCardHeightClassName} ${accentShell}`}>
                        <CardContent className="flex h-full flex-1 flex-col p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-16 w-16 rounded-[1.25rem] border border-white shadow-sm">
                              <AvatarImage src={pet.photoUrl} alt={pet.name} className="object-cover" />
                              <AvatarFallback className="rounded-[1.25rem] bg-white text-lg font-semibold text-slate-700">{pet.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="truncate text-base font-semibold text-slate-900">{pet.name}</h3>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{pet.age} year{pet.age === 1 ? '' : 's'} old</span>
                                    {pet.weight ? <span className="inline-flex items-center gap-1"><Weight className="h-3.5 w-3.5" />{pet.weight}</span> : null}
                                  </div>
                                </div>
                                <Badge className={cn('border', animal.color)}>
                                  <Icon className="mr-1 h-3 w-3" />
                                  {animal.label}
                                </Badge>
                              </div>
                              {pet.breed ? <p className="text-sm text-slate-600">{pet.breed}</p> : null}
                            </div>
                          </div>

                          <div className="mt-4 flex-1 space-y-3">
                            {pet.temperament ? (
                              <div className="rounded-xl border border-white/80 bg-white/75 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Temperament</p>
                                <p className="mt-1 text-sm text-slate-700 line-clamp-2">{pet.temperament}</p>
                              </div>
                            ) : null}
                            {(pet.food || pet.foodSchedule) ? (
                              <div className="rounded-xl border border-white/80 bg-white/75 p-3">
                                <div className="flex items-start gap-2">
                                  <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Food & Schedule</p>
                                    {pet.food ? <p className="mt-1 text-sm text-slate-700 line-clamp-1">{pet.food}</p> : null}
                                    {pet.foodSchedule ? <p className="mt-1 text-sm text-slate-600 line-clamp-1">{pet.foodSchedule}</p> : null}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                            {(pet.medications || pet.allergies || pet.needToKnow) ? (
                              <div className="rounded-xl border border-white/80 bg-white/75 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Care notes</p>
                                <div className="mt-2 space-y-2 text-sm text-slate-700">
                                  {pet.medications ? <p className="flex items-start gap-2"><Pill className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><span className="line-clamp-2">{pet.medications}</span></p> : null}
                                  {pet.allergies ? <p className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /><span className="line-clamp-2">{pet.allergies}</span></p> : null}
                                  {pet.needToKnow ? <p className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" /><span className="line-clamp-2">{pet.needToKnow}</span></p> : null}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-auto flex gap-2 pt-4">
                            <Button type="button" variant="outline" size="pill" onClick={() => openEdit(index)} className="flex-1 rounded-2xl border-slate-200 bg-white/80 text-sm">
                              <PencilLine className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button type="button" variant="outline" size="pill" onClick={() => openRemove(index)} className="flex-1 rounded-2xl border-slate-200 bg-white/80 text-sm text-red-700 hover:bg-red-50 hover:text-red-800">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              <RailDots count={pets.length} activeIndex={activeRailDotIndex} mobileOnly={false} />
            </div>

            <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pets.map((pet, index) => {
                const animal = getAnimalMeta(pet.animalType)
                const Icon = animal.Icon
                const accentShell = petAccentFamilies[index % petAccentFamilies.length]

                return (
                <Card key={pet.id} className={`group flex flex-col rounded-[1.75rem] border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${petCardHeightClassName} ${accentShell}`}>
                  <CardContent className="flex h-full flex-1 flex-col p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-16 w-16 rounded-[1.25rem] border border-white shadow-sm sm:h-20 sm:w-20">
                        <AvatarImage src={pet.photoUrl} alt={pet.name} className="object-cover" />
                        <AvatarFallback className="rounded-[1.25rem] bg-white text-lg font-semibold text-slate-700">
                          {pet.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{pet.name}</h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm">
                              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{pet.age} year{pet.age === 1 ? '' : 's'} old</span>
                              {pet.weight ? <span className="inline-flex items-center gap-1"><Weight className="h-3.5 w-3.5" />{pet.weight}</span> : null}
                            </div>
                          </div>
                          <Badge className={cn('border', animal.color)}>
                            <Icon className="mr-1 h-3 w-3" />
                            {animal.label}
                          </Badge>
                        </div>
                        {pet.breed ? <p className="text-sm text-slate-600">{pet.breed}</p> : null}
                      </div>
                    </div>

                    <div className="mt-4 flex-1 space-y-3">
                      {pet.temperament ? (
                        <div className="rounded-xl border border-white/80 bg-white/75 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Temperament</p>
                          <p className="mt-1 text-sm text-slate-700 line-clamp-2">{pet.temperament}</p>
                        </div>
                      ) : null}
                      {(pet.food || pet.foodSchedule) ? (
                        <div className="rounded-xl border border-white/80 bg-white/75 p-3">
                          <div className="flex items-start gap-2">
                            <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Food & Schedule</p>
                              {pet.food ? <p className="mt-1 text-sm text-slate-700 line-clamp-1">{pet.food}</p> : null}
                              {pet.foodSchedule ? <p className="mt-1 text-sm text-slate-600 line-clamp-1">{pet.foodSchedule}</p> : null}
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {(pet.medications || pet.allergies || pet.needToKnow) ? (
                        <div className="rounded-xl border border-white/80 bg-white/75 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Care notes</p>
                          <div className="mt-2 space-y-2 text-sm text-slate-700">
                            {pet.medications ? <p className="flex items-start gap-2"><Pill className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><span className="line-clamp-2">{pet.medications}</span></p> : null}
                            {pet.allergies ? <p className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /><span className="line-clamp-2">{pet.allergies}</span></p> : null}
                            {pet.needToKnow ? <p className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" /><span className="line-clamp-2">{pet.needToKnow}</span></p> : null}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-auto flex gap-2 pt-4">
                      <Button type="button" variant="outline" size="pill" onClick={() => openEdit(index)} className="flex-1 rounded-2xl border-slate-200 bg-white/80 text-sm">
                        <PencilLine className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button type="button" variant="outline" size="pill" onClick={() => openRemove(index)} className="flex-1 rounded-2xl border-slate-200 bg-white/80 text-sm text-red-700 hover:bg-red-50 hover:text-red-800">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            </div>
          </>
        )}
      </DashboardPageContent>

      <PetFormModal
        mode="add"
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        value={addForm}
        onChange={handleAddChange}
        onSubmit={handleAddSubmit}
        submitting={isAdding}
        error={addError}
        userId={user?.id}
      />

      <PetFormModal
        mode="edit"
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        value={editForm}
        onChange={handleEditChange}
        onSubmit={handleEditSubmit}
        submitting={isEditing}
        error={editError}
        userId={user?.id}
      />

      <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <ModalShell aria-labelledby="removePetTitle">
          <div className="flex h-full min-h-0 flex-col">
            <ModalHeader
              eyebrow="Pet profile"
              title="Remove pet"
              description="This uses the same mobile shell so removal stays consistent with add and edit flows."
              titleId="removePetTitle"
              onClose={() => setIsRemoveOpen(false)}
              closeAriaLabel="Close remove pet modal"
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex h-full min-h-[18rem] flex-col justify-center rounded-[1.75rem] border border-red-100 bg-gradient-to-br from-red-50 to-white p-5 text-center shadow-sm sm:min-h-[22rem] sm:p-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <Trash2 className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-900">Remove {removeIndex !== null ? pets[removeIndex]?.name : 'this pet'}?</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                  This removes the saved pet profile from your account. Existing booking records will not be deleted, but you’ll need to re-add the pet before using it in a new request.
                </p>
                <div className="mt-5 rounded-2xl border border-red-200 bg-white/80 px-4 py-3 text-sm text-red-700">
                  This action cannot be undone.
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200/80 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:px-6 sm:pb-6 sm:pt-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" size="pill" onClick={() => setIsRemoveOpen(false)} className="h-11 w-full flex-1 rounded-2xl border-slate-200 bg-white sm:h-12 sm:text-base">
                    Cancel
                  </Button>
                  <Button type="button" variant="destructive" size="pill" onClick={handleRemove} disabled={isRemoving} className="h-11 w-full flex-1 rounded-2xl sm:h-12 sm:text-base">
                    {isRemoving ? 'Removing...' : 'Remove Pet'}
                  </Button>
                </div>
            </div>
          </div>
        </ModalShell>
      </Dialog>
    </DashboardPageShell>
  )
}
