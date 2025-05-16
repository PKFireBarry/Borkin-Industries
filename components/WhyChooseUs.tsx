"use client"

import { type ReactNode, useEffect, forwardRef } from "react"
import { Check, Clock, Calendar, Heart, Users } from "lucide-react"
import { motion, useAnimation, type Variants, useTransform, useScroll } from "framer-motion"
import { useInView } from "react-intersection-observer"

interface StatCardProps {
  number: string
  label: string
}

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
}

interface SchedulingFeatureProps {
  icon: ReactNode
  title: string
  description: string
}

const customEasing = [0.25, 0.1, 0.25, 1]

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: customEasing },
  },
}

const subtleScale: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.8, ease: customEasing },
  },
}

const WhyChooseUs = () => {
  const controls = useAnimation()
  const [ref] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -50])

  useEffect(() => {
    controls.start("visible")
  }, [controls])

  return (
    <motion.section
      id="why-choose-us"
      className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-2xl overflow-hidden"
      style={{ y }}
      initial="visible"
      animate={controls}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <motion.h2
          initial="visible"
          animate={controls}
          className="text-4xl md:text-5xl font-extrabold text-center mb-16 text-gray-800 dark:text-white"
        >
          Why Choose My Pet Care Service?
        </motion.h2>

        <motion.div
          ref={ref}
          initial="visible"
          animate={controls}
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2,
              },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16 text-center"
        >
          <MotionStatCard number="11+" label="Trusted Clients" />
          <MotionStatCard number="4+" label="Years in Veterinary Medicine" />
          <MotionStatCard number="5000+" label="Hours as a Certified Vet Nurse" />
        </motion.div>

        <motion.div
          ref={ref}
          initial="visible"
          animate={controls}
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.15,
                delayChildren: 0.5,
              },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 md:mb-16"
        >
          <MotionFeatureCard
            icon={<Users className="w-12 h-12 md:w-16 md:h-16 text-purple-600 dark:text-purple-400" />}
            title="Meet Your Sitter Before Scheduling"
            description="We offer an in-home consultation before your first service for a small fee. This allows you and your pet to get comfortable with your sitter, ensuring it's the perfect fit for your furry family member's needs."
          />
          <MotionFeatureCard
            icon={<Heart className="w-12 h-12 md:w-16 md:h-16 text-purple-600 dark:text-purple-400" />}
            title="Consistent Care from a Trusted Sitter"
            description="We provide care for both small and large animals with a focus on consistent communication and daily updates. Our goal is to give you peace of mind, knowing that your furry family members are being properly cared for with the love and attention they deserve."
          />
        </motion.div>

        <motion.div
          ref={ref}
          initial="visible"
          animate={controls}
          variants={{
            visible: {
              transition: { staggerChildren: 0.15, delayChildren: 0.8 },
            },
          }}
          className="bg-white dark:bg-gray-700 p-8 md:p-10 rounded-2xl shadow-2xl"
        >
          <motion.h3
            variants={fadeInUp}
            className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center text-gray-800 dark:text-white"
          >
            Consistent Availability, Flexible Scheduling
          </motion.h3>

          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <MotionSchedulingFeature
              icon={<Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
              title="Last-minute Requests"
              description="Kaitlyn is available for unexpected needs, if notified within the first 24 hours."
            />
            <MotionSchedulingFeature
              icon={<Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
              title="Schedule Changes"
              description="Easily extend your service if your plans change."
            />
            <MotionSchedulingFeature
              icon={<Check className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
              title="Flexible Cancellations"
              description="Our cancellation policies are designed with you in mind."
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  )
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(({ number, label }, ref) => {
  return (
    <motion.div
      ref={ref}
      variants={subtleScale}
      className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-300"
    >
      <p className="text-4xl md:text-5xl font-bold text-purple-600 dark:text-purple-400 mb-2">{number}</p>
      <p className="text-base md:text-lg text-gray-600 dark:text-gray-300">{label}</p>
    </motion.div>
  )
})
StatCard.displayName = "StatCard"

const MotionStatCard = motion(StatCard)

const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(({ icon, title, description }, ref) => {
  return (
    <motion.div
      ref={ref}
      variants={fadeInUp}
      className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-300"
    >
      <div className="flex flex-col items-center mb-4 md:mb-6">
        {icon}
        <h3 className="text-xl md:text-2xl font-semibold mt-4 text-gray-800 dark:text-white text-center">{title}</h3>
      </div>
      <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 text-center">{description}</p>
    </motion.div>
  )
})
FeatureCard.displayName = "FeatureCard"

const MotionFeatureCard = motion(FeatureCard)

const SchedulingFeature = forwardRef<HTMLDivElement, SchedulingFeatureProps>(({ icon, title, description }, ref) => {
  return (
    <motion.div ref={ref} variants={fadeInUp} className="flex items-start text-left w-full md:w-auto">
      <div className="bg-purple-100 dark:bg-purple-800 p-3 rounded-full mr-4 flex-shrink-0">{icon}</div>
      <div>
        <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    </motion.div>
  )
})
SchedulingFeature.displayName = "SchedulingFeature"

const MotionSchedulingFeature = motion(SchedulingFeature)

export default WhyChooseUs

