"use client"

import { type ReactNode, useEffect, forwardRef } from "react"
import { Check, Clock, Calendar, Heart, Users, Star, Shield, Zap } from "lucide-react"
import { motion, useAnimation, type Variants, useTransform, useScroll } from "framer-motion"
import { useInView } from "react-intersection-observer"

interface StatCardProps {
  number: string
  label: string
  icon: ReactNode
  color: string
}

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
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: customEasing },
  },
}

const scaleIn: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.6, ease: customEasing },
  },
}

const WhyChooseUs = () => {
  const controls = useAnimation()
  const [ref] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -30])

  useEffect(() => {
    controls.start("visible")
  }, [controls])

  return (
    <motion.section
      id="why-choose-us"
      className="relative w-full bg-gradient-to-br from-white via-slate-50 to-indigo-50 overflow-hidden"
      style={{ y }}
      initial="visible"
      animate={controls}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,_rgba(120,119,198,0.08),_transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,_rgba(236,72,153,0.08),_transparent_70%)] pointer-events-none" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32">
        <motion.div
          initial="visible"
          animate={controls}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-semibold tracking-wide rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200"
            variants={fadeInUp}
          >
            <Star className="w-4 h-4" />
            <span>Why Choose Us</span>
          </motion.div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
              Why Choose Our Pet Care Service?
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Experience the difference of professional, certified veterinary care
          </p>
        </motion.div>

        {/* Stats Cards */}
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
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16"
        >
          <MotionStatCard 
            number="11+" 
            label="Trusted Clients" 
            icon={<Users className="w-6 h-6" />}
            color="from-blue-500 to-indigo-600"
          />
          <MotionStatCard 
            number="4+" 
            label="Years in Veterinary Medicine" 
            icon={<Shield className="w-6 h-6" />}
            color="from-green-500 to-emerald-600"
          />
          <MotionStatCard 
            number="5000+" 
            label="Hours as a Certified Vet Nurse" 
            icon={<Heart className="w-6 h-6" />}
            color="from-pink-500 to-rose-600"
          />
        </motion.div>

        {/* Feature Cards */}
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
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16"
        >
          <MotionFeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Meet Your Sitter Before Scheduling"
            description="We offer an in-home consultation before your first service for a small fee. This allows you and your pet to get comfortable with your sitter, ensuring it's the perfect fit for your furry family member's needs."
            color="from-blue-500 to-indigo-600"
          />
          <MotionFeatureCard
            icon={<Heart className="w-8 h-8" />}
            title="Consistent Care from a Trusted Sitter"
            description="We provide care for both small and large animals with a focus on consistent communication and daily updates. Our goal is to give you peace of mind, knowing that your furry family members are being properly cared for with the love and attention they deserve."
            color="from-pink-500 to-rose-600"
          />
        </motion.div>

        {/* Scheduling Features */}
        <motion.div
          ref={ref}
          initial="visible"
          animate={controls}
          variants={{
            visible: {
              transition: { staggerChildren: 0.15, delayChildren: 0.8 },
            },
          }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-2xl border border-slate-200" />
          <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-xl border border-white">
            <motion.div
              variants={fadeInUp}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 text-sm font-semibold tracking-wide rounded-full bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200">
                <Zap className="w-4 h-4" />
                <span>Flexible Service</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Consistent Availability, Flexible Scheduling
              </h3>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                We understand that life happens. That's why we offer flexible scheduling options to meet your needs.
              </p>
            </motion.div>

            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <MotionSchedulingFeature
                icon={<Clock className="w-6 h-6 text-orange-600" />}
                title="Last-minute Requests"
                description="Kaitlyn is available for unexpected needs, if notified within the first 24 hours."
              />
              <MotionSchedulingFeature
                icon={<Calendar className="w-6 h-6 text-blue-600" />}
                title="Schedule Changes"
                description="Easily extend your service if your plans change."
              />
              <MotionSchedulingFeature
                icon={<Check className="w-6 h-6 text-green-600" />}
                title="Flexible Cancellations"
                description="Our cancellation policies are designed with you in mind."
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(({ number, label, icon, color }, ref) => {
  return (
    <motion.div
      ref={ref}
      variants={scaleIn}
      className="group relative bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} rounded-2xl opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      <div className="relative text-center">
        <div className={`w-16 h-16 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white`}>
          {icon}
        </div>
        <p className="text-4xl font-bold text-slate-900 mb-2">{number}</p>
        <p className="text-base font-medium text-slate-600">{label}</p>
      </div>
    </motion.div>
  )
})
StatCard.displayName = "StatCard"

const MotionStatCard = motion(StatCard)

const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(({ icon, title, description, color }, ref) => {
  return (
    <motion.div
      ref={ref}
      variants={fadeInUp}
      className="group relative bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} rounded-2xl opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      <div className="relative">
        <div className={`w-16 h-16 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center mb-6 shadow-lg text-white`}>
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{description}</p>
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
      className="group text-center"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-slate-200 group-hover:to-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transition-all duration-300">
        {icon}
      </div>
      <h4 className="text-xl font-bold text-slate-900 mb-3">{title}</h4>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </motion.div>
  )
})
SchedulingFeature.displayName = "SchedulingFeature"

const MotionSchedulingFeature = motion(SchedulingFeature)

export default WhyChooseUs

