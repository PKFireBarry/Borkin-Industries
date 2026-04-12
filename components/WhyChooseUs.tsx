"use client"

import { type ReactNode, useEffect, forwardRef } from "react"
import { AlertCircle, Calendar, CircleX, Heart, PawPrint, Users, Shield, Zap } from "lucide-react"
import { motion, useAnimation, type Variants, useTransform, useScroll } from "framer-motion"
import { useInView } from "react-intersection-observer"

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  color: string
}

interface SchedulingFeatureProps {
  icon: ReactNode
  title: string
  description: string
}

const customEasing = [0.22, 1, 0.36, 1]

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: customEasing },
  },
}

const WhyChooseUs = () => {
  const controls = useAnimation()
  const [ref] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -24])

  useEffect(() => {
    controls.start("visible")
  }, [controls])

  return (
    <motion.section
      id="why-choose-us"
      className="relative w-full overflow-hidden bg-gradient-to-br from-emerald-50/50 via-white to-green-50/40"
      style={{ y }}
      initial="visible"
      animate={controls}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_rgba(16,185,129,0.08),_transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_76%,_rgba(34,197,94,0.07),_transparent_48%)]" />
      <PawPrint className="pointer-events-none absolute left-8 top-36 h-12 w-12 -rotate-12 text-emerald-200/55" aria-hidden="true" />
      <PawPrint className="pointer-events-none absolute right-10 top-[22rem] h-10 w-10 rotate-6 text-green-200/55" aria-hidden="true" />
      <PawPrint className="pointer-events-none absolute bottom-24 left-[15%] h-9 w-9 -rotate-6 text-emerald-200/50" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8 lg:py-24">
        <motion.div
          initial="visible"
          animate={controls}
          variants={fadeInUp}
          className="mx-auto mb-12 text-center lg:mb-14"
        >
          <h2 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-r from-slate-900 via-emerald-900 to-green-900 bg-clip-text text-transparent">
              Why Choose Our Pet Care Service?
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Experience the difference of professional, certified veterinary care
          </p>
        </motion.div>

        <div className="mx-auto max-w-6xl space-y-8 lg:space-y-10">
          <motion.div
            ref={ref}
            initial="visible"
            animate={controls}
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.14,
                  delayChildren: 0.15,
                },
              },
            }}
            className="grid grid-cols-1 gap-5 lg:grid-cols-2"
          >
            <MotionFeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Meet Your Sitter Before Scheduling"
              description="We offer an in-home consultation before your first service for a small fee. This allows you and your pet to get comfortable with your sitter, ensuring it's the perfect fit for your furry family member's needs."
              color="from-blue-500 to-indigo-600"
            />
            <MotionFeatureCard
              icon={<Heart className="h-8 w-8" />}
              title="Consistent Care from a Trusted Sitter"
              description="We provide care for both small and large animals with a focus on consistent communication and daily updates. Our goal is to give you peace of mind, knowing that your furry family members are being properly cared for with the love and attention they deserve."
              color="from-rose-500 to-pink-600"
            />
          </motion.div>

          <motion.div
            ref={ref}
            initial="visible"
            animate={controls}
            variants={{
              visible: {
                transition: { staggerChildren: 0.14, delayChildren: 0.35 },
              },
            }}
            className="relative rounded-[2rem] border border-emerald-100/60 bg-white/78 p-6 shadow-[0_28px_70px_-34px_rgba(16,185,129,0.25)] backdrop-blur-xl sm:p-8"
          >
            <div className="absolute -inset-4 rounded-[2.2rem] bg-gradient-to-br from-emerald-100/65 via-green-100/45 to-teal-100/45 opacity-60 blur-2xl" />

            <div className="relative">
              <motion.div variants={fadeInUp} className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-gradient-to-r from-emerald-100 to-green-100 px-4 py-2 text-sm font-semibold tracking-wide text-emerald-700">
                  <Zap className="h-4 w-4" />
                  <span>Flexible Service</span>
                </div>
                <h3 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
                  Consistent Availability, Flexible Scheduling
                </h3>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  We understand that life happens. That's why we offer flexible scheduling options to meet your needs.
                </p>
              </motion.div>

              <motion.div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
                <MotionSchedulingFeature
                  icon={<AlertCircle className="h-6 w-6 text-amber-600" />}
                  title="Last-minute Requests"
                  description="Kaitlyn is available for unexpected needs, if notified within the first 24 hours."
                />
                <MotionSchedulingFeature
                  icon={<Calendar className="h-6 w-6 text-violet-600" />}
                  title="Schedule Changes"
                  description="Easily extend your service if your plans change."
                />
                <MotionSchedulingFeature
                  icon={<CircleX className="h-6 w-6 text-rose-600" />}
                  title="Flexible Cancellations"
                  description="Our cancellation policies are designed with you in mind."
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}

const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(({ icon, title, description, color }, ref) => {
  return (
    <motion.div
      ref={ref}
      variants={fadeInUp}
      className="group relative rounded-[2rem] border border-emerald-100/60 bg-white/78 p-6 shadow-[0_24px_60px_-36px_rgba(16,185,129,0.2)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_32px_80px_-40px_rgba(16,185,129,0.3)] sm:p-7"
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <div className={`absolute inset-0 rounded-[2rem] bg-gradient-to-br ${color} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.09]`} />
      <div className="relative">
        <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}>
          {icon}
        </div>
        <h3 className="text-2xl font-black text-slate-900">{title}</h3>
        <p className="mt-3 text-base leading-relaxed text-slate-600">{description}</p>
      </div>
    </motion.div>
  )
})
FeatureCard.displayName = "FeatureCard"

const MotionFeatureCard = motion(FeatureCard)

const SchedulingFeature = forwardRef<HTMLDivElement, SchedulingFeatureProps>(({ icon, title, description }, ref) => {
  return (
    <motion.div
      ref={ref}
      variants={fadeInUp}
      className="group rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 280, damping: 20 }}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-green-100 shadow-sm transition-all duration-300 group-hover:from-emerald-200 group-hover:to-green-200">
        {icon}
      </div>
      <h4 className="text-xl font-black text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{description}</p>
    </motion.div>
  )
})
SchedulingFeature.displayName = "SchedulingFeature"

const MotionSchedulingFeature = motion(SchedulingFeature)

export default WhyChooseUs
