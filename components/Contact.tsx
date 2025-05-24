'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone } from 'lucide-react'
import Image from 'next/image'

import cat from "../photo/cat.jpg"

export default function ContactComponent() {
  const title = "Get In Touch!";
  const description = "Feel free to reach out with any questions or inquiries. We're happy to discuss your pet care needs.";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  }

  return (
    <section id="contact" className="w-full bg-gradient-to-br from-purple-300 to-pink-100 dark:from-purple-900 dark:to-pink-900">
      <div className="container mx-auto px-4 py-12 md:py-24 lg:py-32">
        <motion.div 
          className="relative z-10"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h2 
            className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-10 md:mb-12 text-purple-600 dark:text-purple-300"
            variants={itemVariants}
          >
            Contact Us
          </motion.h2>
          <div className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 shadow-xl rounded-lg p-6 md:p-8 lg:p-10">
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
              <motion.div className="space-y-6" variants={itemVariants}>
                <div>
                  <h3 className="text-2xl font-semibold mb-3 text-gray-700 dark:text-gray-200">{title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {description}
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Our Information</h4>
                  <div className="space-y-3">
                    <a
                      href="mailto:borkinindustries@gmail.com"
                      className="flex items-center text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                      <Mail className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span>borkinindustries@gmail.com</span>
                    </a>
                    <a
                      href="tel:+18135377897"
                      className="flex items-center text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                      <Phone className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span>(813) 537-7897</span>
                    </a>
                  </div>
                </div>
                <motion.div variants={itemVariants} className="mt-6 w-full">
                  <Image
                    src={cat}
                    width={500}
                    height={300}
                    alt="A friendly cat inviting contact"
                    className="rounded-lg shadow-md w-full h-auto object-cover"
                  />
                </motion.div>
              </motion.div>
              <motion.div className="space-y-4" variants={itemVariants}>
                <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Send Us a Message</h3>
                <div className="rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 aspect-[4/5] md:aspect-auto md:min-h-[600px] lg:min-h-[650px]">
                  <iframe
                    src="http://bore.pub:9991/form/d440185e-8a47-40f8-bd99-3e56369b343a"
                    className="w-full h-full"
                    title="Contact Form"
                    sandbox="allow-scripts allow-forms allow-same-origin"
                    loading="lazy"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}