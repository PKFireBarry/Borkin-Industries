'use client'

import Link from "next/link"
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

export default function Header() {
  const [isHovered, setIsHovered] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isMobileMenuOpen) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const navItems = [
    { href: "#hero", label: "Home" },
    { href: "#about", label: "About" },
    { href: "#contact", label: "Contact" },
  ]

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed left-3 right-3 top-2 z-50 flex h-14 items-center rounded-2xl border border-white/80 bg-white/78 px-3 shadow-[0_14px_40px_-20px_rgba(79,70,229,0.45)] backdrop-blur-xl sm:left-6 sm:right-6 sm:top-3 sm:h-16 lg:left-8 lg:right-8"
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-6">
          {/* Logo */}
          <Link 
            className="group flex shrink-0 items-center justify-center lg:justify-self-start" 
            href="#hero"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <motion.div
              animate={{ rotate: isHovered ? 360 : 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-10 w-10 transition-all duration-300 group-hover:drop-shadow-[0_12px_20px_rgba(59,130,246,0.28)]"
            >
              <Image
                src="/logo.png"
                alt="Borkin Industries logo"
                fill
                sizes="40px"
                className="object-contain"
                priority
              />
            </motion.div>
            <motion.span 
              className="ml-2 bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-lg font-bold text-transparent transition-all duration-300 group-hover:from-indigo-600 group-hover:to-purple-600 sm:ml-3 sm:text-xl"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <span className="hidden sm:inline">Borkin Industries</span>
              <span className="sm:hidden">Borkin</span>
            </motion.span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex lg:items-center lg:justify-center lg:gap-3">
            {navItems.map((item) => (
              <motion.div
                key={item.href}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button asChild variant="petSoft" className="h-12 rounded-xl px-6 text-base font-semibold text-slate-700">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              </motion.div>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex lg:items-center lg:justify-self-end lg:gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <Button 
                  variant="petSoft" 
                  className="h-12 rounded-xl px-6 text-base font-semibold text-slate-700"
                >
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="petPrimary" className="h-12 rounded-xl px-6 text-base font-semibold">
                  Sign Up
                </Button>
              </SignUpButton>
            </SignedOut>
            
            <SignedIn>
              <Link href="/dashboard">
                <Button variant="petPrimary" className="h-12 rounded-xl px-6 text-base font-semibold">
                  Dashboard
                </Button>
              </Link>
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 rounded-xl border-2 border-slate-200 hover:border-indigo-300 transition-colors duration-200"
                  }
                }}
              />
            </SignedIn>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-3">
            <SignedIn>
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 rounded-lg border-2 border-slate-200"
                  }
                }}
              />
            </SignedIn>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50 p-2.5 shadow-md transition-all duration-200 hover:border-indigo-200 hover:shadow-lg"
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-5 h-5 text-slate-700" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-5 h-5 text-slate-700" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="fixed inset-x-3 top-[4.5rem] z-50 max-h-[calc(100vh-5.25rem)] overflow-y-auto rounded-3xl border border-white/80 bg-gradient-to-b from-white/95 via-blue-50/85 to-rose-50/70 shadow-2xl backdrop-blur-xl sm:top-[5rem] sm:max-h-[calc(100vh-5.75rem)] lg:hidden"
            >
              <div className="p-4">
                <nav className="space-y-2" aria-label="Mobile navigation links">
                  {navItems.map((item, index) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                    >
                      <Link
                        className="flex items-center justify-between rounded-2xl border border-white/85 bg-white/85 px-4 py-4 text-base font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 hover:shadow-md"
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span>{item.label}</span>
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                <div className="mt-4 border-t border-indigo-100/80 pt-4">
                  <SignedOut>
                    <motion.div
                      className="space-y-2"
                      initial={{ y: 18, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <SignInButton mode="modal">
                        <Button
                          variant="petSoft"
                          className="h-12 w-full rounded-xl text-base font-medium"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Sign In
                        </Button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <Button
                          variant="petPrimary"
                          className="h-12 w-full rounded-xl text-base font-semibold"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Sign Up
                        </Button>
                      </SignUpButton>
                    </motion.div>
                  </SignedOut>

                  <SignedIn>
                    <motion.div
                      initial={{ y: 18, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Link href="/dashboard">
                        <Button
                          variant="petPrimary"
                          className="h-12 w-full rounded-xl text-base font-semibold"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Go to Dashboard
                        </Button>
                      </Link>
                    </motion.div>
                  </SignedIn>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
