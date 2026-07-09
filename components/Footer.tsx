'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import Link from 'next/link'

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1]
    }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

export default function Footer() {
  const copyrightYear = 2026

  const quickLinks = [
    { href: '#about', label: 'About Us' },
    { href: '#services', label: 'Services' },
    { href: '#team', label: 'Meet the Team' },
    { href: '#contact', label: 'Contact' },
    { href: '/terms', label: 'Terms' },
  ]

  const legalMeta = [
    "BORKIN' INDUSTRIES LLC",
    'Doc No. L25000328390',
  ]

  return (
    <footer className="relative w-full overflow-hidden border-t border-indigo-100/40 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,_rgba(255,255,255,0.08),_transparent_58%)]" />

      <div className="relative">
        <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-8 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="flex flex-col gap-4 sm:gap-5"
          >
            <motion.div variants={fadeInUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/25 bg-white/10 shadow-lg">
                  <Image
                    src="/logo.png"
                    alt="Borkin Industries logo"
                    fill
                    className="object-contain p-1"
                    sizes="48px"
                    priority
                  />
                </div>
                <div>
                  <div className="text-xl font-bold text-white sm:text-2xl">Borkin Industries</div>
                  <p className="text-xs uppercase tracking-[0.16em] text-indigo-200">Pet Care Services</p>
                </div>
              </Link>

              <nav className="grid grid-cols-3 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:justify-end sm:gap-x-5" aria-label="Quick links">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-xs font-medium text-slate-300 transition-colors duration-200 hover:text-white sm:text-sm"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        </div>

        <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="space-y-2"
            >
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11px] text-slate-500 sm:justify-end sm:text-right">
                {legalMeta.map((item, index) => (
                  <React.Fragment key={item}>
                    {index > 0 && <span className="text-slate-600">•</span>}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
              <p className="border-t border-white/10 pt-2 text-center text-xs text-slate-400">
                © {copyrightYear} Borkin Industries. All rights reserved.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  )
}
