'use client'

import { motion } from "framer-motion"
import Image from "next/image"
import kat from '../photo/kat.jpg'


export default function TeamSection() {
  return (
    <section className="relative rounded-md w-full py-16 overflow-hidden bg-gradient-to-b from-white dark:from-gray-800 dark:to-gray-900 to-gray-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-100/50 via-transparent to-transparent dark:from-purple-900/50 dark:via-transparent dark:to-transparent" />
      
      <motion.div 
        className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-16">
          <motion.span 
            className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Our Leadership
          </motion.span>
          <motion.h2 
            className="text-4xl font-bold tracking-tight sm:text-5xl mb-4 bg-gradient-to-r from-purple-600 dark:from-purple-300 to-pink-500 dark:to-pink-300 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Meet the Founder
          </motion.h2>
        </div>
        <motion.div 
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-100 to-pink-100 opacity-75 group-hover:opacity-100 transition duration-300 blur"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
              <div className="flex flex-col items-center">
                <div className="relative w-48 h-48 mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full animate-pulse"></div>
                  <Image
                    src={kat}
                    alt="Kaitlyn Bruno"
                    width={775}
                    height={775}
                    className="relative w-full h-full rounded-full object-cover shadow-lg transform transition duration-300 group-hover:scale-105"
                  />
                </div>
                <motion.div 
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-300 mb-2">
                    Kaitlyn Bruno
                  </h3>
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-4">
                    Founder and Certified Veterinary Technician
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
                    Kaitlyn has been passionate about animals since childhood. With over 4 years of 
                    experience in veterinary care, she founded Borkin Industries to provide top-notch 
                    pet care services for your fur babies.
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

