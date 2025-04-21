import { db } from '../../firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
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