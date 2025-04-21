import { db } from '../../firebase'
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'
import type { Pet } from '@/types/client'

export async function getPetsForClient(clientId: string): Promise<Pet[]> {
  const clientRef = doc(db, 'clients', clientId)
  const snapshot = await getDoc(clientRef)
  const data = snapshot.data()
  return (data?.pets as Pet[]) || []
}

export async function addPetForClient(clientId: string, pet: Omit<Pet, 'id'>): Promise<string> {
  const clientRef = doc(db, 'clients', clientId)
  const snapshot = await getDoc(clientRef)
  const pets: Pet[] = (snapshot.exists() && snapshot.data().pets) || []
  const newPet: Pet = { ...pet, id: crypto.randomUUID() }
  if (!snapshot.exists()) {
    await setDoc(clientRef, { pets: [newPet] }, { merge: true })
  } else {
    await updateDoc(clientRef, { pets: [...pets, newPet] })
  }
  return newPet.id
}

export async function updatePetForClient(clientId: string, pet: Pet): Promise<void> {
  const clientRef = doc(db, 'clients', clientId)
  const snapshot = await getDoc(clientRef)
  const data = snapshot.data() || {}
  const pets: Pet[] = data.pets || []
  const updatedPets = pets.map((p) => (p.id === pet.id ? { ...p, ...pet } : p))
  await updateDoc(clientRef, { pets: updatedPets })
}

export async function removePetForClient(clientId: string, petId: string): Promise<void> {
  const clientRef = doc(db, 'clients', clientId)
  const snapshot = await getDoc(clientRef)
  const data = snapshot.data() || {}
  const pets: Pet[] = data.pets || []
  const updatedPets = pets.filter((p) => p.id !== petId)
  await updateDoc(clientRef, { pets: updatedPets })
} 