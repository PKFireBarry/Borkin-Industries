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
    <section className="w-full bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4 py-12 md:py-24 lg:py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.span
            variants={fadeInUp}
            className="inline-block px-4 py-1.5 mb-6 text-sm font-medium tracking-wider rounded-full bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200"
          >
            Our Mission
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-10 md:mb-12 text-purple-600 dark:text-purple-300"
          >
            What We Stand For
          </motion.h2>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="relative aspect-square w-full max-w-md mx-auto"
          >
            <motion.div 
              variants={fadeInUp}
              className="w-full h-full rounded-lg overflow-hidden shadow-md"
            >
              <Image 
                src={charlie} 
                alt="Borkin Industries - Our Mission" 
                className="w-full h-full object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 448px"
              />
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
              className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed"
            >
              Our mission is to provide exceptional care for the community&apos;s pets by leveraging extensive knowledge and passion for your pets&apos; well-being. We are committed to offering pet sitting services and unique opportunities that go above and beyond, ensuring your pets receive the best possible care.
            </motion.p>

            <motion.blockquote 
              variants={fadeInUp} 
              className="relative pl-6 border-l-2 border-purple-500 dark:border-purple-400"
            >
              <p className="text-xl italic text-gray-700 dark:text-gray-300">
                Dedicated to providing our community&apos;s beloved pets with the care, knowledge, and attention they deserve—values instilled in me by my Pop.
              </p>
              <footer className="mt-4 text-md font-medium text-purple-600 dark:text-purple-300">
                - Kaitlyn
              </footer>
            </motion.blockquote>

            <motion.div 
              variants={fadeInUp}
              className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4"
            >
              <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2 text-purple-600 dark:text-purple-300">Professional Care</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Expert pet sitting services with years of experience.</p>
              </div>
              <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2 text-purple-600 dark:text-purple-300">Personal Touch</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Individualized attention for each pet&apos;s unique needs.</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default About;