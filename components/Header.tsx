'use client'

import Link from "next/link"
import { PawPrintIcon as Paw, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

export default function Header() {
  const [isHovered, setIsHovered] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
        className="fixed top-0 left-0 right-0 z-50 w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm"
      >
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <Link 
            className="flex items-center justify-center group flex-shrink-0" 
            href="#hero"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <motion.div
              animate={{ rotate: isHovered ? 360 : 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full blur-sm opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
              <Paw className="relative h-8 w-8 text-indigo-600 group-hover:text-purple-600 transition-colors duration-300" />
            </motion.div>
            <motion.span 
              className="ml-3 text-xl font-bold bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent group-hover:from-indigo-600 group-hover:to-purple-600 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <span className="hidden sm:inline">Borkin Industries</span>
              <span className="sm:hidden">Borkin</span>
            </motion.span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <nav className="flex gap-6">
              {navItems.map((item) => (
                <motion.div
                  key={item.href}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link 
                    className="relative text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors duration-200 group py-2"
                    href={item.href}
                  >
                    {item.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 group-hover:w-full transition-all duration-300 ease-out" />
                  </Link>
                </motion.div>
              ))}
            </nav>
            
            {/* Desktop Auth Buttons */}
            <div className="flex items-center gap-3">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button 
                    variant="outline" 
                    className="text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border-transparent hover:border-indigo-200 transition-all duration-200"
                  >
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button 
                    className="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Sign Up
                  </Button>
                </SignUpButton>
              </SignedOut>
              
              <SignedIn>
                <Link href="/dashboard">
                  <Button 
                    className="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mr-3"
                  >
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
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors duration-200"
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
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Mobile Menu */}
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-16 right-0 bottom-0 w-80 max-w-[85vw] bg-white/95 backdrop-blur-xl border-l border-slate-200/60 shadow-2xl z-50 lg:hidden"
            >
              <div className="flex flex-col h-full p-6">
                {/* Navigation Links */}
                <nav className="space-y-1 mb-8">
                  {navItems.map((item, index) => (
                    <motion.div
                      key={item.href}
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link 
                        className="flex items-center py-3 px-4 text-lg font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  ))}
                </nav>
                
                {/* Mobile Auth Buttons */}
                <SignedOut>
                  <motion.div 
                    className="space-y-3 mt-auto"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <SignInButton mode="modal">
                      <Button 
                        variant="outline" 
                        className="w-full py-3 text-base font-medium border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl transition-all duration-200"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Sign In
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <Button 
                        className="w-full py-3 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Sign Up
                      </Button>
                    </SignUpButton>
                  </motion.div>
                </SignedOut>
                
                <SignedIn>
                  <motion.div 
                    className="mt-auto"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Link href="/dashboard">
                      <Button 
                        className="w-full py-3 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Go to Dashboard
                      </Button>
                    </Link>
                  </motion.div>
                </SignedIn>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}