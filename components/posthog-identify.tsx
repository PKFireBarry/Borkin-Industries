'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import posthog from 'posthog-js'

export function PostHogIdentify() {
  const { user, isLoaded, isSignedIn } = useUser()
  const identifiedKey = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn || !user) {
      if (identifiedKey.current) {
        posthog.reset()
        identifiedKey.current = null
      }
      return
    }

    const role = user.publicMetadata?.role as string | undefined
    const email = user.primaryEmailAddress?.emailAddress
    const key = `${user.id}:${role}:${email}`

    if (identifiedKey.current === key) return

    posthog.identify(user.id, { email, role })
    identifiedKey.current = key
  }, [isLoaded, isSignedIn, user])

  return null
}
