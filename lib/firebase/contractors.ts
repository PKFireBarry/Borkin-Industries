import { db } from '../../firebase'
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, arrayUnion } from 'firebase/firestore'
import type { Contractor } from '@/types/contractor'
import type { ContractorServiceOffering } from '@/types/service'

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

export async function getContractorServiceOfferings(contractorId: string): Promise<ContractorServiceOffering[]> {
  const offeringsColRef = collection(db, "contractors", contractorId, "serviceOfferings")
  try {
    const snapshot = await getDocs(offeringsColRef)
    return snapshot.docs.map(docSnap => ({
      serviceId: docSnap.id,
      contractorUid: contractorId,
      price: docSnap.data().price,
      ...docSnap.data()
    } as ContractorServiceOffering))
  } catch (error) {
    console.error(`Error fetching service offerings for contractor ${contractorId}:`, error)
    return []
  }
}

export async function updateContractorProfile(userId: string, data: Partial<Contractor>): Promise<void> {
  try {
    const contractorRef = doc(db, 'contractors', userId);
    // Create a new object without serviceOfferings to avoid TypeScript error
    const { serviceOfferings, ...updateData } = data as Partial<Contractor> & { serviceOfferings?: any };
    
    // Check if contractor exists first
    const docSnap = await getDoc(contractorRef);
    if (!docSnap.exists()) {
      // Create a new contractor document if it doesn't exist
      await setDoc(contractorRef, {
        id: userId,
        ...updateData,
        createdAt: serverTimestamp(),
      });
    } else {
      // Update existing contractor document
      await setDoc(contractorRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error updating contractor profile:', error);
    throw new Error('Failed to update contractor profile');
  }
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

/**
 * Add approved gig dates to contractor's unavailable dates
 * This function is called when a gig is approved to block those dates in the contractor's calendar
 */
export async function addGigDatesToContractorCalendar(contractorId: string, startDate: string, endDate: string): Promise<void> {
  try {
    const contractorRef = doc(db, 'contractors', contractorId)
    
    // Get current contractor data
    const contractorSnap = await getDoc(contractorRef)
    if (!contractorSnap.exists()) {
      throw new Error(`Contractor ${contractorId} not found`)
    }
    
    const contractor = contractorSnap.data() as Contractor
    const currentUnavailableDates = contractor.availability?.unavailableDates || []
    
    // Generate all dates in the range (inclusive)
    const gigDates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Reset time to midnight to ensure consistent date handling
    start.setUTCHours(0, 0, 0, 0)
    end.setUTCHours(0, 0, 0, 0)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const isoDate = d.toISOString().slice(0, 10) // YYYY-MM-DD format
      gigDates.push(isoDate)
    }
    
    // Merge with existing unavailable dates and remove duplicates
    const updatedUnavailableDates = [...new Set([...currentUnavailableDates, ...gigDates])]
    
    // Update contractor availability
    await updateDoc(contractorRef, {
      'availability.unavailableDates': updatedUnavailableDates,
      updatedAt: serverTimestamp()
    })
    
    console.log(`Added ${gigDates.length} gig dates to contractor ${contractorId}'s calendar:`, gigDates)
  } catch (error) {
    console.error('Error adding gig dates to contractor calendar:', error)
    throw new Error('Failed to update contractor calendar')
  }
}

/**
 * Remove cancelled gig dates from contractor's unavailable dates
 * This function is called when a gig is cancelled to free up those dates in the contractor's calendar
 */
export async function removeGigDatesFromContractorCalendar(contractorId: string, startDate: string, endDate: string): Promise<void> {
  try {
    const contractorRef = doc(db, 'contractors', contractorId)
    
    // Get current contractor data
    const contractorSnap = await getDoc(contractorRef)
    if (!contractorSnap.exists()) {
      throw new Error(`Contractor ${contractorId} not found`)
    }
    
    const contractor = contractorSnap.data() as Contractor
    const currentUnavailableDates = contractor.availability?.unavailableDates || []
    
    // Generate all dates in the range (inclusive)
    const gigDates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Reset time to midnight to ensure consistent date handling
    start.setUTCHours(0, 0, 0, 0)
    end.setUTCHours(0, 0, 0, 0)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const isoDate = d.toISOString().slice(0, 10) // YYYY-MM-DD format
      gigDates.push(isoDate)
    }
    
    // Remove gig dates from unavailable dates
    const updatedUnavailableDates = currentUnavailableDates.filter(date => !gigDates.includes(date))
    
    // Update contractor availability
    await updateDoc(contractorRef, {
      'availability.unavailableDates': updatedUnavailableDates,
      updatedAt: serverTimestamp()
    })
    
    console.log(`Removed ${gigDates.length} gig dates from contractor ${contractorId}'s calendar:`, gigDates)
  } catch (error) {
    console.error('Error removing gig dates from contractor calendar:', error)
    throw new Error('Failed to update contractor calendar')
  }
} 