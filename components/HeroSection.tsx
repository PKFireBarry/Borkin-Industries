"use client"

import { motion } from "framer-motion"
import {
  PawPrint,
  Sun,
  Cat,
  Dog,
  Fish,
  Bird,
  Rabbit,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"
import Image from "next/image"
import logo from "../photo/logo.png"
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const petIcons: LucideIcon[] = [PawPrint, Cat, Dog, Fish, Bird, Rabbit]

function randomHorizontalPosition() {
  return {
    left: `${Math.random() * 80 + 10}%`,
  }
}

function getRandomPetIcon() {
  return petIcons[Math.floor(Math.random() * petIcons.length)]
}

function FloatingBubble({
  icon: Icon,
  delay,
  size,
  color,
}: {
  icon: LucideIcon
  delay: number
  size: "small" | "medium" | "large"
  color: "blue" | "purple" | "pink" | "green" | "yellow"
}) {
  const sizeClasses = {
    small: "w-12 h-12",
    medium: "w-16 h-16",
    large: "w-20 h-20",
  }

  const iconSizes = {
    small: "w-5 h-5",
    medium: "w-7 h-7",
    large: "w-9 h-9",
  }

  const colorClasses = {
    blue: "from-blue-400 to-blue-600",
    purple: "from-purple-400 to-purple-600",
    pink: "from-pink-400 to-pink-600",
    green: "from-green-400 to-green-600",
    yellow: "from-yellow-400 to-yellow-600",
  }

  return (
    <motion.div
      className={`${sizeClasses[size]} bg-gradient-to-br ${colorClasses[color]} rounded-full flex items-center justify-center shadow-lg border border-white/20`}
      animate={{
        y: [0, -150, -300, -450],
        opacity: [0, 1, 1, 0],
        scale: [0.8, 1, 1, 0.8],
      }}
      transition={{
        duration: 6,
        delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear",
      }}
    >
      <Icon className={`${iconSizes[size]} text-white`} />
    </motion.div>
  )
}

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative isolate flex min-h-screen w-full items-center overflow-hidden bg-[linear-gradient(160deg,#f8fbff_0%,#e8f1ff_52%,#dff2ff_100%)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(59,130,246,0.20),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_74%,rgba(244,114,182,0.16),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_70%,rgba(16,185,129,0.12),transparent_48%)]" />

      <motion.div
        className="pointer-events-none absolute right-3 top-20 text-amber-400/90 sm:right-10 sm:top-24"
        animate={{ rotate: 360, scale: [1, 1.1, 1] }}
        transition={{ duration: 24, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      >
        <Sun className="h-9 w-9 drop-shadow-[0_8px_16px_rgba(250,204,21,0.42)] sm:h-12 sm:w-12" />
      </motion.div>

      {[...Array(8)].map((_, index) => {
        const RandomIcon = getRandomPetIcon()

        return (
          <motion.div
            key={`floating-${index}`}
            className="pointer-events-none absolute text-indigo-300/25"
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
              delay: Math.random() * 8,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          >
            <RandomIcon size={Math.random() * 16 + 20} />
          </motion.div>
        )
      })}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[72%]">
          <FloatingBubble icon={Dog} delay={0} size="large" color="blue" />
        </div>
        <div className="absolute left-[5%] top-[54%]">
          <FloatingBubble icon={Cat} delay={2} size="medium" color="pink" />
        </div>
        <div className="absolute left-[16%] top-[84%]">
          <FloatingBubble icon={Fish} delay={4} size="small" color="green" />
        </div>

        <div className="absolute right-[10%] top-[62%]">
          <FloatingBubble icon={Bird} delay={1} size="large" color="purple" />
        </div>
        <div className="absolute right-[6%] top-[78%]">
          <FloatingBubble icon={Rabbit} delay={3} size="medium" color="yellow" />
        </div>
        <div className="absolute right-[20%] top-[87%]">
          <FloatingBubble icon={PawPrint} delay={5} size="small" color="blue" />
        </div>

        <div className="absolute left-[45%] top-[92%]">
          <FloatingBubble icon={Cat} delay={1.5} size="medium" color="yellow" />
        </div>
        <div className="absolute left-[55%] top-[86%]">
          <FloatingBubble icon={Dog} delay={3.5} size="small" color="purple" />
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-14 pt-20 sm:px-6 sm:pb-16 sm:pt-24 lg:px-8 lg:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[2rem] border border-white/80 bg-white/74 p-5 shadow-[0_28px_80px_-34px_rgba(37,99,235,0.5)] backdrop-blur-xl sm:p-8 lg:p-10"
        >
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
            <div className="order-2 text-left lg:order-1">
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.6 }}
                className="text-5xl font-black leading-[0.97] tracking-[0.035em] text-slate-900 sm:text-6xl lg:text-7xl"
              >
                <span className="block">Borkin</span>
                <span className="bg-gradient-to-r from-blue-700 via-indigo-700 to-fuchsia-700 bg-clip-text text-transparent [-webkit-text-stroke:0.35px_rgba(30,41,59,0.35)]">
                  Industries
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="mt-5 max-w-xl text-xl font-semibold leading-snug text-slate-800 sm:text-2xl"
              >
                Vet tech-led care that keeps your pets calm, loved, and safe at home.
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26, duration: 0.55 }}
                className="mt-3 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg"
              >
                From routine check-ins to personalized support, your furry family gets consistent attention with clear updates and compassionate handling.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34, duration: 0.55 }}
                className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
              >
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button
                      variant="petPrimary"
                      size="hero"
                      className="w-full sm:w-auto"
                      rightIcon={<ArrowRight className="h-5 w-5" />}
                    >
                      Get Started
                    </Button>
                  </SignInButton>
                </SignedOut>

                <SignedIn>
                  <Button
                    asChild
                    variant="petPrimary"
                    size="hero"
                    className="w-full sm:w-auto"
                    rightIcon={<ArrowRight className="h-5 w-5" />}
                  >
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                </SignedIn>

                <Button asChild variant="petSoft" size="hero" className="w-full sm:w-auto">
                  <a href="#about">
                    Learn More
                    <span aria-hidden>↓</span>
                  </a>
                </Button>
              </motion.div>

            </div>

            <motion.div
              initial={{ opacity: 0, x: 18, y: 12 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="order-1 mx-auto w-full max-w-[18rem] sm:max-w-[22rem] lg:order-2"
            >
              <div className="relative aspect-square overflow-hidden p-3">
                <Image src={logo} alt="Borkin Industries" fill className="object-contain p-2" priority />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 260" className="h-auto w-full">
          <defs>
            <linearGradient id="heroWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="55%" stopColor="#f8fafc" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path
            fill="url(#heroWaveGradient)"
            d="M0,96L48,106.7C96,117,192,139,288,138.7C384,139,480,117,576,106.7C672,96,768,96,864,117.3C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128L1440,260L1392,260C1344,260,1248,260,1152,260C1056,260,960,260,864,260C768,260,672,260,576,260C480,260,384,260,288,260C192,260,96,260,48,260L0,260Z"
          />
        </svg>
      </div>
    </section>
  )
}
