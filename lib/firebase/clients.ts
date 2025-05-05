import { db } from '../../firebase'
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import type { Client } from '@/types/client'

export async function getAllClients(): Promise<Client[]> {
  const clientsRef = collection(db, 'clients')
  const snapshot = await getDocs(clientsRef)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client))
}

export async function getClientProfile(userId: string): Promise<Client | null> {
  const clientRef = doc(db, 'clients', userId)
  const snapshot = await getDoc(clientRef)
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() } as Client
}

export async function updateClientProfile(userId: string, data: Partial<Client>): Promise<void> {
  const clientRef = doc(db, 'clients', userId)
  await setDoc(clientRef, data, { merge: true })
}

export async function removeClient(clientId: string): Promise<void> {
  const clientRef = doc(db, 'clients', clientId)
  await deleteDoc(clientRef)
}

// Ban a client (add to banned_clients collection)
export async function addBannedClient({ userId, email, reason, bannedByEmail }: { userId: string, email: string, reason?: string, bannedByEmail?: string }) {
  const bannedRef = doc(collection(db, 'banned_clients'), userId)
  await setDoc(bannedRef, { userId, email, reason, bannedAt: new Date().toISOString(), bannedByEmail })
}

// Check if a client is banned
export async function isBannedClient(userId: string): Promise<boolean> {
  const bannedRef = doc(collection(db, 'banned_clients'), userId)
  const snap = await getDoc(bannedRef)
  return snap.exists()
}

// Allow a banned client to reapply (remove from banned_clients)
export async function allowClientReapplication(userId: string): Promise<void> {
  const bannedRef = doc(collection(db, 'banned_clients'), userId)
  await deleteDoc(bannedRef)
} 