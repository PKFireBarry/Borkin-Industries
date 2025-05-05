import { db } from '../../firebase'
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import type { Contractor } from '@/types/contractor'
 
export async function getAllContractors(): Promise<Contractor[]> {
  const contractorsRef = collection(db, 'contractors')
  const snapshot = await getDocs(contractorsRef)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contractor))
}

export async function getContractorProfile(userId: string): Promise<Contractor | null> {
  const contractorRef = doc(db, 'contractors', userId)
  const snapshot = await getDoc(contractorRef)
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() } as Contractor
}

export async function updateContractorProfile(userId: string, data: Partial<Contractor>): Promise<void> {
  const contractorRef = doc(db, 'contractors', userId)
  await setDoc(contractorRef, data, { merge: true })
}

export async function getAllContractorApplications() {
  const appsRef = collection(db, 'contractorApplications')
  const snapshot = await getDocs(appsRef)
  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : null,
    }
  })
}

export async function updateContractorApplicationStatus(applicationId: string, status: string) {
  const appRef = doc(db, 'contractorApplications', applicationId)
  await updateDoc(appRef, { status })
}

export async function removeContractor(contractorId: string): Promise<void> {
  const contractorRef = doc(db, 'contractors', contractorId)
  await deleteDoc(contractorRef)
}

// Ban a contractor (add to banned_contractors collection)
export async function addBannedContractor({ userId, email, reason, bannedByEmail }: { userId: string, email: string, reason?: string, bannedByEmail?: string }) {
  const bannedRef = doc(collection(db, 'banned_contractors'), userId)
  await setDoc(bannedRef, { userId, email, reason, bannedAt: new Date().toISOString(), bannedByEmail })
}

// Check if a contractor is banned
export async function isBannedContractor(userId: string): Promise<boolean> {
  const bannedRef = doc(collection(db, 'banned_contractors'), userId)
  const snap = await getDoc(bannedRef)
  return snap.exists()
}

// Allow a banned contractor to reapply (remove from banned_contractors)
export async function allowReapplication(userId: string): Promise<void> {
  const bannedRef = doc(collection(db, 'banned_contractors'), userId)
  await deleteDoc(bannedRef)
}

// Set contractor application status to 'pending' (for reapplication)
export async function setContractorApplicationPending(userId: string): Promise<void> {
  const contractorRef = doc(db, 'contractors', userId)
  await setDoc(contractorRef, { application: { status: 'pending' } }, { merge: true })
} 