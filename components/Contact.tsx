'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone } from 'lucide-react'
import Image from 'next/image'

import cat from "../photo/cat.jpg"

export default function ContactComponent() {
  const title = "Get In Touch!";
  const description = "Feel free to reach out with any questions or inquiries.";

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
    <section id="contact" className="py-16 bg-gradient-to-br from-purple-300 to-pink-100 dark:from-purple-900 dark:to-pink-900 min-h-[700px] flex items-center justify-center relative overflow-hidden">
      <motion.div 
        className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.h2 
          className="text-4xl font-bold text-center mb-8 text-purple-600 dark:text-purple-400"
          variants={itemVariants}
        >
          Paw-some Contact
        </motion.h2>
        <div className="backdrop-blur-sm shadow-lg bg-white/75 dark:bg-gray-700/75 text-white rounded-lg">
          <div className="grid lg:grid-cols-[1fr,2fr] gap-8 p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold text-black dark:text-white">{title}</h3>
                <p className="mt-2 text-sm text-black dark:text-white leading-relaxed">
                  {description}
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-black">Contact Information</h4>
                <div className="space-y-3 text-sm">
                  <a
                    href="mailto:borkinindustries@gmail.com"
                    className="flex text-white items-center hover:text-primary transition-colors"
                  >
                    <Mail className="h-4 w-4 mr-2 text-black" />
                    <span className="text-black dark:text-white">
                      borkinindustries@gmail.com
                    </span>
                  </a>
                  <a
                    href="tel:+18135377897"
                    className="flex items-center text-black dark:text-white hover:text-primary transition-colors"
                  >
                    <Phone className="h-4 w-4 mr-2 text-black dark" />
                    <span className="text-black dark:text-white">
                      (813) 537-7897
                    </span>
                  </a>
                  <Image
                  src={cat}
                  width={500}
                  height={300}
                  alt="Cat"
                  className=" mx-auto mb-4"
                />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-black">Send a Message</h4>
              <div className="rounded-lg overflow-hidden border bg-background/50">
                <iframe
                  src="http://bore.pub:9991/form/d440185e-8a47-40f8-bd99-3e56369b343a"
                  className="w-full min-h-[775px] md:min-h-[800px]"
                  title="Contact Form"
                  sandbox="allow-scripts allow-forms allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}