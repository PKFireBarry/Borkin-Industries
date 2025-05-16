import React, { useState, useEffect } from 'react'
import { Dog, Fish, Droplet, Scissors, Heart, RefreshCw, Phone } from 'lucide-react'
import { motion } from 'framer-motion'

const services = [
  // Overnight Pet Sitting for Dogs
  {
    id: 1,
    category: "Overnight Pet Sitting",
    name: "Dog Sitting",
    description: "Includes dinner, sleepover, breakfast, and light cleaning. Starting at:",
    options: [
      { id: 1.1, label: "1 Dog", price: 100, maxAnimals: 1 },
      { id: 1.2, label: "2 Dogs", price: 120, maxAnimals: 2 },
      { id: 1.3, label: "Up to 5 Dogs", price: 150, maxAnimals: 5 },
      { id: 1.4, label: "More than 5 Dogs", price: 175, maxAnimals: Infinity },
    ],
    icon: Dog,
    animalType: "Dog",
  },
  // Overnight Pet Sitting for Small Animals
  {
    id: 3,
    category: "Overnight Pet Sitting",
    name: "Small Animal Sitting",
    description: "Care for rabbits, fish, reptiles, etc. Includes feeding and habitat maintenance. Starting at:",
    options: [
      { id: 3.1, label: "1 Animals", price: 75, maxAnimals: 1 },
      { id: 3.2, label: "2 Animals", price: 100, maxAnimals: 2 },
      { id: 3.3, label: "Up to 5 Animals", price: 150, maxAnimals: 5 },
      { id: 3.4, label: "More than 5 Animals", price: 200, maxAnimals: Infinity },
    ],
    icon: Fish,
    animalType: "Small",
  },
  // Additional Services
  {
    id: 4,
    category: "Additional Services",
    name: "Medication Administration",
    price: 35,
    description: "Per animal per night",
    icon: Heart,
    animalType: "All",
  },
  {
    id: 5,
    category: "Additional Services",
    name: "Baths",
    price: 20,
    description: "Base price",
    icon: Droplet,
    animalType: "All",
  },
  {
    id: 6,
    category: "Additional Services",
    name: "Nail Trimming",
    price: 15,
    description: "Base price",
    icon: Scissors,
    animalType: "All",
  },
  // Drop-in Visits
  {
    id: 7,
    category: "Other Services",
    name: "Drop-in Visits",
    options: [
      { id: 7.1, label: "Dog", price: 55, animalType: ["Dog"] },
      { id: 7.2, label: "Small Animal", price: 50, animalType: ["Small"] },
    ],
    description: "Just stop by to feed and check on the animals. Starting at:",
    icon: Dog,
    animalType: "All",
  },
]

export default function ServicesSection() {
  const [step, setStep] = useState(1)
  const [animalType, setAnimalType] = useState('')
  const [animalCount, setAnimalCount] = useState(1)
  const [duration, setDuration] = useState(1)
  const [selectedServices, setSelectedServices] = useState<number[]>([])

  useEffect(() => {
    // Reset selected services when animal type or count changes
    setSelectedServices([])
  }, [animalType, animalCount])

  const isLargeAnimal = animalType === "Large"

  const toggleService = (serviceId: number) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const calculateTotal = () => {
    let total = 0
    if (isLargeAnimal) {
      return total
    }
    selectedServices.forEach(serviceId => {
      const service = services.find(s => s.id === Math.floor(serviceId))
      if (service) {
        if (service.options) {
          const option = service.options.find(o => o.id === serviceId)
          if (option) {
            total += option.price * duration
          }
        } else {
          let count = 1
          if (service.id === 4) {
            // Medication Administration is per animal per night
            count = animalCount * duration
          }
          total += service.price * count
        }
      }
    })
    return total
  }

  const filteredServices = isLargeAnimal
    ? []
    : services.filter(service =>
        service.animalType === animalType || service.animalType === "All"
      )

  const getRelevantOption = (service: typeof services[0]) => {
    if (!service.options) return null
    return service.options.find(option => {
      if ('maxAnimals' in option) {
        return option.maxAnimals >= animalCount
      } else if ('animalType' in option) {
        if (Array.isArray(option.animalType)) {
          return option.animalType.includes(animalType)
        } else {
          return option.animalType === animalType
        }
      } else {
        return false
      }
    })
  }

  const steps = [
    { number: 1, title: "Animal Type" },
    { number: 2, title: "Number of Animals" },
    { number: 3, title: "Duration" },
    { number: 4, title: "Services" }
  ];

  const renderProgressSteps = () => (
    <div className="flex items-center justify-center w-full mb-8">
      <div className="flex relative w-full">
        {/* Connecting Line Container */}


        {/* Step Indicators */}
        {steps.map((s) => (
          <div
            key={s.number}
            className="flex flex-col items-center flex-1 relative z-10"
          >
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm transition-colors duration-300 ${
                step >= s.number ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s.number}
            </div>
            <span className="text-xs sm:text-sm mt-2 text-center">{s.title}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderServiceItem = (service: typeof services[0]) => {
    const IconComponent = service.icon
    const relevantOption = getRelevantOption(service)

    if (service.options && !relevantOption) return null

    return (
      <motion.div
        key={service.id}
        className="mb-4 p-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow hover:shadow-md transition-all duration-300 border border-purple-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              {IconComponent && <IconComponent className="w-5 h-5 text-purple-600" />}
            </div>
            <div>
              <h3 className="font-medium">{service.name}</h3>
              <p className="text-sm text-gray-600">{service.description}</p>
            </div>
          </div>
          {relevantOption ? (
            <div className="flex items-center space-x-4">
              <span className="font-semibold">${relevantOption.price}</span>
              <input
                type="checkbox"
                checked={selectedServices.includes(relevantOption.id)}
                onChange={() => toggleService(relevantOption.id)}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <span className="font-semibold">${service.price}</span>
              <input
                type="checkbox"
                checked={selectedServices.includes(service.id)}
                onChange={() => toggleService(service.id)}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  const resetForm = () => {
    setStep(1)
    setAnimalType('')
    setAnimalCount(1)
    setDuration(1)
    setSelectedServices([])
  }

  const renderEstimateCard = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 opacity-10"></div>
      <div className="relative z-10">
        {isLargeAnimal ? (
          <div className="text-center">
            <h4 className="text-lg font-semibold mb-2 text-purple-800">Contact Us for an Estimate</h4>
            <p className="text-gray-700 mb-4">
              Please contact us directly to get a personalized estimate for large animals.
            </p>
            <a
              href="tel:1234567890"
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-md hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
            >
              <Phone className="w-5 h-5 mr-2" />
              Call Us
            </a>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6 mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Animal Type</p>
                  <p className="font-medium text-purple-800">{animalType || 'Not selected'}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Animals</p>
                  <p className="font-medium text-purple-800">{animalCount}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Days</p>
                  <p className="font-medium text-purple-800">{duration}</p>
                </div>
              </div>
            </div>
            {selectedServices.length > 0 ? (
              <div className="space-y-2">
                {selectedServices.map(serviceId => {
                  const service = services.find(s => s.id === Math.floor(serviceId));
                  if (!service) return null;
                  
                  let label, price;
                  if (service.options) {
                    const option = service.options.find(o => o.id === serviceId);
                    if (!option) return null;
                    label = `${service.name} - ${option.label}`;
                    price = option.price * duration;
                  } else {
                    label = service.name;
                    const count = service.id === 4 ? animalCount * duration : 1;
                    price = service.price * count;
                  }
                  
                  return (
                    <div key={serviceId} className="flex justify-between items-center py-2">
                      <span className="text-gray-700">{label}</span>
                      <span className="font-medium">${price.toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="border-t-2 border-purple-100 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-purple-800">Total Estimate</span>
                    <span className="text-2xl font-bold text-purple-600">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                Select services to see your estimate
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-purple-800">What type of animal do you have?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Dog', 'Large', 'Small'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setAnimalType(type);
                      setStep(2);
                    }}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                      animalType === type
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <span className="block text-lg font-medium">{type} Animal</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )
      case 2:
        return (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-purple-800">How many animals?</h3>
              <input
                type="number"
                min="1"
                value={animalCount}
                onChange={(e) => setAnimalCount(Math.max(1, parseInt(e.target.value)))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
              />
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-md hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                >
                  Next
                </button>
              </div>
            </div>
          </motion.div>
        )
      case 3:
        if (isLargeAnimal) {
          return (
            <motion.div
              className="space-y-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-purple-800">Contact Us for an Estimate</h3>
                <p className="text-gray-700 mb-4">
                  For large animals, please contact us directly to get a personalized estimate.
                </p>
                <a
                  href="tel:1234567890"
                  className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-md hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call Us
                </a>
              </div>
            </motion.div>
          )
        } else {
          return (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-purple-800">How many days do you need service?</h3>
                <input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value)))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                />
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => setStep(4)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-md hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            </motion.div>
          )
        }
      case 4:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-6 text-purple-800">Select Your Services</h3>
              {Object.entries(filteredServices.reduce((acc, service) => {
                acc[service.category] = [...(acc[service.category] || []), service]
                return acc
              }, {} as Record<string, typeof services>)).map(([category, categoryServices]) => (
                <div key={category} className="mb-6">
                  <h4 className="text-lg font-semibold mb-2">{category}</h4>
                  {categoryServices.map(renderServiceItem)}
                </div>
              ))}
            </div>
          </motion.div>
        )
      default:
        return null
    }
  }

  return (
    <div className="mx-auto px-4 py-8 bg-white">
      <motion.h1
        className="text-3xl md:text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Pet Service Cost Calculator
      </motion.h1>
      {renderProgressSteps()}
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          {renderStep()}
          {step > 1 && (
            <motion.button
              onClick={resetForm}
              className="mt-4 px-4 py-2 text-gray-600 rounded-full hover:bg-gray-100 transition-colors duration-300 flex items-center justify-center"
              whileHover={{ scale: 1.02 }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Start Over
            </motion.button>
          )}
        </div>
        <div className="md:sticky md:top-8 h-fit">
          {renderEstimateCard()}
          {!isLargeAnimal && selectedServices.length > 0 && (
            <>
              {/* Consider adding content here, based on the context.
                  For example, a summary of selected services, or a call to action.
                  For now, leaving it as a placeholder. */}
            </>
          )}
        </div>
      </div>
    </div>
  )
}