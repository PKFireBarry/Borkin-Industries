"use client"

import { ReactNode } from 'react'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/applications', label: 'Applications' },
    { href: '/admin/contractors', label: 'Contractors' },
    { href: '/admin/clients', label: 'Clients' },
    { href: '/admin/services', label: 'Services' },
    { href: '/admin/bookings', label: 'Bookings' },
    { href: '/admin/coupons', label: 'Coupons' },
    { href: '/admin/preview', label: 'Preview Portal' },
  ]

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navigation Bar */}
      <header className="bg-background border-b sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="font-semibold text-lg">
              Admin Portal
            </Link>
            <nav className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm ${pathname === item.href
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* User Menu & Actions */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Back to Site
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Mobile Navigation (for small screens) */}
      <div className="md:hidden bg-background border-b">
        <nav className="container mx-auto px-4 py-2 overflow-x-auto flex space-x-4 whitespace-nowrap">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm px-3 py-1.5 rounded-md ${pathname === item.href
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
} 