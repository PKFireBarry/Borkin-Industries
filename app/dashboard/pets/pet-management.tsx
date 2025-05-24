'use client'

import { useEffect, useState } from 'react'
import type { Pet } from '@/types/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Heart, Cat, Dog, Fish, Bird, Rabbit, Turtle, Squirrel } from 'lucide-react'
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

interface PetManagementProps {
  initialPets?: Pet[]
}

// Animal types with their corresponding icons
const animalTypes = [
  { value: 'dog', label: 'Dog', icon: Dog },
  { value: 'cat', label: 'Cat', icon: Cat },
  { value: 'fish', label: 'Fish', icon: Fish },
  { value: 'bird', label: 'Bird', icon: Bird },
  { value: 'rabbit', label: 'Rabbit', icon: Rabbit },
  { value: 'turtle', label: 'Turtle', icon: Turtle },
  { value: 'other', label: 'Other', icon: Squirrel },
]

// Function to get animal icon component
const getAnimalIcon = (type: string | undefined) => {
  const animal = animalTypes.find(a => a.value === type?.toLowerCase())
  const Icon = animal?.icon || Squirrel
  return <Icon className="h-4 w-4 mr-1" />
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

  return (
    <section className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Pets</h1>
        <Button onClick={() => setIsAddOpen(true)}>Add Pet</Button>
      </div>
      {loading ? (
        <div>Loading pets...</div>
      ) : error ? (
        <div className="text-destructive">{error}</div>
      ) : pets.length === 0 ? (
        <div className="text-muted-foreground">No pets found. Add your first pet!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet, i) => (
            <div key={pet.id} className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="relative h-48 bg-muted">
                {pet.photoUrl ? (
                  <img
                    src={pet.photoUrl}
                    alt={pet.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback>
                        {pet.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
 
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-xl">{pet.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground">Age: {pet.age}</p>
                      {pet.weight && (
                        <p className="text-sm text-muted-foreground">Weight: {pet.weight}</p>
                      )}
                      {pet.animalType && (
                        <Badge variant="secondary" className="flex items-center">
                          {getAnimalIcon(pet.animalType)}
                          {animalTypes.find(a => a.value === pet.animalType?.toLowerCase())?.label || pet.animalType}
                        </Badge>
                      )}
                    </div>
                    {pet.breed && (
                      <p className="text-sm text-muted-foreground mt-1">Breed: {pet.breed}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {pet.temperament && (
                    <div>
                      <h4 className="text-sm font-medium">Temperament</h4>
                      <p className="text-sm text-muted-foreground">{pet.temperament}</p>
                    </div>
                  )}
                  
                  {(pet.food || pet.foodSchedule) && (
                    <div>
                      <h4 className="text-sm font-medium">Food</h4>
                      {pet.food && (
                        <p className="text-sm text-muted-foreground">Type: {pet.food}</p>
                      )}
                      {pet.foodSchedule && (
                        <p className="text-sm text-muted-foreground mt-1">Schedule: {pet.foodSchedule}</p>
                      )}
                    </div>
                  )}
                  
                  {pet.medications && (
                    <div>
                      <h4 className="text-sm font-medium">Medications</h4>
                      <p className="text-sm text-muted-foreground">{pet.medications}</p>
                    </div>
                  )}
                  
                  {pet.allergies && (
                    <div>
                      <h4 className="text-sm font-medium">Allergies</h4>
                      <p className="text-sm text-muted-foreground">{pet.allergies}</p>
                    </div>
                  )}
                  
                  {pet.needToKnow && (
                    <div>
                      <h4 className="text-sm font-medium">Need to Know</h4>
                      <p className="text-sm text-muted-foreground">{pet.needToKnow}</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" onClick={() => openEdit(i)} className="flex-1">Edit</Button>
                  <Button variant="destructive" onClick={() => openRemove(i)} className="flex-1">Remove</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Pet Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Pet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="photoUrl">Photo URL</Label>
                <PhotoUpload
                  label="Pet Photo"
                  storagePath={`pets/${user?.id || 'unknown'}-${addForm.name || 'pet'}`}
                  initialUrl={addForm.photoUrl}
                  onUpload={url => setAddForm(prev => ({ ...prev, photoUrl: url }))}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" value={addForm.name} onChange={handleAddChange} required />
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input id="age" name="age" value={addForm.age} onChange={handleAddChange} required type="number" min={0} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="animalType">Type of Animal</Label>
                <select
                  id="animalType"
                  name="animalType"
                  value={addForm.animalType}
                  onChange={handleAddChange}
                  className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                <Label htmlFor="breed">Breed</Label>
                <Input id="breed" name="breed" value={addForm.breed} onChange={handleAddChange} placeholder="Pet's breed (optional)" />
              </div>
              <div>
                <Label htmlFor="weight">Weight</Label>
                <Input id="weight" name="weight" value={addForm.weight} onChange={handleAddChange} placeholder="ex: 15 lbs" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="food">Food Type</Label>
                <Input id="food" name="food" value={addForm.food} onChange={handleAddChange} placeholder="Type of food your pet eats" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="foodSchedule">Feeding Schedule</Label>
                <Input id="foodSchedule" name="foodSchedule" value={addForm.foodSchedule} onChange={handleAddChange} placeholder="When and how often to feed" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="temperament">Temperament</Label>
                <Input id="temperament" name="temperament" value={addForm.temperament} onChange={handleAddChange} placeholder="Describe your pet's temperament" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="medications">Medications</Label>
                <Textarea id="medications" name="medications" value={addForm.medications} onChange={handleAddChange} placeholder="List any medications and schedule" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea id="allergies" name="allergies" value={addForm.allergies} onChange={handleAddChange} placeholder="List any allergies your pet has" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="needToKnow">Need to Know</Label>
                <Textarea id="needToKnow" name="needToKnow" value={addForm.needToKnow} onChange={handleAddChange} placeholder="Additional important information" />
              </div>
            </div>
            {addError && <div className="text-destructive text-sm">{addError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit">Add Pet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Pet Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="edit-photoUrl">Photo URL</Label>
                <PhotoUpload
                  label="Pet Photo"
                  storagePath={`pets/${user?.id || 'unknown'}-${editForm.name || 'pet'}`}
                  initialUrl={editForm.photoUrl}
                  onUpload={url => setEditForm(prev => ({ ...prev, photoUrl: url }))}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" name="name" value={editForm.name} onChange={handleEditChange} required />
              </div>
              <div>
                <Label htmlFor="edit-age">Age</Label>
                <Input id="edit-age" name="age" value={editForm.age} onChange={handleEditChange} required type="number" min={0} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-animalType">Type of Animal</Label>
                <select
                  id="edit-animalType"
                  name="animalType"
                  value={editForm.animalType}
                  onChange={handleEditChange}
                  className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                <Label htmlFor="edit-breed">Breed</Label>
                <Input id="edit-breed" name="breed" value={editForm.breed} onChange={handleEditChange} placeholder="Pet's breed (optional)" />
              </div>
              <div>
                <Label htmlFor="edit-weight">Weight</Label>
                <Input id="edit-weight" name="weight" value={editForm.weight} onChange={handleEditChange} placeholder="ex: 15 lbs" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-food">Food Type</Label>
                <Input id="edit-food" name="food" value={editForm.food} onChange={handleEditChange} placeholder="Type of food your pet eats" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-foodSchedule">Feeding Schedule</Label>
                <Input id="edit-foodSchedule" name="foodSchedule" value={editForm.foodSchedule} onChange={handleEditChange} placeholder="When and how often to feed" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-temperament">Temperament</Label>
                <Input id="edit-temperament" name="temperament" value={editForm.temperament} onChange={handleEditChange} placeholder="Describe your pet's temperament" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-medications">Medications</Label>
                <Textarea id="edit-medications" name="medications" value={editForm.medications} onChange={handleEditChange} placeholder="List any medications and schedule" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-allergies">Allergies</Label>
                <Textarea id="edit-allergies" name="allergies" value={editForm.allergies} onChange={handleEditChange} placeholder="List any allergies your pet has" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-needToKnow">Need to Know</Label>
                <Textarea id="edit-needToKnow" name="needToKnow" value={editForm.needToKnow} onChange={handleEditChange} placeholder="Additional important information" />
              </div>
            </div>
            {editError && <div className="text-destructive text-sm">{editError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Remove Pet Dialog */}
      <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Pet</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to remove this pet?</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsRemoveOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleRemove}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
} 