import { db } from '../../firebase'
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore'
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