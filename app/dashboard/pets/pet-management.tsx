'use client'

import { useEffect, useState } from 'react'
import type { Pet } from '@/types/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Heart, Cat, Dog, Fish, Bird, Rabbit, Turtle, Squirrel, Plus, Edit3, Trash2, Camera, MapPin, Clock, Pill, Utensils, AlertCircle, Info, Star } from 'lucide-react'
import {
  getPetsForClient,
  addPetForClient,
  updatePetForClient,
  removePetForClient,
} from '@/lib/firebase/pets'
import { useUser } from '@clerk/nextjs'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { PhotoUpload } from '@/components/PhotoUpload'
import { cn } from '@/lib/utils'

interface PetManagementProps {
  initialPets?: Pet[]
}

// Animal types with their corresponding icons
const animalTypes = [
  { value: 'dog', label: 'Dog', icon: Dog, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'cat', label: 'Cat', icon: Cat, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'fish', label: 'Fish', icon: Fish, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'bird', label: 'Bird', icon: Bird, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'rabbit', label: 'Rabbit', icon: Rabbit, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'turtle', label: 'Turtle', icon: Turtle, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'other', label: 'Other', icon: Squirrel, color: 'bg-gray-100 text-gray-700 border-gray-200' },
]

// Function to get animal icon component and color
const getAnimalIcon = (type: string | undefined) => {
  const animal = animalTypes.find(a => a.value === type?.toLowerCase())
  const Icon = animal?.icon || Squirrel
  return { Icon, color: animal?.color || 'bg-gray-100 text-gray-700 border-gray-200' }
}

export function PetManagement({ initialPets = [] }: PetManagementProps) {
  const { user, isLoaded } = useUser()
  const [pets, setPets] = useState<Pet[]>(initialPets)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog/form state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ 
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
    photoUrl: ''
  })
  const [addError, setAddError] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ 
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
    photoUrl: ''
  })
  const [editError, setEditError] = useState<string | null>(null)
  const [isRemoveOpen, setIsRemoveOpen] = useState(false)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)

  // Fetch pets from Firestore on mount
  useEffect(() => {
    if (!isLoaded || !user) return
    setLoading(true)
    setError(null)
    getPetsForClient(user.id)
      .then((data) => setPets(data))
      .catch(() => setError('Failed to load pets'))
      .finally(() => setLoading(false))
  }, [isLoaded, user])

  // Add Pet
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)
    if (!addForm.name || !addForm.age) {
      setAddError('Name and age are required')
      return
    }
    if (!user) return
    const newPet = {
      name: addForm.name,
      age: Number(addForm.age),
      food: addForm.food,
      foodSchedule: addForm.foodSchedule || '',
      animalType: addForm.animalType || '',
      breed: addForm.breed || '',
      weight: addForm.weight || '',
      temperament: addForm.temperament,
      photoUrl: addForm.photoUrl || '',
      medications: addForm.medications || '',
      allergies: addForm.allergies || '',
      needToKnow: addForm.needToKnow || '',
      schedule: '',
    }
    try {
      // Optimistic update
      setPets((prev) => [...prev, { ...newPet, id: 'pending' } as Pet])
      const id = await addPetForClient(user.id, newPet)
      setPets((prev) => prev.map((p) => (p.id === 'pending' ? { ...p, id } : p)))
      setAddForm({ 
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
        photoUrl: ''
      })
      setIsAddOpen(false)
    } catch {
      setAddError('Failed to add pet')
      setPets((prev) => prev.filter((p) => p.id !== 'pending'))
    }
  }

  // Edit Pet
  const openEdit = (index: number) => {
    setEditIndex(index)
    const pet = pets[index]
    setEditForm({
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
      photoUrl: pet.photoUrl || ''
    })
    setEditError(null)
    setIsEditOpen(true)
  }
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError(null)
    if (!editForm.name || !editForm.age) {
      setEditError('Name and age are required')
      return
    }
    if (!user || editIndex === null) return
    const pet = pets[editIndex]
    const updatedPet: Pet = {
      ...pet,
      name: editForm.name,
      age: Number(editForm.age),
      food: editForm.food,
      foodSchedule: editForm.foodSchedule,
      animalType: editForm.animalType,
      breed: editForm.breed,
      weight: editForm.weight,
      temperament: editForm.temperament,
      medications: editForm.medications,
      allergies: editForm.allergies,
      needToKnow: editForm.needToKnow,
      photoUrl: editForm.photoUrl
    }
    try {
      setPets((prev) => prev.map((p, i) => (i === editIndex ? updatedPet : p)))
      await updatePetForClient(user.id, updatedPet)
      setIsEditOpen(false)
    } catch {
      setEditError('Failed to update pet')
    }
  }

  // Remove Pet
  const openRemove = (index: number) => {
    setRemoveIndex(index)
    setIsRemoveOpen(true)
  }
  const handleRemove = async () => {
    if (!user || removeIndex === null) return
    const pet = pets[removeIndex]
    try {
      setPets((prev) => prev.filter((_, i) => i !== removeIndex))
      await removePetForClient(user.id, pet.id)
      setIsRemoveOpen(false)
    } catch {
      setError('Failed to remove pet')
    }
  }

  // Form handlers
  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setAddForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded-lg w-48 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Pets</h1>
            <p className="text-gray-600">Manage your furry, feathered, and finned family members</p>
          </div>
          <Button 
            onClick={() => setIsAddOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6 py-3 font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Pet
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Empty State */}
        {pets.length === 0 && !error ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No pets yet</h3>
              <p className="text-gray-600 mb-6">Add your first furry friend to get started!</p>
              <Button 
                onClick={() => setIsAddOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6 py-3 font-medium"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Pet
              </Button>
            </div>
          </div>
        ) : (
          /* Pet Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pets.map((pet, i) => {
              const { Icon, color } = getAnimalIcon(pet.animalType)
              return (
                <div key={pet.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300 transform hover:-translate-y-1">
                  {/* Pet Photo */}
                  <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    {pet.photoUrl ? (
                      <img
                        src={pet.photoUrl}
                        alt={pet.name}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-purple-50">
                        <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                          <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                            {pet.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <Badge className={cn("border", color)}>
                        <Icon className="h-3 w-3 mr-1" />
                        {animalTypes.find(a => a.value === pet.animalType?.toLowerCase())?.label || pet.animalType || 'Pet'}
                      </Badge>
                    </div>
                  </div>

                  {/* Pet Info */}
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{pet.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {pet.age} {pet.age === 1 ? 'year' : 'years'} old
                          </span>
                          {pet.weight && (
                            <span className="flex items-center">
                              <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                              {pet.weight}
                            </span>
                          )}
                        </div>
                        {pet.breed && (
                          <p className="text-sm text-gray-600 mt-1">{pet.breed}</p>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-3 mb-6">
                      {pet.temperament && (
                        <div className="flex items-start">
                          <Star className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Temperament</p>
                            <p className="text-sm text-gray-900">{pet.temperament}</p>
                          </div>
                        </div>
                      )}
                      
                      {(pet.food || pet.foodSchedule) && (
                        <div className="flex items-start">
                          <Utensils className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Food</p>
                            {pet.food && <p className="text-sm text-gray-900">{pet.food}</p>}
                            {pet.foodSchedule && <p className="text-xs text-gray-600 mt-0.5">{pet.foodSchedule}</p>}
                          </div>
                        </div>
                      )}
                      
                      {pet.medications && (
                        <div className="flex items-start">
                          <Pill className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Medications</p>
                            <p className="text-sm text-gray-900">{pet.medications}</p>
                          </div>
                        </div>
                      )}
                      
                      {pet.allergies && (
                        <div className="flex items-start">
                          <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Allergies</p>
                            <p className="text-sm text-gray-900">{pet.allergies}</p>
                          </div>
                        </div>
                      )}
                      
                      {pet.needToKnow && (
                        <div className="flex items-start">
                          <Info className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Need to Know</p>
                            <p className="text-sm text-gray-900">{pet.needToKnow}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => openEdit(i)} 
                        className="flex-1 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => openRemove(i)} 
                        className="flex-1 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Add Pet Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Add New Pet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="text-center">
              <div className="mb-4">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Camera className="h-8 w-8 text-blue-600" />
                </div>
                <Label className="text-sm font-medium text-gray-700">Pet Photo</Label>
              </div>
              <PhotoUpload
                label="Upload Photo"
                storagePath={`pets/${user?.id || 'unknown'}-${addForm.name || 'pet'}`}
                initialUrl={addForm.photoUrl}
                onUpload={url => setAddForm(prev => ({ ...prev, photoUrl: url }))}
                disabled={loading}
                enableCropping={true}
                aspectRatio={1}
                previewSize="md"
                quality={0.8}
              />
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Pet Name *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={addForm.name} 
                  onChange={handleAddChange} 
                  required 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your pet's name"
                />
              </div>
              <div>
                <Label htmlFor="age" className="text-sm font-medium text-gray-700">Age (years) *</Label>
                <Input 
                  id="age" 
                  name="age" 
                  value={addForm.age} 
                  onChange={handleAddChange} 
                  required 
                  type="number" 
                  min={0} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="animalType" className="text-sm font-medium text-gray-700">Type of Animal</Label>
                <select
                  id="animalType"
                  name="animalType"
                  value={addForm.animalType}
                  onChange={handleAddChange}
                  className="mt-1 flex h-10 w-full items-center rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select animal type</option>
                  {animalTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="breed" className="text-sm font-medium text-gray-700">Breed</Label>
                <Input 
                  id="breed" 
                  name="breed" 
                  value={addForm.breed} 
                  onChange={handleAddChange} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Golden Retriever"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="weight" className="text-sm font-medium text-gray-700">Weight</Label>
              <Input 
                id="weight" 
                name="weight" 
                value={addForm.weight} 
                onChange={handleAddChange} 
                className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g., 15 lbs, 5 kg"
              />
            </div>

            <div>
              <Label htmlFor="temperament" className="text-sm font-medium text-gray-700">Temperament</Label>
              <Textarea 
                id="temperament" 
                name="temperament" 
                value={addForm.temperament} 
                onChange={handleAddChange} 
                className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Describe your pet's personality and behavior"
                rows={2}
              />
            </div>

            {/* Food & Care */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">Food & Care</h4>
              <div>
                <Label htmlFor="food" className="text-sm font-medium text-gray-700">Food Type</Label>
                <Input 
                  id="food" 
                  name="food" 
                  value={addForm.food} 
                  onChange={handleAddChange} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Type of food your pet eats"
                />
              </div>
              <div>
                <Label htmlFor="foodSchedule" className="text-sm font-medium text-gray-700">Feeding Schedule</Label>
                <Input 
                  id="foodSchedule" 
                  name="foodSchedule" 
                  value={addForm.foodSchedule} 
                  onChange={handleAddChange} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="When and how often to feed"
                />
              </div>
            </div>

            {/* Health Info */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">Health Information</h4>
              <div>
                <Label htmlFor="medications" className="text-sm font-medium text-gray-700">Medications</Label>
                <Textarea 
                  id="medications" 
                  name="medications" 
                  value={addForm.medications} 
                  onChange={handleAddChange} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="List any medications your pet takes"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="allergies" className="text-sm font-medium text-gray-700">Allergies</Label>
                <Textarea 
                  id="allergies" 
                  name="allergies" 
                  value={addForm.allergies} 
                  onChange={handleAddChange} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="List any known allergies"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="needToKnow" className="text-sm font-medium text-gray-700">Important Notes</Label>
                <Textarea 
                  id="needToKnow" 
                  name="needToKnow" 
                  value={addForm.needToKnow} 
                  onChange={handleAddChange} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Anything else the pet sitter should know"
                  rows={3}
                />
              </div>
            </div>

            {addError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">{addError}</span>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg"
              >
                Add Pet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Pet Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Edit Pet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="text-center">
              <div className="mb-4">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Camera className="h-8 w-8 text-blue-600" />
                </div>
                <Label className="text-sm font-medium text-gray-700">Pet Photo</Label>
              </div>
              <PhotoUpload
                label="Upload Photo"
                storagePath={`pets/${user?.id || 'unknown'}-${editForm.name || 'pet'}`}
                initialUrl={editForm.photoUrl}
                onUpload={url => setEditForm(prev => ({ ...prev, photoUrl: url }))}
                disabled={loading}
                enableCropping={true}
                aspectRatio={1}
                previewSize="md"
                quality={0.8}
              />
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">Pet Name *</Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  value={editForm.name} 
                  onChange={handleEditChange} 
                  required 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your pet's name"
                />
              </div>
              <div>
                <Label htmlFor="edit-age" className="text-sm font-medium text-gray-700">Age (years) *</Label>
                <Input 
                  id="edit-age" 
                  name="age" 
                  value={editForm.age} 
                  onChange={handleEditChange} 
                  required 
                  type="number" 
                  min={0} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-animalType" className="text-sm font-medium text-gray-700">Type of Animal</Label>
                <select
                  id="edit-animalType"
                  name="animalType"
                  value={editForm.animalType}
                  onChange={handleEditChange}
                  className="mt-1 flex h-10 w-full items-center rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select animal type</option>
                  {animalTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-breed" className="text-sm font-medium text-gray-700">Breed</Label>
                <Input 
                  id="edit-breed" 
                  name="breed" 
                  value={editForm.breed} 
                  onChange={handleEditChange} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Golden Retriever"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-weight" className="text-sm font-medium text-gray-700">Weight</Label>
              <Input 
                id="edit-weight" 
                name="weight" 
                value={editForm.weight} 
                onChange={handleEditChange} 
                className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g., 15 lbs, 5 kg"
              />
            </div>

            <div>
              <Label htmlFor="edit-temperament" className="text-sm font-medium text-gray-700">Temperament</Label>
              <Textarea 
                id="edit-temperament" 
                name="temperament" 
                value={editForm.temperament} 
                onChange={handleEditChange} 
                className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Describe your pet's personality and behavior"
                rows={2}
              />
            </div>

            {/* Food & Care */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">Food & Care</h4>
              <div>
                <Label htmlFor="edit-food" className="text-sm font-medium text-gray-700">Food Type</Label>
                <Input 
                  id="edit-food" 
                  name="food" 
                  value={editForm.food} 
                  onChange={handleEditChange} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Type of food your pet eats"
                />
              </div>
              <div>
                <Label htmlFor="edit-foodSchedule" className="text-sm font-medium text-gray-700">Feeding Schedule</Label>
                <Input 
                  id="edit-foodSchedule" 
                  name="foodSchedule" 
                  value={editForm.foodSchedule} 
                  onChange={handleEditChange} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="When and how often to feed"
                />
              </div>
            </div>

            {/* Health Info */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">Health Information</h4>
              <div>
                <Label htmlFor="edit-medications" className="text-sm font-medium text-gray-700">Medications</Label>
                <Textarea 
                  id="edit-medications" 
                  name="medications" 
                  value={editForm.medications} 
                  onChange={handleEditChange} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="List any medications your pet takes"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="edit-allergies" className="text-sm font-medium text-gray-700">Allergies</Label>
                <Textarea 
                  id="edit-allergies" 
                  name="allergies" 
                  value={editForm.allergies} 
                  onChange={handleEditChange} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="List any known allergies"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="edit-needToKnow" className="text-sm font-medium text-gray-700">Important Notes</Label>
                <Textarea 
                  id="edit-needToKnow" 
                  name="needToKnow" 
                  value={editForm.needToKnow} 
                  onChange={handleEditChange} 
                  className="mt-1 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Anything else the pet sitter should know"
                  rows={3}
                />
              </div>
            </div>

            {editError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">{editError}</span>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Pet Dialog */}
      <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Remove Pet</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-center text-gray-600 mb-2">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-gray-900">
                {removeIndex !== null ? pets[removeIndex]?.name : ''}
              </span>?
            </p>
            <p className="text-center text-sm text-gray-500">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsRemoveOpen(false)}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRemove}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Remove Pet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 