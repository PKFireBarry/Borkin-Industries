import { db } from '../../firebase'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

interface AdminSettings {
  isAdmin: boolean
  adminSince?: string
  permissions?: string[]
}

/**
 * Fetches admin settings for a user
 */
export async function getAdminSettings(userId: string): Promise<AdminSettings | null> {
  try {
    const adminRef = doc(db, 'admins', userId)
    const snapshot = await getDoc(adminRef)
    
    if (!snapshot.exists()) {
      return null
    }
    
    return snapshot.data() as AdminSettings
  } catch (error) {
    console.error(`Error fetching admin settings for user ${userId}:`, error)
    throw new Error('Failed to fetch admin settings')
  }
}

/**
 * Checks if a user is an admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const adminSettings = await getAdminSettings(userId)
    return !!adminSettings?.isAdmin
  } catch (error) {
    console.error(`Error checking admin status for user ${userId}:`, error)
    return false
  }
}

/**
 * Sets a user as an admin
 */
export async function setUserAsAdmin(userId: string, permissions?: string[]): Promise<void> {
  try {
    const adminRef = doc(db, 'admins', userId)
    await setDoc(adminRef, {
      isAdmin: true,
      adminSince: serverTimestamp(),
      permissions: permissions || ['all'],
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error(`Error setting user ${userId} as admin:`, error)
    throw new Error('Failed to set user as admin')
  }
}

/**
 * Revokes admin status from a user
 */
export async function revokeAdminStatus(userId: string): Promise<void> {
  try {
    const adminRef = doc(db, 'admins', userId)
    await updateDoc(adminRef, {
      isAdmin: false,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error(`Error revoking admin status for user ${userId}:`, error)
    throw new Error('Failed to revoke admin status')
  }
}

/**
 * Gets all admins
 */
export async function getAllAdmins(): Promise<Array<{ userId: string } & AdminSettings>> {
  try {
    const adminsRef = collection(db, 'admins')
    const snapshot = await getDocs(adminsRef)
    
    return snapshot.docs
      .map(doc => ({ 
        userId: doc.id, 
        ...doc.data() 
      } as { userId: string } & AdminSettings))
      .filter((admin: { isAdmin: boolean }) => admin.isAdmin)
  } catch (error) {
    console.error('Error fetching all admins:', error)
    throw new Error('Failed to fetch admins')
  }
} 