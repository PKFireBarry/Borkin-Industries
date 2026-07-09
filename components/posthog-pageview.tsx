'use client'

import { Suspense, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'

function PostHogPageViewContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const previousUrl = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return

    const search = searchParams?.toString()
    const url = search ? `${pathname}?${search}` : pathname

    if (url === previousUrl.current) return
    previousUrl.current = url

    posthog.capture('$pageview', {
      $current_url: `${window.location.origin}${url}`,
    })
  }, [pathname, searchParams])

  return null
}

export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewContent />
    </Suspense>
  )
}
