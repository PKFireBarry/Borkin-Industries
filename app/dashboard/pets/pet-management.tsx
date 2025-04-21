'use client'

import { useEffect, useState } from 'react'
import type { Pet } from '@/types/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  getPetsForClient,
  addPetForClient,
  updatePetForClient,
  removePetForClient,
} from '@/lib/firebase/pets'
import { useUser } from '@clerk/nextjs'

interface PetManagementProps {
  initialPets?: Pet[]
}

export function PetManagement({ initialPets = [] }: PetManagementProps) {
  const { user, isLoaded } = useUser()
  const [pets, setPets] = useState<Pet[]>(initialPets)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog/form state (same as before)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', age: '', food: '', temperament: '' })
  const [addError, setAddError] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', age: '', food: '', temperament: '' })
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
      temperament: addForm.temperament,
      photoUrl: '',
      medications: '',
      schedule: '',
    }
    try {
      // Optimistic update
      setPets((prev) => [...prev, { ...newPet, id: 'pending' } as Pet])
      const id = await addPetForClient(user.id, newPet)
      setPets((prev) => prev.map((p) => (p.id === 'pending' ? { ...p, id } : p)))
      setAddForm({ name: '', age: '', food: '', temperament: '' })
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
      temperament: pet.temperament || '',
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
      temperament: editForm.temperament,
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

  // Add/Edit/Remove form handlers (same as before)
  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <section className="max-w-2xl mx-auto">
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
        <ul className="grid gap-4">
          {pets.map((pet, i) => (
            <li key={pet.id} className="rounded-lg border bg-background p-4 flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold text-lg">{pet.name}</div>
                <div className="text-sm text-muted-foreground">Age: {pet.age}</div>
                <div className="text-sm text-muted-foreground">Food: {pet.food}</div>
                <div className="text-sm text-muted-foreground">Temperament: {pet.temperament}</div>
              </div>
              <div className="mt-4 md:mt-0 flex gap-2">
                <Button variant="outline" onClick={() => openEdit(i)}>Edit</Button>
                <Button variant="destructive" onClick={() => openRemove(i)}>Remove</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {/* Add Pet Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Pet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
              <Input id="name" name="name" value={addForm.name} onChange={handleAddChange} required />
            </div>
            <div>
              <label htmlFor="age" className="block text-sm font-medium mb-1">Age</label>
              <Input id="age" name="age" value={addForm.age} onChange={handleAddChange} required type="number" min={0} />
            </div>
            <div>
              <label htmlFor="food" className="block text-sm font-medium mb-1">Food</label>
              <Input id="food" name="food" value={addForm.food} onChange={handleAddChange} />
            </div>
            <div>
              <label htmlFor="temperament" className="block text-sm font-medium mb-1">Temperament</label>
              <Input id="temperament" name="temperament" value={addForm.temperament} onChange={handleAddChange} />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium mb-1">Name</label>
              <Input id="edit-name" name="name" value={editForm.name} onChange={handleEditChange} required />
            </div>
            <div>
              <label htmlFor="edit-age" className="block text-sm font-medium mb-1">Age</label>
              <Input id="edit-age" name="age" value={editForm.age} onChange={handleEditChange} required type="number" min={0} />
            </div>
            <div>
              <label htmlFor="edit-food" className="block text-sm font-medium mb-1">Food</label>
              <Input id="edit-food" name="food" value={editForm.food} onChange={handleEditChange} />
            </div>
            <div>
              <label htmlFor="edit-temperament" className="block text-sm font-medium mb-1">Temperament</label>
              <Input id="edit-temperament" name="temperament" value={editForm.temperament} onChange={handleEditChange} />
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