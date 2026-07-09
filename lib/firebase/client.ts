import { db } from '../../firebase'
import { doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import type { Client } from '@/types/client'

export async function updateClientProfile(clientId: string, profile: Partial<Client>) {
  const clientRef = doc(db, 'clients', clientId)
  await setDoc(clientRef, profile, { merge: true })
}

export async function getClientProfile(clientId: string): Promise<Client | null> {
  const clientRef = doc(db, 'clients', clientId)
  const snapshot = await getDoc(clientRef)
  if (!snapshot.exists()) return null
  return snapshot.data() as Client
}

export async function getClientById(clientId: string): Promise<Client | null> {
  const clientRef = doc(db, 'clients', clientId)
  const snapshot = await getDoc(clientRef)
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() } as Client
}

export async function getPetsByIds(clientId: string, petIds: string[]): Promise<any[]> {
  if (!petIds.length) return []
  const petsRef = collection(db, 'clients', clientId, 'pets')
  const q = query(petsRef, where('id', 'in', petIds))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
} 