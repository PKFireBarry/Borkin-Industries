'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Heart, Shield } from 'lucide-react'
import kat from '../photo/kat.jpg'

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.86 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.16,
      delayChildren: 0.1,
    },
  },
}

export default function TeamSection() {
  return (
    <section id="team" className="relative w-full overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_rgba(120,119,198,0.10),_transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_76%,_rgba(236,72,153,0.09),_transparent_48%)]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8 lg:py-24">
        <motion.div
          className="relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
        >
          <div className="mb-12 text-center lg:mb-14">
            <motion.h2
              className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl"
              variants={fadeInUp}
            >
              <span className="bg-gradient-to-r from-slate-900 via-violet-900 to-purple-900 bg-clip-text text-transparent">
                Meet the Founder
              </span>
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-slate-600 sm:text-xl"
            >
              Passionate about animals since childhood, dedicated to exceptional pet care
            </motion.p>
          </div>

          <motion.div className="mx-auto max-w-6xl" variants={fadeInUp}>
            <div className="group relative">
              <div className="absolute -inset-5 rounded-[2.2rem] bg-gradient-to-br from-violet-100/70 via-purple-100/60 to-indigo-100/50 blur-2xl opacity-60 transition-opacity duration-500 group-hover:opacity-80" />

              <div className="relative rounded-[2rem] border border-violet-100/60 bg-white/78 p-6 shadow-[0_28px_70px_-34px_rgba(139,92,246,0.25)] backdrop-blur-xl sm:p-7 lg:p-8">
                <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10">
                  <motion.div variants={fadeInUp} className="order-2 space-y-5 text-left lg:order-1 lg:space-y-6">
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 sm:text-4xl">Kaitlyn</h3>

                      <div className="mt-3 inline-flex rounded-full border border-violet-200 bg-gradient-to-r from-violet-100 to-purple-100 px-4 py-2 text-sm font-semibold text-violet-700">
                        Founder & CVT
                      </div>
                    </div>

                    <p className="max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg">
                      Kaitlyn has been passionate about animals since childhood. With over 4 years of experience in veterinary care, she founded Borkin Industries to provide top-notch pet care services for your fur babies.
                    </p>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm">
                        <div className="text-2xl font-black text-blue-600">4+</div>
                        <div className="mt-1 text-sm font-semibold text-blue-700">Years Experience</div>
                      </div>
                      <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-4 shadow-sm">
                        <div className="text-2xl font-black text-green-600">5000+</div>
                        <div className="mt-1 text-sm font-semibold text-green-700">Hours as CVT</div>
                      </div>
                      <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 shadow-sm">
                        <div className="text-2xl font-black text-amber-600">11+</div>
                        <div className="mt-1 text-sm font-semibold text-amber-700">Trusted Families</div>
                      </div>
                    </div>

                    <motion.div variants={fadeInUp} className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-5 sm:p-6">
                      <blockquote>
                        <p className="text-base italic leading-relaxed text-slate-800 sm:text-lg">
                          &quot;Every pet deserves the same level of care and attention that I would want for my own furry family members.&quot;
                        </p>
                        <footer className="mt-3 flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-500">
                            <Heart className="h-4 w-4 text-white" />
                          </div>
                          <cite className="text-sm font-semibold not-italic text-violet-700 sm:text-base">Kaitlyn&apos;s Philosophy</cite>
                        </footer>
                      </blockquote>
                    </motion.div>
                  </motion.div>

                  <motion.div variants={scaleIn} className="relative order-1 lg:order-2">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.7rem] border border-violet-100/50 bg-gradient-to-br from-violet-50/30 to-purple-50/30 shadow-inner">
                      <Image
                        src={kat}
                        alt="Kaitlyn, Founder"
                        fill
                        className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.02]"
                        sizes="(max-width: 1024px) 100vw, 520px"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/12 via-transparent to-transparent" />
                    </div>

                    <motion.div
                      className="absolute -bottom-3 left-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg"
                      animate={{ scale: [1, 1.1, 1], rotate: [0, -8, 8, 0] }}
                      transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay: 0.8 }}
                    >
                      <Shield className="h-5 w-5 text-white" />
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
