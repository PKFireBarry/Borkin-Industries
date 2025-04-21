import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: ReactNode
}

const navItems = [
  { href: '/dashboard/profile', label: 'Profile' },
  { href: '/dashboard/pets', label: 'Pets' },
  { href: '/dashboard/payments', label: 'Payments' },
  { href: '/dashboard/bookings', label: 'Bookings' },
  { href: '/dashboard/contractors', label: 'Contractors' },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex bg-muted">
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
      <main className="flex-1 p-6 md:p-10">
        {children}
      </main>
    </div>
  )
} 