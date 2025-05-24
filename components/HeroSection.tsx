"use client"
import { motion } from "framer-motion"
import { PawPrint, Heart, Sun, Cat, Dog, Fish, Bird, Rabbit } from "lucide-react"
import Image from "next/image"
import logo from "../photo/logo.png"
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs"
import Link from "next/link"

export default function HeroSection() {
  const text = "Borkin Industries"
  const letters = text.split("")

  // Array of pet-related icons
  const petIcons = [PawPrint, Cat, Dog, Fish, Bird, Rabbit]

  // Function to generate random horizontal position for pet icons
  const randomHorizontalPosition = () => ({
    left: `${Math.random() * 100}%`,
  })

  // Function to get a random icon from the petIcons array
  const getRandomPetIcon = () => petIcons[Math.floor(Math.random() * petIcons.length)]

  return (
    <section className="w-full min-h-screen py-12 flex flex-col items-center justify-center bg-gradient-to-r from-blue-400 to-green-400 relative overflow-hidden" id="hero">
      {/* Pet Icons Background */}
      {[...Array(30)].map((_, index) => {
        const RandomIcon = getRandomPetIcon()
        return (
          <motion.div
            key={index}
            className="absolute text-yellow-300 opacity-20"
            style={randomHorizontalPosition()}
            initial={{
              opacity: 0,
              scale: 0,
              bottom: "-20%",
            }}
            animate={{
              opacity: [0.2, 0.5, 0],
              scale: [0.8, 1, 0.8],
              bottom: "120%",
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              ease: "easeInOut",
              delay: Math.random() * 10,
            }}
          >
            <RandomIcon size={Math.random() * 24 + 24} />
          </motion.div>
        )
      })}

      {/* Main Content */}
      <motion.div
        className="px-4 md:px-8 z-10 text-center"
        initial={{ opacity: 0, y: 200 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="space-y-6">
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 mx-auto">
            <Image
              src={logo || "/placeholder.svg"}
              alt="Borkin Industries"
              fill
              className="rounded-full object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-white">
            {letters.map((letter, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 1, y: 50 }}
                animate={{ opacity: 0.5, y: 0 }}
                transition={{
                  duration: 4,
                  delay: index * 0.1,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }}
              >
                {letter}
              </motion.span>
            ))}
          </h1>

          <motion.p
            className="mx-auto max-w-[700px] text-lg md:text-xl lg:text-4xl font-bold text-blue-100"
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{
              duration: 1,
              ease: "easeOut",
            }}
            style={{ transformOrigin: "left center" }}
          >
            Professional at-home pet care.
          </motion.p>

          <div className="space-x-4 mt-6">
            <SignedOut>
              <SignInButton mode="modal">
                <motion.button
                  className="bg-yellow-400 text-blue-900 px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 hover:bg-yellow-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Sign In
                </motion.button>
              </SignInButton>
            </SignedOut>
            
            <SignedIn>
              <Link href="/dashboard">
                <motion.button
                  className="bg-yellow-400 text-blue-900 px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 hover:bg-yellow-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Go to Dashboard
                </motion.button>
              </Link>
            </SignedIn>
            
            <motion.a
              className="text-white border border-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 hover:bg-white hover:text-blue-600"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="#about"
            >
              Learn More
            </motion.a>
          </div>
        </div>
      </motion.div>

      {/* Floating Hearts */}
      {[...Array(3)].map((_, index) => (
        <motion.div
          key={index}
          className="absolute text-red-400"
          initial={{ opacity: 0, scale: 0, x: `${index * 30 + 10}%`, y: "100%" }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            y: ["100%", "50%", "0%"],
          }}
          transition={{
            duration: 5,
            delay: index * 2,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "loop",
            ease: "easeInOut",
          }}
        >
          <Heart size={32} />
        </motion.div>
      ))}

      {/* Sun */}
      <motion.div
        className="absolute top-10 right-10 text-yellow-300"
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 10,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
          ease: "linear",
        }}
      >
        <Sun size={64} />
      </motion.div>

      {/* Decorative SVG */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-auto">
          <path
            fill="#ffffff"
            fillOpacity="1"
            d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      </div>
    </section>
  )
}

