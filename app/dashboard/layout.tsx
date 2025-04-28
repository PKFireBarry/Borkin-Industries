"use client"
import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

interface DashboardLayoutProps {
  children: ReactNode
}

const navItemsByRole = {
  client: [
    { href: '/dashboard/profile', label: 'Profile' },
    { href: '/dashboard/pets', label: 'Pets' },
    { href: '/dashboard/payments', label: 'Payments' },
    { href: '/dashboard/bookings', label: 'Bookings' },
    { href: '/dashboard/contractors', label: 'Contractors' },
  ],
  contractor: [
    { href: '/dashboard/contractor/profile', label: 'Profile' },
    { href: '/dashboard/contractor/availability', label: 'Availability' },
    { href: '/dashboard/contractor/gigs', label: 'Gigs' },
    { href: '/dashboard/contractor/payments', label: 'Payments' },
    { href: '/dashboard/contractor/reviews', label: 'Reviews' },
  ],
} as const

type UserRole = keyof typeof navItemsByRole

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const isContractorApply = pathname === '/dashboard/contractor/apply'
  const { user, isLoaded } = useUser()
  const role = user?.publicMetadata?.role as UserRole | undefined

  if (isContractorApply) {
    // Render only the page content, no sidebar/nav
    return <>{children}</>
  }

  // Only show nav if user is loaded and has a valid role
  const navItems = role && navItemsByRole[role] ? navItemsByRole[role] : []

  return (
    <div className="min-h-screen flex bg-muted">
      {navItems.length > 0 && (
        <nav
          aria-label="Dashboard navigation"
          className="w-56 flex-shrink-0 border-r border-border bg-background py-8 px-4 hidden md:block"
        >
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <main className="flex-1 p-6 md:p-10">
        {children}
      </main>
    </div>
  )
} 