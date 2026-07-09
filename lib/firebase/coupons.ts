import { db } from '../../firebase'
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  increment,
  addDoc
} from 'firebase/firestore'
import { 
  Coupon, 
  CouponUsage, 
  CouponValidationResult, 
  CreateCouponData, 
  UpdateCouponData 
} from '../../types/coupon'

/**
 * Creates a new coupon
 */
export async function createCoupon(data: CreateCouponData): Promise<Coupon> {
  try {
    // Check if coupon code already exists
    const existingCoupon = await getCouponByCode(data.code)
    if (existingCoupon) {
      throw new Error('Coupon code already exists')
    }

    // Filter out undefined values to avoid Firebase errors
    const couponData: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> = {
      code: data.code.toUpperCase(),
      name: data.name,
      type: data.type,
      value: data.value,
      isActive: true,
      ...(data.contractorId && { contractorId: data.contractorId }),
      ...(data.expirationDate && { expirationDate: data.expirationDate }),
      ...(data.description && { description: data.description }),
      ...(data.maxUsage && { maxUsage: data.maxUsage })
    }

    const couponRef = doc(collection(db, 'coupons'))
    const now = new Date().toISOString()
    
    const coupon: Coupon = {
      id: couponRef.id,
      ...couponData,
      createdAt: now,
      updatedAt: now,
      usageCount: 0
    }

    await setDoc(couponRef, coupon)
    return coupon
  } catch (error) {
    console.error('Error creating coupon:', error)
    throw new Error('Failed to create coupon')
  }
}

/**
 * Gets a coupon by ID
 */
export async function getCoupon(id: string): Promise<Coupon | null> {
  try {
    const couponRef = doc(db, 'coupons', id)
    const snapshot = await getDoc(couponRef)
    
    if (!snapshot.exists()) {
      return null
    }
    
    return snapshot.data() as Coupon
  } catch (error) {
    console.error(`Error fetching coupon ${id}:`, error)
    throw new Error('Failed to fetch coupon')
  }
}

/**
 * Gets a coupon by code
 */
export async function getCouponByCode(code: string): Promise<Coupon | null> {
  try {
    const couponsRef = collection(db, 'coupons')
    const q = query(couponsRef, where('code', '==', code.toUpperCase()))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return null
    }
    
    return snapshot.docs[0].data() as Coupon
  } catch (error) {
    console.error(`Error fetching coupon by code ${code}:`, error)
    throw new Error('Failed to fetch coupon by code')
  }
}

/**
 * Gets all coupons
 */
export async function getAllCoupons(): Promise<Coupon[]> {
  try {
    const couponsRef = collection(db, 'coupons')
    const q = query(couponsRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => doc.data() as Coupon)
  } catch (error) {
    console.error('Error fetching all coupons:', error)
    throw new Error('Failed to fetch coupons')
  }
}

/**
 * Gets coupons for a specific contractor
 */
export async function getContractorCoupons(contractorId: string): Promise<Coupon[]> {
  try {
    const couponsRef = collection(db, 'coupons')
    
    // Try the optimized query first (requires composite index)
    try {
      const q = query(
        couponsRef, 
        where('contractorId', '==', contractorId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => doc.data() as Coupon)
    } catch (indexError: any) {
      // If the composite index doesn't exist, fall back to a simpler query
      console.warn('Composite index not found for coupons query, using fallback:', indexError.message)
      
      // Fallback: query without orderBy to avoid index requirement
      const fallbackQuery = query(
        couponsRef,
        where('contractorId', '==', contractorId),
        where('isActive', '==', true)
      )
      const snapshot = await getDocs(fallbackQuery)
      const coupons = snapshot.docs.map(doc => doc.data() as Coupon)
      
      // Sort in memory instead of in the query
      return coupons.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  } catch (error) {
    console.error(`Error fetching coupons for contractor ${contractorId}:`, error)
    // Return empty array instead of throwing to prevent profile loading failure
    return []
  }
}

/**
 * Updates a coupon
 */
export async function updateCoupon(id: string, data: UpdateCouponData): Promise<void> {
  try {
    const couponRef = doc(db, 'coupons', id)
    await updateDoc(couponRef, {
      ...data,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error(`Error updating coupon ${id}:`, error)
    throw new Error('Failed to update coupon')
  }
}

/**
 * Deletes a coupon
 */
export async function deleteCoupon(id: string): Promise<void> {
  try {
    const couponRef = doc(db, 'coupons', id)
    await deleteDoc(couponRef)
  } catch (error) {
    console.error(`Error deleting coupon ${id}:`, error)
    throw new Error('Failed to delete coupon')
  }
}

/**
 * Validates a coupon for a booking
 */
export async function validateCoupon(
  code: string, 
  contractorId: string, 
  bookingAmount: number
): Promise<CouponValidationResult> {
  try {
    const coupon = await getCouponByCode(code)
    
    if (!coupon) {
      return { isValid: false, error: 'Coupon not found' }
    }
    
    if (!coupon.isActive) {
      return { isValid: false, error: 'Coupon is inactive' }
    }
    
    // Check expiration
    if (coupon.expirationDate && new Date(coupon.expirationDate) < new Date()) {
      return { isValid: false, error: 'Coupon has expired' }
    }
    
    // Check usage limit for site-wide coupons
    if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
      return { isValid: false, error: 'Coupon usage limit reached' }
    }
    
    // Check if contractor-specific coupon matches
    if (coupon.contractorId && coupon.contractorId !== contractorId) {
      return { isValid: false, error: 'Coupon not valid for this contractor' }
    }
    
    // Calculate discount
    let discountAmount = 0
    let finalPrice = bookingAmount
    
    if (coupon.type === 'fixed_price') {
      // For fixed price coupons, the value is the price PER DAY in dollars
      // bookingAmount is in cents, coupon.value is in dollars
      // We need to calculate the total based on the number of days
      // Since we don't have the number of days here, we'll return the per-day price in cents
      // and let the booking flow handle the multiplication
      const couponValueInCents = coupon.value * 100
      finalPrice = couponValueInCents // This will be the per-day price in cents
      discountAmount = 0 // We'll calculate this in the booking flow
    } else if (coupon.type === 'percentage') {
      // For percentage coupons, calculate the discount and final price
      discountAmount = (bookingAmount * coupon.value) / 100
      finalPrice = bookingAmount - discountAmount
    }
    
    return {
      isValid: true,
      coupon,
      discountAmount,
      finalPrice
    }
  } catch (error) {
    console.error('Error validating coupon:', error)
    return { isValid: false, error: 'Failed to validate coupon' }
  }
}

/**
 * Records coupon usage
 */
export async function recordCouponUsage(
  couponId: string,
  bookingId: string,
  clientId: string,
  contractorId: string,
  discountAmount: number,
  originalPrice: number,
  finalPrice: number
): Promise<void> {
  try {
    // Record usage in coupon document
    const couponRef = doc(db, 'coupons', couponId)
    await updateDoc(couponRef, {
      usageCount: increment(1),
      updatedAt: new Date().toISOString()
    })
    
    // Create usage record
    const usageData: Omit<CouponUsage, 'id'> = {
      couponId,
      bookingId,
      clientId,
      contractorId,
      discountAmount,
      originalPrice,
      finalPrice,
      usedAt: new Date().toISOString()
    }
    

    
    await addDoc(collection(db, 'couponUsage'), usageData)
  } catch (error) {
    console.error('Error recording coupon usage:', error)
    throw new Error('Failed to record coupon usage')
  }
}

/**
 * Gets coupon usage history with client and contractor names
 */
export async function getCouponUsageHistory(couponId?: string): Promise<(CouponUsage & { clientName?: string; contractorName?: string })[]> {
  try {
    const usageRef = collection(db, 'couponUsage')
    
    let usageHistory: CouponUsage[] = []
    
    if (couponId) {
      // Try the optimized query first (requires composite index)
      try {
        const q = query(
          usageRef, 
          where('couponId', '==', couponId), 
          orderBy('usedAt', 'desc')
        )
        const snapshot = await getDocs(q)
        usageHistory = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as CouponUsage))
      } catch (indexError: any) {
        // If the composite index doesn't exist, fall back to a simpler query
        console.warn('Composite index not found for coupon usage query, using fallback:', indexError.message)
        
        // Fallback: query without orderBy to avoid index requirement
        const fallbackQuery = query(
          usageRef,
          where('couponId', '==', couponId)
        )
        const snapshot = await getDocs(fallbackQuery)
        usageHistory = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as CouponUsage))
        
        // Sort in memory instead of in the query
        usageHistory.sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
      }
    } else {
      // Get all usage history (no filtering needed)
      const q = query(usageRef, orderBy('usedAt', 'desc'))
      const snapshot = await getDocs(q)
      
      usageHistory = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CouponUsage))
    }
    
    // Fetch client and contractor names
    const { getClientProfile } = await import('./clients')
    const { getContractorProfile } = await import('./contractors')
    
    const enrichedHistory = await Promise.all(
      usageHistory.map(async (usage) => {
        try {
          const [client, contractor] = await Promise.all([
            getClientProfile(usage.clientId),
            getContractorProfile(usage.contractorId)
          ])
          
          return {
            ...usage,
            clientName: client?.name || 'Unknown Client',
            contractorName: contractor?.name || 'Unknown Contractor'
          }
        } catch (error) {
          console.warn(`Failed to fetch names for usage ${usage.id}:`, error)
          return {
            ...usage,
            clientName: 'Unknown Client',
            contractorName: 'Unknown Contractor'
          }
        }
      })
    )
    
    return enrichedHistory
  } catch (error) {
    console.error('Error fetching coupon usage history:', error)
    throw new Error('Failed to fetch coupon usage history')
  }
} 