'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Shield, Heart, Award } from 'lucide-react'
import charlie from '../photo/charlie.jpg'

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.16,
      delayChildren: 0.08,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

function About() {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-rose-50/60 via-white to-pink-50/50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_rgba(244,63,94,0.08),_transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_76%,_rgba(236,72,153,0.07),_transparent_48%)]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8 lg:py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl"
          >
            <span className="bg-gradient-to-r from-slate-900 via-rose-900 to-pink-900 bg-clip-text text-transparent">
              What We Stand For
            </span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-slate-600 sm:text-xl"
          >
            Dedicated to providing exceptional care that goes beyond expectations
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="mt-12 grid grid-cols-1 gap-8 lg:mt-14 lg:grid-cols-[1.06fr_0.94fr] lg:gap-12"
        >
          <motion.div
            variants={fadeInUp}
            className="relative overflow-hidden rounded-[2rem] border border-rose-100/60 bg-white/70 p-4 shadow-[0_28px_70px_-34px_rgba(244,63,94,0.25)] backdrop-blur-xl sm:p-5"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.7rem] border border-white bg-white shadow-inner">
              <Image
                src={charlie}
                alt="Borkin Industries - What We Stand For"
                className="h-full w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 560px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/18 via-transparent to-transparent" />
            </div>

            <motion.div
              className="absolute right-5 top-5 rounded-2xl border border-white/90 bg-white/90 p-3 shadow-lg backdrop-blur"
              animate={{ y: [0, -5, 0], rotate: [0, 1.5, -1.5, 0] }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            >
              <Award className="h-6 w-6 text-amber-500" />
            </motion.div>
          </motion.div>

          <motion.div variants={fadeInUp} className="space-y-6">
            <div className="relative rounded-[2rem] border border-rose-100/60 bg-white/75 p-6 shadow-[0_24px_60px_-36px_rgba(244,63,94,0.2)] backdrop-blur-xl sm:p-8">
              <motion.div
                className="pointer-events-none absolute -right-5 top-10 h-20 w-20 rounded-full bg-gradient-to-br from-rose-200/60 to-pink-200/40 blur-2xl"
                animate={{ y: [0, -10, 0], x: [0, 6, 0], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 4.5, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700"
              >
                Our Commitment
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.65, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4 text-base leading-relaxed text-slate-700 sm:text-lg"
              >
                Our mission is to provide exceptional care for the community&apos;s pets by leveraging extensive knowledge and passion for your pets&apos; well-being. We are committed to offering pet sitting services and unique opportunities that go above and beyond, ensuring your pets receive the best possible care.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.65, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-5 shadow-sm sm:p-6"
              >
                <blockquote>
                  <p className="text-lg italic leading-relaxed text-slate-800 sm:text-xl">
                    &quot;Dedicated to providing our community&apos;s beloved pets with the care, knowledge, and attention they deserve-values instilled in me by my Pop.&quot;
                  </p>
                  <footer className="mt-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                      <span className="text-sm font-bold text-white">K</span>
                    </div>
                    <div>
                      <cite className="text-base font-semibold not-italic text-violet-700">Kaitlyn</cite>
                      <p className="text-sm text-slate-600">Founder & CVT</p>
                    </div>
                  </footer>
                </blockquote>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 border-t border-slate-200/80 pt-6"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 250, damping: 20 }}
                    className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5 shadow-md"
                  >
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Professional Care</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                      Expert pet sitting services with years of veterinary experience and certified training.
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 250, damping: 20 }}
                    className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-5 shadow-md"
                  >
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-md">
                      <Heart className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Personal Touch</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                      Individualized attention for each pet&apos;s unique needs with consistent, loving care.
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default About
