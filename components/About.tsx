'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import React from 'react';
import charlie from '../photo/charlie.jpg'

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.1
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

function About() {
  return (
    <section className="w-full py-20 overflow-hidden bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
      <div className="container px-6 mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.span
            variants={fadeInUp}
            className="inline-block px-4 py-1.5 mb-6 text-sm font-medium tracking-wider rounded-full bg-purple-200 text-purple-800"
          >
            Our Mission
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl text-purple-700 dark:text-purple-300 mb-8"
          >
            What We Stand For
          </motion.h2>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="relative aspect-square w-full max-w-md mx-auto"
          >
            <motion.div 
              variants={fadeInUp}
              className="w-full h-full rounded-2xl overflow-hidden"
            >
              <Image 
                src={charlie} 
                alt="Kaitlyn's Pet Services" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_1px_rgba(0,0,0,0.1)] bg-gradient-to-b from-transparent to-black/5" />
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="flex flex-col gap-8"
          >
            <motion.p 
              variants={fadeInUp} 
              className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed"
            >
              Our mission is to provide exceptional care for the community&apos;s pets by leveraging extensive knowledge and passion for your pets&apos; well-being. We are committed to offering pet sitting services and unique opportunities that go above and beyond, ensuring your pets receive the best possible care.
            </motion.p>

            <motion.blockquote 
              variants={fadeInUp} 
              className="relative pl-6 border-l-2 border-purple-200 dark:border-purple-800"
            >
              <p className="text-2xl md:text-3xl font-light italic text-purple-700 dark:text-purple-300">
                Dedicated to providing our community&apos;s beloved pets with the care, knowledge, and attention they deserve—values instilled in me by my Pop.
              </p>
              <footer className="mt-4 text-lg font-medium text-purple-700 dark:text-purple-300">
                - Kaitlyn
              </footer>
            </motion.blockquote>

            <motion.div 
              variants={fadeInUp}
              className="grid grid-cols-2 gap-6 mt-4"
            >
              <div className="p-6 rounded-2xl bg-white shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Professional Care</h3>
                <p className="text-gray-600 dark:text-gray-400">Expert pet sitting services with years of experience</p>
              </div>
              <div className="p-6 rounded-2xl bg-white shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Personal Touch</h3>
                <p className="text-gray-600 dark:text-gray-400">Individualized attention for each pet&apos;s unique needs</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default About;