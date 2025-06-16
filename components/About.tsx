'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import React from 'react';
import { Shield, Heart, Award, Clock } from 'lucide-react';
import charlie from '../photo/charlie.jpg'

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
};

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
};

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
};

function About() {
  return (
    <section className="relative w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(120,119,198,0.05),_transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(236,72,153,0.05),_transparent_50%)] pointer-events-none" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-semibold tracking-wide rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200"
          >
            <Heart className="w-4 h-4" />
            <span>Our Mission</span>
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6"
          >
            <span className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
              What We Stand For
            </span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed"
          >
            Dedicated to providing exceptional care that goes beyond expectations
          </motion.p>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image Section */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="relative"
          >
            <motion.div 
              variants={scaleIn}
              className="relative aspect-square w-full max-w-lg mx-auto"
            >
              {/* Background decoration */}
              <div className="absolute -inset-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl blur-xl opacity-60" />
              <div className="absolute -inset-2 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-2xl opacity-40" />
              
              {/* Main image container */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-white border-4 border-white">
                <Image 
                  src={charlie} 
                  alt="Borkin Industries - Our Mission" 
                  className="w-full h-full object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 512px"
                  priority
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
              </div>
              
              {/* Floating badge */}
              <motion.div
                className="absolute -top-4 -right-4 bg-gradient-to-br from-yellow-400 to-orange-500 text-white p-4 rounded-2xl shadow-xl"
                animate={{ 
                  y: [0, -8, 0],
                  rotate: [0, 2, -2, 0]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut"
                }}
              >
                <Award className="w-6 h-6" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Content Section */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="space-y-8"
          >
            <motion.div variants={fadeInUp} className="space-y-6">
              <p className="text-lg text-slate-700 leading-relaxed">
                Our mission is to provide exceptional care for the community's pets by leveraging extensive knowledge and passion for your pets' well-being. We are committed to offering pet sitting services and unique opportunities that go above and beyond, ensuring your pets receive the best possible care.
              </p>

              <motion.div 
                variants={fadeInUp} 
                className="relative bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 shadow-lg"
              >
                <div className="absolute top-4 left-4 w-1 h-12 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                <blockquote className="pl-6">
                  <p className="text-xl italic text-slate-800 leading-relaxed mb-4">
                    "Dedicated to providing our community's beloved pets with the care, knowledge, and attention they deserve—values instilled in me by my Pop."
                  </p>
                  <footer className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">K</span>
                    </div>
                    <div>
                      <cite className="text-lg font-semibold text-indigo-700 not-italic">Kaitlyn</cite>
                      <p className="text-sm text-slate-600">Founder & CVT</p>
                    </div>
                  </footer>
                </blockquote>
              </motion.div>
            </motion.div>

            {/* Feature Cards */}
            <motion.div 
              variants={fadeInUp}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <motion.div 
                className="group relative bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Professional Care</h3>
                  <p className="text-slate-600 leading-relaxed">Expert pet sitting services with years of veterinary experience and certified training.</p>
                </div>
              </motion.div>

              <motion.div 
                className="group relative bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Personal Touch</h3>
                  <p className="text-slate-600 leading-relaxed">Individualized attention for each pet's unique needs with consistent, loving care.</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap gap-6 pt-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-slate-700">4+ Years Experience</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-slate-700">Certified Veterinary Technician</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-slate-700">11+ Trusted Families</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default About;