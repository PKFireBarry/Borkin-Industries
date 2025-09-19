import { db } from '../../firebase'
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore'
import type { Contractor } from '@/types/contractor'
import type { ContractorServiceOffering } from '@/types/service'
import type { DayAvailability, TimeSlot } from '@/types/contractor'

export async function getAllContractors(): Promise<Contractor[]> {
  const contractorsRef = collection(db, 'contractors')
  const snapshot = await getDocs(contractorsRef)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contractor))
}

/**
 * Add a time-range block to the contractor's calendar for each day in [startDate, endDate].
 * Uses the new time-based availability system: writes to availability.dailyAvailability[].unavailableSlots.
 * If dailyAvailability for a date does not exist, it will be created.
 */
export async function addGigTimeToContractorCalendar(
  contractorId: string,
  startDate: string,
  endDate: string,
  time: { startTime: string; endTime: string }
): Promise<void> {
  try {
    const contractorRef = doc(db, 'contractors', contractorId)
    const contractorSnap = await getDoc(contractorRef)
    if (!contractorSnap.exists()) {
      throw new Error(`Contractor ${contractorId} not found`)
    }

    const contractor = contractorSnap.data() as Contractor
    const dailyAvailability: DayAvailability[] = contractor.availability?.dailyAvailability || []

    // Build list of dates (YYYY-MM-DD) between start and end inclusive
    const dates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    start.setUTCHours(0, 0, 0, 0)
    end.setUTCHours(0, 0, 0, 0)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10))
    }

    // Helper: check overlap between two time slots (HH:MM strings)
    const overlaps = (a: TimeSlot, b: TimeSlot) => a.startTime < b.endTime && a.endTime > b.startTime

    // Check if this is an overnight booking (crosses midnight)
    const isOvernight = time.startTime > time.endTime && dates.length > 1

    const updated: DayAvailability[] = [...dailyAvailability]

    if (isOvernight) {
      // Handle overnight booking spanning multiple days
      dates.forEach((iso, index) => {
        let timeSlot: TimeSlot

        if (index === 0) {
          // First day: startTime to end of day (23:59)
          timeSlot = { startTime: time.startTime, endTime: "23:59" }
        } else if (index === dates.length - 1) {
          // Last day: start of day (00:00) to endTime
          timeSlot = { startTime: "00:00", endTime: time.endTime }
        } else {
          // Middle days: mark as fully unavailable
          const idx = updated.findIndex(d => d.date === iso)
          if (idx === -1) {
            updated.push({ date: iso, isFullyUnavailable: true, unavailableSlots: [] })
          } else {
            updated[idx] = { ...updated[idx], isFullyUnavailable: true }
          }
          return // Skip time slot logic for full days
        }

        // Apply time slot to this day
        const idx = updated.findIndex(d => d.date === iso)
        if (idx === -1) {
          updated.push({ date: iso, isFullyUnavailable: false, unavailableSlots: [timeSlot] })
        } else {
          const day = updated[idx]
          if (!day.isFullyUnavailable) {
            const slots = [...(day.unavailableSlots || [])]
            const hasOverlap = slots.some(s => overlaps(s, timeSlot))
            if (!hasOverlap) {
              slots.push(timeSlot)
              slots.sort((a, b) => a.startTime.localeCompare(b.startTime))
              updated[idx] = { ...day, unavailableSlots: slots }
            }
          }
        }
      })
    } else {
      // Handle same-day bookings or single-day bookings (existing logic)
      for (const iso of dates) {
        const idx = updated.findIndex(d => d.date === iso)
        if (idx === -1) {
          updated.push({ date: iso, isFullyUnavailable: false, unavailableSlots: [time] })
        } else {
          // If day is fully unavailable, keep as-is (already blocked all day)
          const day = updated[idx]
          if (day.isFullyUnavailable) continue
          const slots = [...(day.unavailableSlots || [])]
          // Avoid inserting overlapping duplicates
          const hasOverlap = slots.some(s => overlaps(s, time))
          if (!hasOverlap) {
            slots.push(time)
            slots.sort((a, b) => a.startTime.localeCompare(b.startTime))
            updated[idx] = { ...day, unavailableSlots: slots }
          }
        }
      }
    }

    await updateDoc(contractorRef, {
      'availability.dailyAvailability': updated,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error adding gig time to contractor calendar:', error)
    throw new Error('Failed to update contractor calendar (time-based)')
  }
}

/**
 * Remove a time-range block from the contractor's calendar for each day in [startDate, endDate].
 * If a day's unavailableSlots becomes empty, the day entry is removed (cleanup).
 */
export async function removeGigTimeFromContractorCalendar(
  contractorId: string,
  startDate: string,
  endDate: string,
  time: { startTime: string; endTime: string }
): Promise<void> {
  try {
    const contractorRef = doc(db, 'contractors', contractorId)
    const contractorSnap = await getDoc(contractorRef)
    if (!contractorSnap.exists()) {
      throw new Error(`Contractor ${contractorId} not found`)
    }

    const contractor = contractorSnap.data() as Contractor
    const dailyAvailability: DayAvailability[] = contractor.availability?.dailyAvailability || []

    // Build list of dates (YYYY-MM-DD) between start and end inclusive
    const dates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    start.setUTCHours(0, 0, 0, 0)
    end.setUTCHours(0, 0, 0, 0)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10))
    }

    // Check if this is an overnight booking (crosses midnight)
    const isOvernight = time.startTime > time.endTime && dates.length > 1

    const updated: DayAvailability[] = [...dailyAvailability]

    if (isOvernight) {
      // Handle overnight booking removal spanning multiple days
      dates.forEach((iso, index) => {
        const idx = updated.findIndex(d => d.date === iso)
        if (idx === -1) return

        const day = updated[idx]

        if (index === 0) {
          // First day: remove startTime to 23:59 slot
          const targetSlot = { startTime: time.startTime, endTime: "23:59" }
          const filtered = (day.unavailableSlots || []).filter(
            s => !(s.startTime === targetSlot.startTime && s.endTime === targetSlot.endTime)
          )
          if (filtered.length === 0 && !day.isFullyUnavailable) {
            updated.splice(idx, 1)
          } else {
            updated[idx] = { ...day, unavailableSlots: filtered }
          }
        } else if (index === dates.length - 1) {
          // Last day: remove 00:00 to endTime slot
          const targetSlot = { startTime: "00:00", endTime: time.endTime }
          const filtered = (day.unavailableSlots || []).filter(
            s => !(s.startTime === targetSlot.startTime && s.endTime === targetSlot.endTime)
          )
          if (filtered.length === 0 && !day.isFullyUnavailable) {
            updated.splice(idx, 1)
          } else {
            updated[idx] = { ...day, unavailableSlots: filtered }
          }
        } else {
          // Middle days: remove full unavailability
          if (day.isFullyUnavailable) {
            updated[idx] = { ...day, isFullyUnavailable: false }
            // If no slots left, remove the day entry
            if (!day.unavailableSlots || day.unavailableSlots.length === 0) {
              updated.splice(idx, 1)
            }
          }
        }
      })
    } else {
      // Handle same-day or single-day booking removal (existing logic)
      for (const iso of dates) {
        const idx = updated.findIndex(d => d.date === iso)
        if (idx === -1) continue
        const day = updated[idx]
        if (day.isFullyUnavailable) continue
        const filtered = (day.unavailableSlots || []).filter(
          s => !(s.startTime === time.startTime && s.endTime === time.endTime)
        )
        if (filtered.length === 0) {
          // Remove the day entry if no slots and not fully unavailable
          updated.splice(idx, 1)
        } else {
          updated[idx] = { ...day, unavailableSlots: filtered }
        }
      }
    }

    await updateDoc(contractorRef, {
      'availability.dailyAvailability': updated,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error removing gig time from contractor calendar:', error)
    throw new Error('Failed to update contractor calendar (time-based)')
  }
}

export async function getApprovedContractors(): Promise<Contractor[]> {
  const contractorsRef = collection(db, 'contractors')
  const snapshot = await getDocs(contractorsRef)
  const allContractors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contractor))
  
  return allContractors.filter(contractor => contractor.application?.status === 'approved')
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

export async function saveContractorFeedback(
  contractorId: string,
  bookingId: string,
  feedbackComment: string
): Promise<void> {
  const contractorRef = doc(db, 'contractors', contractorId)
  const contractorSnap = await getDoc(contractorRef)
  
  if (!contractorSnap.exists()) {
    throw new Error('Contractor not found')
  }
  
  const contractorData = contractorSnap.data()
  const ratings = contractorData.ratings || []
  
  // Find the specific rating to update
  const ratingIndex = ratings.findIndex((r: any) => r.bookingId === bookingId)
  if (ratingIndex === -1) {
    throw new Error('Review not found')
  }
  
  const rating = ratings[ratingIndex]
  
  // Check if feedback already exists
  if (rating.contractorFeedback) {
    throw new Error('Feedback has already been provided for this review')
  }
  
  // Create updated rating with feedback
  const updatedRating = {
    ...rating,
    contractorFeedback: {
      comment: feedbackComment,
      date: new Date().toISOString()
    }
  }
  
  // Remove old rating and add updated one
  await updateDoc(contractorRef, {
    ratings: arrayRemove(rating)
  })
  
  await updateDoc(contractorRef, {
    ratings: arrayUnion(updatedRating)
  })
} 