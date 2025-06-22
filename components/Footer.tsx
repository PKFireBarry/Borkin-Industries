'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Heart, Mail, Phone, MapPin, Clock, Shield, Award, Star } from 'lucide-react'
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
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative w-full bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,_rgba(255,255,255,0.05),_transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,_rgba(139,92,246,0.1),_transparent_70%)] pointer-events-none" />
      
      <div className="relative">
        {/* Main Footer Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12"
          >
            {/* Company Info */}
            <motion.div variants={fadeInUp} className="lg:col-span-2 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Boorkin Industries</h3>
                </div>
                <p className="text-slate-300 text-lg leading-relaxed max-w-md">
                  Professional pet care services with love, dedication, and expertise. 
                  Your furry family members deserve the best care possible.
                </p>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-slate-200">Licensed & Insured</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-slate-200">CVT Certified</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-slate-200">5-Star Rated</span>
                </div>
              </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div variants={fadeInUp} className="space-y-6">
              <h4 className="text-lg font-bold text-white">Quick Links</h4>
              <nav className="space-y-3">
                {[
                  { href: '#about', label: 'About Us' },
                  { href: '#services', label: 'Services' },
                  { href: '#team', label: 'Meet the Team' },
                  { href: '#contact', label: 'Contact' }
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-slate-300 hover:text-white transition-colors duration-200 hover:translate-x-1 transform"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </motion.div>

            {/* Contact Info */}
            <motion.div variants={fadeInUp} className="space-y-6">
              <h4 className="text-lg font-bold text-white">Get in Touch</h4>
              <div className="space-y-4">
                <a
                  href="mailto:borkinindustries@gmail.com"
                  className="group flex items-center gap-3 text-slate-300 hover:text-white transition-all duration-200"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-200">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Email</div>
                    <div className="text-xs text-slate-400 group-hover:text-slate-300">borkinindustries@gmail.com</div>
                  </div>
                </a>
                
                <a
                  href="tel:+13523403659"
                  className="group flex items-center gap-3 text-slate-300 hover:text-white transition-all duration-200"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-200">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Phone</div>
                    <div className="text-xs text-slate-400 group-hover:text-slate-300">352-340-3659</div>
                  </div>
                </a>

                <div className="flex items-center gap-3 text-slate-300">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Service Area</div>
                    <div className="text-xs text-slate-400">Tampa Bay, FL</div>
                  </div>
                </div>
              </div>

              {/* Response Time */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-medium text-white">Quick Response</span>
                </div>
                <p className="text-xs text-slate-400">We typically respond within 24 hours</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <motion.div variants={fadeInUp} className="flex items-center gap-2 text-slate-400">
                <span className="text-sm">© {currentYear} Boorkin Industries. Made with</span>
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut"
                  }}
                >
                  <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                </motion.div>
                <span className="text-sm">for pets everywhere.</span>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="flex items-center gap-4 text-xs text-slate-500">
                <Link href="/privacy" className="hover:text-slate-300 transition-colors">
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link href="/terms" className="hover:text-slate-300 transition-colors">
                  Terms of Service
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  )
}

