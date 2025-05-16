import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Star, DogIcon, CatIcon, FishIcon } from 'lucide-react'

const reviews = [
  { id: 1, name: "John D.", rating: 5, comment: "Excellent service! My dog loves coming here.", icon: DogIcon },
  { id: 2, name: "Sarah M.", rating: 4, comment: "Very professional and caring staff.", icon: CatIcon },
  { id: 3, name: "Mike R.", rating: 5, comment: "The best pet care service in town!", icon: FishIcon },
]

export default function ReviewsSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900">
      <div className="container px-4 md:px-6">
        <motion.h2 
          className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12 text-purple-600 dark:text-purple-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          What Our Customers Say
        </motion.h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{review.comment}</p>
                  <div className="flex items-center">
                    <review.icon className="h-8 w-8 text-purple-500 mr-2" />
                    <p className="font-semibold">{review.name}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

