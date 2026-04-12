"use client"

import type { ReactNode, TouchEvent } from 'react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { SignOutButton, UserButton, useUser } from '@clerk/nextjs'
import { getChatsForUser } from '@/app/actions/messaging-actions'
import { AdminNav } from './components/admin-nav'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  CalendarCheck,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PawPrint,
  Star,
  User,
  Users,
  X,
} from 'lucide-react'

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
  const { user } = useUser()
  const role = user?.publicMetadata?.role as UserRole | undefined

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchDeltaX = useRef(0)

  useEffect(() => {
    if (!isDrawerOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isDrawerOpen])

  useEffect(() => {
    let isMounted = true

    const loadUnreadMessages = async () => {
      if (!user?.id) {
        if (isMounted) setUnreadMessagesCount(0)
        return
      }

      try {
        const chatsResult = await getChatsForUser()
        if (!chatsResult.success || !chatsResult.data) {
          if (isMounted) setUnreadMessagesCount(0)
          return
        }

        const totalUnreadMessages = chatsResult.data.reduce((total, chat) => {
          return total + (user.id === chat.client.userId ? chat.clientUnreadMessages : chat.contractorUnreadMessages)
        }, 0)

        if (isMounted) {
          setUnreadMessagesCount(totalUnreadMessages)
        }
      } catch (error) {
        console.error('Failed to load unread messages count:', error)
        if (isMounted) setUnreadMessagesCount(0)
      }
    }

    loadUnreadMessages()

    return () => {
      isMounted = false
    }
  }, [user?.id, pathname])

  if (isContractorApply) {
    return <>{children}</>
  }

  const navItems = role && navItemsByRole[role] ? navItemsByRole[role] : []

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
    touchDeltaX.current = 0
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current == null) return
    touchDeltaX.current = event.touches[0].clientX - touchStartX.current
  }

  const handleTouchEnd = () => {
    if (touchStartX.current == null) return

    if (touchDeltaX.current <= -70) {
      setIsDrawerOpen(false)
    }

    touchStartX.current = null
    touchDeltaX.current = 0
  }

  return (
    <div className="min-h-screen bg-muted/40 lg:flex lg:flex-row">
      <div className="lg:hidden fixed inset-x-0 top-0 z-40 flex items-center px-4 pt-4">
        <Button
          variant="outline"
          size="icon"
          aria-label="Open navigation"
          onClick={() => setIsDrawerOpen(true)}
          className="h-11 w-11 rounded-2xl border-slate-200 bg-white/95 shadow-sm backdrop-blur"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {navItems.length > 0 ? (
        <aside
          aria-label="Dashboard navigation"
          className={cn(
            'hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200/70 lg:bg-white/90 lg:px-3 lg:py-6 lg:shadow-sm',
            isSidebarCollapsed ? 'lg:w-24' : 'lg:w-64'
          )}
        >
          <div className="mb-6 flex items-center justify-between px-2">
            <div className={cn('min-w-0', isSidebarCollapsed && 'sr-only')}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Borkin</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Dashboard</p>
            </div>
            <Button
              variant="outline"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="h-9 w-9 rounded-xl border-slate-200 bg-white p-0"
              onClick={() => setIsSidebarCollapsed((value) => !value)}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <div className={cn('mb-6 rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 p-3', isSidebarCollapsed && 'px-2')}>
            <div className={cn('flex items-center', isSidebarCollapsed ? 'justify-center' : 'gap-3')}>
              <UserButton afterSignOutUrl="/" />
              {!isSidebarCollapsed && user?.fullName ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{user.fullName}</p>
                  <p className="text-xs text-slate-500">{role === 'contractor' ? 'Contractor' : 'Client'} account</p>
                </div>
              ) : null}
            </div>
          </div>

          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = navIcons[item.label as keyof typeof navIcons]
              const isActive = pathname === item.href

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center rounded-[1rem] px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                      isSidebarCollapsed ? 'justify-center px-2' : 'gap-3'
                    )}
                  >
                    <span className="relative shrink-0">
                      {Icon ? <Icon className="h-4.5 w-4.5" aria-hidden="true" /> : null}
                      {item.label === 'Messages' && unreadMessagesCount > 0 ? (
                        <span className="absolute -right-2 -top-2 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                        </span>
                      ) : null}
                    </span>
                    <span className={cn(isSidebarCollapsed ? 'sr-only' : 'block')}>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="mt-auto space-y-4 pt-6">
            <div className={cn(isSidebarCollapsed && 'px-1')}>
              <AdminNav />
            </div>
            <SignOutButton>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center rounded-[1rem] border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900',
                  isSidebarCollapsed ? 'justify-center px-2' : 'gap-3'
                )}
              >
                <LogOut className="h-4.5 w-4.5 shrink-0" />
                <span className={cn(isSidebarCollapsed ? 'sr-only' : 'block')}>Log out</span>
              </button>
            </SignOutButton>
          </div>
        </aside>
      ) : null}

      {isDrawerOpen ? (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div
            className="relative h-[100svh] w-[88vw] max-w-sm rounded-r-[1.75rem] border-r border-slate-200/70 bg-white/98 shadow-2xl"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-slate-200/70 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Borkin</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">Menu</h2>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Close navigation"
                    onClick={() => setIsDrawerOpen(false)}
                    className="h-10 w-10 rounded-2xl border-slate-200 bg-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border-b border-slate-200/70 px-4 py-4">
                <div className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 p-3">
                  <UserButton afterSignOutUrl="/" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{user?.fullName || 'Your account'}</p>
                    <p className="text-xs text-slate-500">{role === 'contractor' ? 'Contractor dashboard' : 'Client dashboard'}</p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                <ul className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = navIcons[item.label as keyof typeof navIcons]
                    const isActive = pathname === item.href

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          )}
                          onClick={() => setIsDrawerOpen(false)}
                        >
                          <span className="relative shrink-0">
                            {Icon ? <Icon className="h-4.5 w-4.5" aria-hidden="true" /> : null}
                            {item.label === 'Messages' && unreadMessagesCount > 0 ? (
                              <span className="absolute -right-2 -top-2 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                              </span>
                            ) : null}
                          </span>
                          {item.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>

                <div className="mt-6 rounded-[1.25rem] border border-slate-200/70 bg-slate-50/70 p-3">
                  <AdminNav />
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200/70 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
                <SignOutButton>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                    Log out
                  </button>
                </SignOutButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <main className="min-w-0 flex-1 overflow-x-hidden pt-20 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
