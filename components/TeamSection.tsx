'use client'

import { motion } from "framer-motion"
import Image from "next/image"
import { Award, Heart, Shield, Star, Sparkles } from "lucide-react"
import kat from '../photo/kat.jpg'

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1]
    }
  }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
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
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
}

export default function TeamSection() {
  return (
    <section className="relative w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,_rgba(120,119,198,0.08),_transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,_rgba(236,72,153,0.08),_transparent_70%)] pointer-events-none" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32">
        <motion.div 
          className="relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {/* Header Section */}
          <div className="text-center mb-16">
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-semibold tracking-wide rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200"
            >
              <Star className="w-4 h-4" />
              <span>Our Leadership</span>
            </motion.div>
            <motion.h2 
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6"
              variants={fadeInUp}
            >
              <span className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                Meet the Founder
              </span>
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed"
            >
              Passionate about animals since childhood, dedicated to exceptional pet care
            </motion.p>
          </div>

          {/* Founder Profile Card */}
          <motion.div 
            className="max-w-4xl mx-auto"
            variants={fadeInUp}
          >
            <div className="relative group">
              {/* Background decoration */}
              <div className="absolute -inset-6 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
              <div className="absolute -inset-3 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 rounded-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
              
              {/* Main card */}
              <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 p-8 md:p-12 hover:shadow-3xl transition-all duration-500">
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                  {/* Profile Image */}
                  <motion.div 
                    className="relative flex-shrink-0"
                    variants={scaleIn}
                  >
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64">
                      {/* Background decoration for image */}
                      <div className="absolute -inset-4 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full blur-xl opacity-20 animate-pulse" />
                      <div className="absolute -inset-2 bg-gradient-to-br from-indigo-300 to-purple-400 rounded-full opacity-30" />
                      
                      {/* Main image container */}
                      <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white">
                        <Image
                          src={kat}
                          alt="Kaitlyn Bruno, Founder"
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          priority
                        />
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                      </div>
                      
                      {/* Floating badges */}
                      <motion.div
                        className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl"
                        animate={{ 
                          y: [0, -8, 0],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                          duration: 4,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut"
                        }}
                      >
                        <Award className="w-6 h-6 text-white" />
                      </motion.div>
                      
                      <motion.div
                        className="absolute -bottom-2 -left-2 w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg"
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, -10, 10, 0]
                        }}
                        transition={{ 
                          duration: 3,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                          delay: 1
                        }}
                      >
                        <Shield className="w-5 h-5 text-white" />
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Content */}
                  <motion.div 
                    className="flex-1 text-center lg:text-left space-y-6"
                    variants={fadeInUp}
                  >
                    <div>
                      <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                        Kaitlyn Bruno
                      </h3>
                      <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                        <div className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full text-sm font-semibold border border-indigo-200">
                          Founder & CVT
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-lg text-slate-700 leading-relaxed max-w-2xl">
                      Kaitlyn has been passionate about animals since childhood. With over 4 years of 
                      experience in veterinary care, she founded Borkin Industries to provide top-notch 
                      pet care services for your fur babies.
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                        <div className="text-2xl font-bold text-blue-600 mb-1">4+</div>
                        <div className="text-sm font-medium text-blue-700">Years Experience</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
                        <div className="text-2xl font-bold text-green-600 mb-1">5000+</div>
                        <div className="text-sm font-medium text-green-700">Hours as CVT</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
                        <div className="text-2xl font-bold text-purple-600 mb-1">11+</div>
                        <div className="text-sm font-medium text-purple-700">Trusted Families</div>
                      </div>
                    </div>

                    {/* Quote */}
                    <motion.div 
                      className="relative bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-6 mt-6"
                      variants={fadeInUp}
                    >
                      <div className="absolute top-4 left-4 w-1 h-12 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                      <blockquote className="pl-6">
                        <p className="text-lg italic text-slate-800 leading-relaxed mb-3">
                          "Every pet deserves the same level of care and attention that I would want for my own furry family members."
                        </p>
                        <footer className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                            <Heart className="w-4 h-4 text-white" />
                          </div>
                          <cite className="text-base font-semibold text-indigo-700 not-italic">Kaitlyn's Philosophy</cite>
                        </footer>
                      </blockquote>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

