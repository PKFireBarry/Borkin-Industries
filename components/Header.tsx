'use client'

import Link from "next/link"
import { PawPrintIcon as Paw } from 'lucide-react'
import { motion } from "framer-motion"
import { useState } from "react"

export default function Header() {
  const [isHovered, setIsHovered] = useState(false)

  const navItems = [
    { href: "#hero", label: "Home" },
    { href: "#about", label: "About" },
    { href: "#contact", label: "Contact" },
  ]

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      className="w-full px-4 lg:px-6 h-16 flex items-center bg-white dark:bg-gray-800 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 shadow-lg sticky top-0 z-50"
    >
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center">
        <Link 
          className="flex items-center justify-center group" 
          href="#"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <motion.div
            animate={{ rotate: isHovered ? 360 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <Paw className="h-8 w-8 text-pink-500" />
          </motion.div>
          <motion.span 
            className="ml-2 text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent dark:from-purple-300 dark:to-pink-300"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            Borkin Industries
          </motion.span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          {navItems.map((item) => (
            <motion.div
              key={item.href}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                className="text-sm font-medium relative group"
                href={item.href}
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-pink-500 group-hover:w-full transition-all duration-300 ease-in-out" />
              </Link>
            </motion.div>
          ))}
        </nav>
      </div>
    </motion.header>
  )
}