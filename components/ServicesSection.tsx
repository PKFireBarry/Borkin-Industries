'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getAllPlatformServices } from '@/lib/firebase/services'
import type { PlatformService } from '@/types/service'
import {
  Dog,
  PawPrint,
  Bird,
  Fish,
  Beef,
} from 'lucide-react'

const customEasing = [0.22, 1, 0.36, 1]

const fadeInUp = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      ease: customEasing,
    },
  },
}

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const KEYWORDS_TO_HIGHLIGHT = [
  'overnight',
  'emergency',
  'specialty',
  'luxury',
  'premium',
  'basic',
  'advanced',
  '24/7',
  'expert',
  'certified',
]

const serviceToneClasses = [
  {
    dot: 'bg-rose-500',
    border: 'border-rose-100',
    bg: 'bg-gradient-to-br from-rose-50 to-pink-50',
  },
  {
    dot: 'bg-emerald-500',
    border: 'border-emerald-100',
    bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
  },
  {
    dot: 'bg-violet-500',
    border: 'border-violet-100',
    bg: 'bg-gradient-to-br from-violet-50 to-purple-50',
  },
  {
    dot: 'bg-amber-500',
    border: 'border-amber-100',
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
  },
]

const RenderDescription: React.FC<{ description: string }> = ({ description }) => {
  if (!description) return null

  const parts = description.split(new RegExp(`(${KEYWORDS_TO_HIGHLIGHT.join('|')})`, 'gi'))

  return (
    <p className="text-sm leading-relaxed text-slate-600">
      {parts.map((part, index) =>
        KEYWORDS_TO_HIGHLIGHT.includes(part.toLowerCase()) ? (
          <strong key={index} className="font-semibold text-indigo-700">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </p>
  )
}

const LoadingState = () => (
  <section className="relative w-full overflow-hidden bg-gradient-to-br from-amber-50/50 via-white to-yellow-50/40 py-16 md:py-20 lg:py-24">
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.38)] backdrop-blur-xl">
        <div className="flex items-center justify-center gap-3 text-slate-600">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-sm font-medium sm:text-base">Loading services...</span>
        </div>
      </div>
    </div>
  </section>
)

const ErrorState = ({ message }: { message: string }) => (
  <section className="relative w-full overflow-hidden bg-gradient-to-br from-amber-50/50 via-white to-yellow-50/40 py-16 md:py-20 lg:py-24">
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-red-100 bg-white/85 p-8 text-center shadow-[0_24px_60px_-36px_rgba(15,23,42,0.38)] backdrop-blur-xl">
        <p className="font-semibold text-red-600">Could not load services</p>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </div>
    </div>
  </section>
)

const EmptyState = () => (
  <section className="relative w-full overflow-hidden bg-gradient-to-br from-amber-50/50 via-white to-yellow-50/40 py-16 md:py-20 lg:py-24">
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/80 bg-white/85 p-8 text-center shadow-[0_24px_60px_-36px_rgba(15,23,42,0.38)] backdrop-blur-xl">
        <p className="text-base font-semibold text-slate-700">No services currently available.</p>
        <p className="mt-2 text-sm text-slate-500">Please check back later.</p>
      </div>
    </div>
  </section>
)

export default function ServicesSection() {
  const [services, setServices] = useState<PlatformService[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchServices() {
      try {
        setIsLoading(true)
        const fetchedServices = await getAllPlatformServices()
        setServices(fetchedServices)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch services:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchServices()
  }, [])

  const animalCareSummary = useMemo(
    () => [
      {
        label: 'Dogs & Cats',
        detail: 'Drop-ins, dog walks, baths, nail trims, overnight stays, and boarding support.',
        icon: <Dog className="h-6 w-6 text-rose-600" />,
        card: 'border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50',
      },
      {
        label: 'Large Animals',
        detail: 'Large-animal care for horses and farm companions with routine checks and handling.',
        icon: <Beef className="h-6 w-6 text-emerald-600" />,
        card: 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50',
      },
      {
        label: 'Exotic Animals',
        detail: 'Exotic support for reptiles and birds with careful habitat-aware handling.',
        icon: <Bird className="h-6 w-6 text-violet-600" />,
        card: 'border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50',
      },
      {
        label: 'Aquatic & Small Pets',
        detail: 'Small-companion and aquatic routines with detail-focused care and monitoring.',
        icon: <Fish className="h-6 w-6 text-amber-600" />,
        card: 'border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50',
      },
    ],
    []
  )

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!services.length) return <EmptyState />

  return (
    <section id="services" className="relative w-full overflow-hidden bg-gradient-to-br from-amber-50/50 via-white to-yellow-50/40 py-16 md:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_rgba(245,158,11,0.07),_transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_76%,_rgba(234,179,8,0.06),_transparent_48%)]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mx-auto mb-12 max-w-6xl text-center lg:mb-14"
        >
          <h2 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-r from-slate-900 via-amber-900 to-yellow-900 bg-clip-text text-transparent">
              Pet Care Services
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Explore the services available through our platform and see how each option supports your pet&apos;s routine, comfort, and care needs.
          </p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={stagger} className="mx-auto mb-8 max-w-6xl rounded-[2rem] border border-amber-100/60 bg-white/80 p-6 shadow-[0_24px_60px_-36px_rgba(245,158,11,0.2)] backdrop-blur-xl sm:p-8">
          <motion.div variants={fadeInUp} className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-600">
              <PawPrint className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 sm:text-xl">Animals We Support</h3>
              <p className="text-sm text-slate-600">What each care track is typically focused on for families booking services.</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {animalCareSummary.map((item) => (
              <motion.div
                key={item.label}
                variants={fadeInUp}
                className={`rounded-2xl border p-4 shadow-sm ${item.card}`}
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/80">
                  {item.icon}
                </div>
                <p className="text-sm font-black text-slate-900">{item.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.detail}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="mx-auto max-w-6xl"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-xl font-black text-slate-900 sm:text-2xl">Available Services</h3>
            <span className="rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1 text-xs font-semibold text-amber-700 sm:text-sm">
              {services.length} services
            </span>
          </div>

          <div className="space-y-3">
            {services.map((service, index) => {
              const tone = serviceToneClasses[index % serviceToneClasses.length]
              return (
                <motion.div
                  key={service.id}
                  variants={fadeInUp}
                  transition={{ duration: 0.45, delay: index * 0.04 }}
                  className={`group rounded-2xl border ${tone.border} ${tone.bg} p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5`}
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[240px_1fr] md:items-start md:gap-4">
                    <div className="flex items-start gap-2 pt-0.5">
                      <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${tone.dot}`} />
                      <h3 className="text-base font-black leading-tight text-slate-900 sm:text-lg">{service.name}</h3>
                    </div>

                    <div className="rounded-xl border border-white/80 bg-white/70 p-3 backdrop-blur-sm">
                      {service.description ? (
                        <RenderDescription description={service.description} />
                      ) : (
                        <p className="text-sm italic text-slate-500">
                          Core service offering. Contact us for more specific details!
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
