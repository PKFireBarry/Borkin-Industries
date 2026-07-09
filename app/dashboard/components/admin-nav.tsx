'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { isUserAdmin } from '@/lib/firebase/admin'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function AdminNav() {
  const { user } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      try {
        const adminStatus = await isUserAdmin(user.id)
        setIsAdmin(adminStatus)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminStatus()
  }, [user])

  if (isLoading || !isAdmin) {
    return null
  }

  const adminLinks = [
    { href: '/admin/services', label: 'Platform Services' },
  ]

  return (
    <div className="px-3 py-2">
      <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
        Admin
      </h2>
      <div className="space-y-1">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent",
              pathname === link.href
                ? "bg-accent text-accent-foreground"
                : "transparent"
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
} 