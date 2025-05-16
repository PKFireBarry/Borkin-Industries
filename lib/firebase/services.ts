import { db } from '../../firebase'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore'
import type { PlatformService } from '@/types/service'

/**
 * Fetches all platform services from Firestore
 */
export async function getAllPlatformServices(): Promise<PlatformService[]> {
  try {
    const servicesRef = collection(db, 'platform_services')
    const snapshot = await getDocs(servicesRef)
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as PlatformService))
  } catch (error) {
    console.error('Error fetching platform services:', error)
    throw new Error('Failed to fetch platform services')
  }
}

/**
 * Fetches a single platform service by ID
 */
export async function getPlatformServiceById(serviceId: string): Promise<PlatformService | null> {
  try {
    const serviceRef = doc(db, 'platform_services', serviceId)
    const snapshot = await getDoc(serviceRef)
    if (!snapshot.exists()) return null
    return { 
      id: snapshot.id, 
      ...snapshot.data() 
    } as PlatformService
  } catch (error) {
    console.error(`Error fetching platform service ${serviceId}:`, error)
    throw new Error('Failed to fetch platform service')
  }
}

/**
 * Creates a new platform service
 */
export async function createPlatformService(service: Omit<PlatformService, 'id'>): Promise<string> {
  try {
    const servicesRef = collection(db, 'platform_services')
    const newDocRef = doc(servicesRef)
    
    await setDoc(newDocRef, {
      ...service,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    return newDocRef.id
  } catch (error) {
    console.error('Error creating platform service:', error)
    throw new Error('Failed to create platform service')
  }
}

/**
 * Updates an existing platform service
 */
export async function updatePlatformService(serviceId: string, updates: Partial<PlatformService>): Promise<void> {
  try {
    const serviceRef = doc(db, 'platform_services', serviceId)
    const snapshot = await getDoc(serviceRef)
    
    if (!snapshot.exists()) {
      throw new Error(`Platform service with ID ${serviceId} does not exist`)
    }
    
    await updateDoc(serviceRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error(`Error updating platform service ${serviceId}:`, error)
    throw new Error('Failed to update platform service')
  }
}

/**
 * Deletes a platform service
 */
export async function deletePlatformService(serviceId: string): Promise<void> {
  try {
    const serviceRef = doc(db, 'platform_services', serviceId)
    await deleteDoc(serviceRef)
  } catch (error) {
    console.error(`Error deleting platform service ${serviceId}:`, error)
    throw new Error('Failed to delete platform service')
  }
} 