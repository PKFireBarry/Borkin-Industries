"use client"
import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export function useRequireRole(requiredRole: 'client' | 'contractor') {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return
    const role = user?.publicMetadata?.role
    if (!role) return // Optionally redirect to sign-in or not-authorized
    if (role !== requiredRole) {
      if (role === 'contractor') {
        router.replace('/dashboard/contractor')
      } else if (role === 'client') {
        router.replace('/dashboard')
      } else {
        router.replace('/not-authorized')
      }
    }
  }, [isLoaded, user, requiredRole, router])

  return { isLoaded, isAuthorized: user?.publicMetadata?.role === requiredRole }
} 