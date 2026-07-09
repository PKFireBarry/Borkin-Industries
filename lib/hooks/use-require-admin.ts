import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { getAdminSettings } from '@/lib/firebase/admin'

interface UseRequireAdminResult {
  isAdmin: boolean
  isLoading: boolean
  error: string | null
}

export function useRequireAdmin(): UseRequireAdminResult {
  const { user, isLoaded } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAdminStatus() {
      if (!isLoaded || !user) {
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      try {
        const adminSettings = await getAdminSettings(user.id)
        setIsAdmin(adminSettings?.isAdmin || false)
        setError(null)
      } catch (err) {
        console.error('Error checking admin status:', err)
        setError('Failed to verify admin privileges')
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminStatus()
  }, [user, isLoaded])

  return { isAdmin, isLoading, error }
} 