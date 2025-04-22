import { db } from '../../firebase'
import { collection, getDocs } from 'firebase/firestore'
import type { Contractor } from '@/types/contractor'

export async function getAllContractors(): Promise<Contractor[]> {
  const contractorsRef = collection(db, 'contractors')
  const snapshot = await getDocs(contractorsRef)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contractor))
} 