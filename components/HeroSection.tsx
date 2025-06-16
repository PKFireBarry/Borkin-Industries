"use client"
import { motion } from "framer-motion"
import { PawPrint, Heart, Sun, Cat, Dog, Fish, Bird, Rabbit, ArrowRight, Sparkles } from "lucide-react"
import Image from "next/image"
import logo from "../photo/logo.png"
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Star, Shield, Home, Clock, Award } from "lucide-react"

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1]
    }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1]
    }
  }
}

// Floating bubble component - Optimized for performance
const FloatingBubble = ({ icon: Icon, delay = 0, size = "medium", color = "blue" }: {
  icon: any
  delay?: number
  size?: "small" | "medium" | "large"
  color?: "blue" | "purple" | "pink" | "green" | "yellow"
}) => {
  const sizeClasses = {
    small: "w-12 h-12",
    medium: "w-16 h-16", 
    large: "w-20 h-20"
  }
  
  const iconSizes = {
    small: "w-5 h-5",
    medium: "w-7 h-7",
    large: "w-9 h-9"
  }

  const colorClasses = {
    blue: "from-blue-400 to-blue-600",
    purple: "from-purple-400 to-purple-600",
    pink: "from-pink-400 to-pink-600",
    green: "from-green-400 to-green-600",
    yellow: "from-yellow-400 to-yellow-600"
  }

  return (
    <motion.div
      className={`${sizeClasses[size]} bg-gradient-to-br ${colorClasses[color]} rounded-full flex items-center justify-center shadow-lg border border-white/20`}
      animate={{
        y: [0, -150, -300, -450],
        opacity: [0, 1, 1, 0],
        scale: [0.8, 1, 1, 0.8]
      }}
      transition={{
        duration: 6,
        delay: delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear"
      }}
    >
      <Icon className={`${iconSizes[size]} text-white`} />
    </motion.div>
  )
}

export default function HeroSection() {
  const text = "Borkin Industries"
  const letters = text.split("")

  // Array of pet-related icons
  const petIcons = [PawPrint, Cat, Dog, Fish, Bird, Rabbit]

  // Function to generate random horizontal position for pet icons
  const randomHorizontalPosition = () => ({
    left: `${Math.random() * 80 + 10}%`, // Keep within 10-90% to prevent overflow
  })

  // Function to get a random icon from the petIcons array
  const getRandomPetIcon = () => petIcons[Math.floor(Math.random() * petIcons.length)]

  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden" id="hero">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(120,119,198,0.1),_transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_rgba(236,72,153,0.1),_transparent_50%)] pointer-events-none" />
      
      {/* Floating Pet Icons Background - Reduced for performance */}
      {[...Array(8)].map((_, index) => {
        const RandomIcon = getRandomPetIcon()
        return (
          <motion.div
            key={index}
            className="absolute text-indigo-300/25"
            style={randomHorizontalPosition()}
            initial={{
              opacity: 0,
              scale: 0,
              bottom: "-10%",
            }}
            animate={{
              opacity: [0, 0.25, 0],
              scale: [0.6, 1, 0.6],
              bottom: "110%",
            }}
            transition={{
              duration: Math.random() * 10 + 20,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              ease: "linear",
              delay: Math.random() * 8,
            }}
          >
            <RandomIcon size={Math.random() * 16 + 20} />
          </motion.div>
        )
      })}

      {/* Animated Wave Background - Optimized and faster */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
        <motion.svg
          className="relative block w-full h-32 md:h-40 lg:h-48"
          style={{ width: '200%', marginLeft: '-50%' }}
          viewBox="0 0 2400 120"
          preserveAspectRatio="none"
          animate={{
            x: [0, -200, 0]
          }}
          transition={{
            duration: 6,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear"
          }}
        >
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(99, 102, 241, 0.1)" />
              <stop offset="50%" stopColor="rgba(139, 92, 246, 0.15)" />
              <stop offset="100%" stopColor="rgba(236, 72, 153, 0.1)" />
            </linearGradient>
          </defs>
          <path
            d="M0,60 C600,120 1200,0 1800,60 C2100,90 2300,30 2400,60 L2400,120 L0,120 Z"
            fill="url(#waveGradient)"
          />
          <motion.path
            d="M0,80 C600,20 1200,100 1800,40 C2100,10 2300,70 2400,40 L2400,120 L0,120 Z"
            fill="rgba(255, 255, 255, 0.1)"
            animate={{
              d: [
                "M0,80 C600,20 1200,100 1800,40 C2100,10 2300,70 2400,40 L2400,120 L0,120 Z",
                "M0,60 C600,40 1200,80 1800,60 C2100,30 2300,90 2400,60 L2400,120 L0,120 Z",
                "M0,80 C600,20 1200,100 1800,40 C2100,10 2300,70 2400,40 L2400,120 L0,120 Z"
              ]
            }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear"
            }}
          />
        </motion.svg>
      </div>

      {/* Floating Animal Bubbles - Reverted to show animals */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Left side bubbles */}
        <div className="absolute left-[10%] top-[70%]">
          <FloatingBubble icon={Dog} delay={0} size="large" color="blue" />
        </div>
        <div className="absolute left-[5%] top-[50%]">
          <FloatingBubble icon={Cat} delay={2} size="medium" color="pink" />
        </div>
        <div className="absolute left-[15%] top-[80%]">
          <FloatingBubble icon={Fish} delay={4} size="small" color="green" />
        </div>
        
        {/* Right side bubbles */}
        <div className="absolute right-[10%] top-[60%]">
          <FloatingBubble icon={Bird} delay={1} size="large" color="purple" />
        </div>
        <div className="absolute right-[5%] top-[75%]">
          <FloatingBubble icon={Rabbit} delay={3} size="medium" color="yellow" />
        </div>
        <div className="absolute right-[20%] top-[85%]">
          <FloatingBubble icon={PawPrint} delay={5} size="small" color="blue" />
        </div>
        
        {/* Center bubbles */}
        <div className="absolute left-[45%] top-[90%]">
          <FloatingBubble icon={Cat} delay={1.5} size="medium" color="yellow" />
        </div>
        <div className="absolute left-[55%] top-[85%]">
          <FloatingBubble icon={Dog} delay={3.5} size="small" color="purple" />
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        className="relative z-10 text-center max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="space-y-8">
          {/* Logo with Enhanced Styling */}
          <motion.div 
            className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 mx-auto"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full blur-xl opacity-20 animate-pulse" />
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white">
              <Image
                src={logo || "/placeholder.svg"}
                alt="Borkin Industries"
                fill
                className="object-cover"
                priority
              />
            </div>
            <motion.div
              className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut"
              }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>
          </motion.div>

          {/* Enhanced Title */}
          <div className="space-y-4">
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <span className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                {letters.map((letter, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.6 + index * 0.05,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    className="inline-block"
                  >
                    {letter === " " ? "\u00A0" : letter}
                  </motion.span>
                ))}
              </span>
            </motion.h1>

            <motion.p
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-700 max-w-4xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              Professional at-home pet care
              <motion.span 
                className="inline-block ml-2"
                animate={{ 
                  rotate: [0, 10, -10, 0],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  delay: 1
                }}
              >
                🐾
              </motion.span>
            </motion.p>

            <motion.p
              className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              Trusted, certified veterinary care for your beloved pets in the comfort of their own home
            </motion.p>
          </div>

          {/* Enhanced CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            <SignedOut>
              <SignInButton mode="modal">
                <motion.button
                  className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-2 min-w-[200px] justify-center"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.button>
              </SignInButton>
            </SignedOut>
            
            <SignedIn>
              <Link href="/dashboard">
                <motion.button
                  className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-2 min-w-[200px] justify-center"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.button>
              </Link>
            </SignedIn>
            
            <motion.a
              className="group relative bg-white/80 backdrop-blur-sm text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white hover:border-slate-300 transition-all duration-300 flex items-center gap-2 min-w-[200px] justify-center shadow-lg hover:shadow-xl"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              href="#about"
            >
              <span>Learn More</span>
              <motion.div
                animate={{ y: [0, 3, 0] }}
                transition={{ 
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut"
                }}
              >
                ↓
              </motion.div>
            </motion.a>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            className="flex flex-wrap justify-center items-center gap-6 pt-8 text-sm text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.4 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Certified Veterinary Technician</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span>4+ Years Experience</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              <span>Trusted by 11+ Families</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Enhanced Floating Elements */}
      {[...Array(3)].map((_, index) => (
        <motion.div
          key={index}
          className="absolute text-pink-400/60"
          initial={{ 
            opacity: 0, 
            scale: 0, 
            x: `${20 + index * 25}%`, 
            y: "80%" 
          }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0, 1.2, 0],
            y: ["80%", "20%", "-10%"],
          }}
          transition={{
            duration: 6,
            delay: index * 2,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "loop",
            ease: "easeInOut",
          }}
        >
          <Heart size={24} />
        </motion.div>
      ))}

      {/* Enhanced Sun */}
      <motion.div
        className="absolute top-8 right-8 text-yellow-400/80"
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
          ease: "linear",
        }}
      >
        <Sun size={40} className="drop-shadow-lg" />
      </motion.div>

      {/* Modern Wave SVG */}
      <div className="absolute bottom-0 left-0 right-0 w-full">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 1440 320" 
          className="w-full h-auto"
        >
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
              <stop offset="50%" stopColor="#f8fafc" stopOpacity="1"/>
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1"/>
            </linearGradient>
          </defs>
          <path
            fill="url(#waveGradient)"
            fillOpacity="1"
            d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      </div>
    </section>
  )
}

