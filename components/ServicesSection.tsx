'use client';

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getAllPlatformServices } from '@/lib/firebase/services'
import type { PlatformService } from '@/types/service'
import {
  Zap,
  Dog,
  Cat,
  Footprints,
  Sparkles, // For grooming/baths
  Home,     // For sitting/boarding
  Heart,    // For medication/health
  PawPrint  // General pet icon as a fallback or for mixed services
} from 'lucide-react'

// Icon retrieval helper
const getServiceIcon = (serviceName: string): React.ReactNode => {
  const lowerCaseName = serviceName.toLowerCase();

  if (lowerCaseName.includes('dog') || lowerCaseName.includes('canine')) return <Dog className="w-6 h-6 text-purple-600 dark:text-purple-300" />;
  if (lowerCaseName.includes('cat') || lowerCaseName.includes('feline')) return <Cat className="w-6 h-6 text-purple-600 dark:text-purple-300" />;
  if (lowerCaseName.includes('walk') || lowerCaseName.includes('exercise')) return <Footprints className="w-6 h-6 text-purple-600 dark:text-purple-300" />;
  if (lowerCaseName.includes('groom') || lowerCaseName.includes('bath') || lowerCaseName.includes('wash')) return <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-300" />;
  if (lowerCaseName.includes('sit') || lowerCaseName.includes('board') || lowerCaseName.includes('care')) return <Home className="w-6 h-6 text-purple-600 dark:text-purple-300" />;
  if (lowerCaseName.includes('medication') || lowerCaseName.includes('health') || lowerCaseName.includes('vet')) return <Heart className="w-6 h-6 text-purple-600 dark:text-purple-300" />;
  if (lowerCaseName.includes('pet') || lowerCaseName.includes('animal')) return <PawPrint className="w-6 h-6 text-purple-600 dark:text-purple-300" />;

  return <Zap className="w-6 h-6 text-purple-600 dark:text-purple-300" />; // Default icon
};

// Keywords to highlight in descriptions
const KEYWORDS_TO_HIGHLIGHT = [
  'overnight', 'emergency', 'specialty', 'luxury', 'premium', 
  'basic', 'advanced', '24/7', 'expert', 'certified'
];

// Component to render description with highlighted keywords
const RenderDescription: React.FC<{ description: string }> = ({ description }) => {
  if (!description) return null;

  const parts = description.split(new RegExp(`(${KEYWORDS_TO_HIGHLIGHT.join('|')})`, 'gi'));

  return (
    <p className="text-gray-600 dark:text-gray-400 text-sm">
      {parts.map((part, index) => 
        KEYWORDS_TO_HIGHLIGHT.includes(part.toLowerCase()) ? (
          <strong key={index} className="font-semibold text-purple-700 dark:text-purple-300">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </p>
  );
};

// Placeholder for a more sophisticated loading/error state
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-10">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
  </div>
);

const ErrorDisplay = ({ message }: { message: string }) => (
  <div className="text-center py-10 text-red-500">
    <p>Error: {message}</p>
  </div>
);

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
        console.error("Failed to fetch services:", err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchServices()
  }, [])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorDisplay message={error} />
  }

  if (!services.length) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p>No services currently available. Please check back later.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-800">
      <motion.h2
        className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-10 md:mb-12 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Our Services
      </motion.h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {services.map((service, index) => (
          <motion.div
            key={service.id}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <div className="flex-grow">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-700 rounded-md mr-3">
                  {getServiceIcon(service.name)}
                </div>
                <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300">
                  {service.name}
                </h3>
              </div>
              {service.description ? (
                <RenderDescription description={service.description} />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                  Core service offering. Contact us for more specific details!
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}