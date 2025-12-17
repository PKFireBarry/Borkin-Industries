"use client"
import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'

export function useRequireRole(requiredRole: 'client' | 'contractor') {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPreviewMode = searchParams?.get('preview') === 'admin'

  useEffect(() => {
    if (!isLoaded) return

    // If we're in preview mode, don't redirect
    if (isPreviewMode) return

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
  }, [isLoaded, user, requiredRole, router, isPreviewMode])

  // In preview mode, we authorize access regardless of actual role
  // This is safe because the preview page itself is admin-protected
  return {
    isLoaded,
    isAuthorized: isPreviewMode || user?.publicMetadata?.role === requiredRole
  }
} 