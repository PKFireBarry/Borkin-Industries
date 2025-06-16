"use client"
import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { AdminNav } from './components/admin-nav'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, ChevronLeft, ChevronRight, LayoutDashboard, User, CalendarCheck, Briefcase, CreditCard, Star, Calendar, Users, PawPrint, MessageSquare } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { UserButton } from '@clerk/nextjs'

interface DashboardLayoutProps {
  children: ReactNode
}

const navItemsByRole = {
  contractor: [
    { href: '/dashboard/contractor', label: 'Dashboard' },
    { href: '/dashboard/contractor/profile', label: 'Profile' },
    { href: '/dashboard/contractor/payments', label: 'Payments' },
    { href: '/dashboard/contractor/gigs', label: 'Gigs' },
    { href: '/dashboard/contractor/availability', label: 'Availability' },
    { href: '/dashboard/contractor/reviews', label: 'Reviews' },
    { href: '/dashboard/messages', label: 'Messages' },
  ],
  client: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/profile', label: 'Profile' },
    { href: '/dashboard/payments', label: 'Payments' },
    { href: '/dashboard/bookings', label: 'Bookings' },
    { href: '/dashboard/contractors', label: 'Find Contractors' },
    { href: '/dashboard/pets', label: 'My Pets' },
    { href: '/dashboard/messages', label: 'Messages' },
  ],
}

type UserRole = keyof typeof navItemsByRole

// Icon mapping for nav items
const navIcons = {
  Dashboard: LayoutDashboard,
  Profile: User,
  Availability: CalendarCheck,
  Gigs: Briefcase,
  Payments: CreditCard,
  Reviews: Star,
  Bookings: Calendar,
  'Find Contractors': Users,
  'My Pets': PawPrint,
  Messages: MessageSquare,
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const isContractorApply = pathname === '/dashboard/contractor/apply'
  const { user, isLoaded } = useUser()
  const role = user?.publicMetadata?.role as UserRole | undefined

  // Sidebar collapse (desktop) and drawer open (mobile)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  if (isContractorApply) {
    return <>{children}</>
  }

  // Only show nav if user is loaded and has a valid role
  const navItems = role && navItemsByRole[role] ? navItemsByRole[role] : []

  return (
    <div className="min-h-screen flex bg-muted">
      {/* Mobile/Tablet Hamburger */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <Button variant="outline" aria-label="Open navigation" onClick={() => setIsDrawerOpen(true)}>
          <Menu className="h-6 w-6" />
        </Button>
      </div>
      
      {/* User Profile Button (Mobile/Tablet) */}
      <div className="lg:hidden fixed top-4 right-4 z-40">
        <UserButton afterSignOutUrl="/" />
      </div>

      {/* Sidebar (Desktop Only) */}
      {navItems.length > 0 && (
        <aside
          aria-label="Dashboard navigation"
          className={cn(
            "hidden lg:flex flex-col border-r border-border bg-background py-8 px-2 transition-all duration-200 relative",
            isSidebarCollapsed ? 'w-20' : 'w-56'
          )}
        >
          <div className="flex items-center justify-between mb-6 px-3">
            {!isSidebarCollapsed && <span className="font-semibold text-sm"></span>}
            <Button
              variant="outline"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="h-8 w-8 p-0"
              onClick={() => setIsSidebarCollapsed((v) => !v)}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* User Profile (Desktop) */}
          <div className={cn("mb-6 px-3 flex items-center", isSidebarCollapsed ? "justify-center" : "justify-between")}>
            <UserButton afterSignOutUrl="/" />
            {!isSidebarCollapsed && user?.fullName && (
              <span className="text-sm font-medium ml-2 truncate">{user.fullName}</span>
            )}
          </div>
          
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = navIcons[item.label as keyof typeof navIcons]
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center py-2 px-3 rounded-lg transition-colors gap-2",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted-foreground/10",
                      isSidebarCollapsed && 'justify-center px-2'
                    )}
                    tabIndex={0}
                  >
                    {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
                    <span className={cn(isSidebarCollapsed ? 'sr-only' : 'block')}>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className={cn('mt-8', isSidebarCollapsed && 'px-0')}>{/* AdminNav always visible */}<AdminNav /></div>
        </aside>
      )}

      {/* Drawer (Mobile/Tablet) */}
      <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogContent 
          className="p-0 w-64 md:w-80 h-screen max-w-full left-0 top-0 translate-x-0 translate-y-0 fixed rounded-none flex flex-col bg-background z-50 shadow-lg border-r overflow-y-auto"
          style={{ transform: 'none' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-lg">Menu</span>
            <Button variant="outline" aria-label="Close navigation" onClick={() => setIsDrawerOpen(false)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
          
          {/* User Profile (Mobile Drawer) */}
          <div className="px-4 py-3 border-b flex items-center">
            <UserButton afterSignOutUrl="/" />
            {user?.fullName && (
              <span className="text-sm font-medium ml-2">{user.fullName}</span>
            )}
          </div>
          
          <ul className="flex-1 space-y-2 px-4 py-6">
            {navItems.map((item) => {
              const Icon = navIcons[item.label as keyof typeof navIcons]
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center py-2 px-3 rounded-lg transition-colors gap-2",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted-foreground/10"
                    )}
                    onClick={() => setIsDrawerOpen(false)}
                    tabIndex={0}
                  >
                    {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="border-t px-4 py-4"><AdminNav /></div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden pt-16 md:pt-6 lg:pt-8">
        {children}
      </main>
    </div>
  )
} 