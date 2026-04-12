'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, Send, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

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
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
}

// Contact Form Component
function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        setIsSubmitted(true)
        setFormData({ name: '', email: '', subject: '', message: '' })
        toast.success('Message sent successfully! We\'ll get back to you soon.')
      } else {
        toast.error(result.error || 'Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="relative">
        <div className="absolute -inset-2 rounded-[1.6rem] bg-gradient-to-br from-blue-100 to-indigo-200 opacity-55" />
        <div className="relative rounded-[1.5rem] border border-blue-100/60 bg-white/90 p-7 shadow-[0_24px_60px_-36px_rgba(59,130,246,0.3)] backdrop-blur-xl sm:p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Message Sent!</h3>
            <p className="text-slate-600 mb-6">
              Thank you for reaching out. We&apos;ve received your message and will follow up as soon as we can.
            </p>
            <Button
              variant="petPrimary"
              size="lg"
              className="rounded-xl"
              onClick={() => setIsSubmitted(false)}
            >
              Send Another Message
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute -inset-2 rounded-[1.6rem] bg-gradient-to-br from-blue-100/40 to-indigo-100/30 opacity-55" />
      <div className="relative rounded-[1.5rem] border border-blue-100/50 bg-white/90 p-6 shadow-[0_24px_60px_-36px_rgba(59,130,246,0.2)] backdrop-blur-xl sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-slate-900 placeholder-slate-400"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-slate-900 placeholder-slate-400"
                placeholder="your.email@example.com"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="subject" className="block text-sm font-semibold text-slate-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-slate-900 placeholder-slate-400"
              placeholder="What can we help you with?"
            />
          </div>
          
          <div>
            <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-2">
              Message *
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={5}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-slate-900 placeholder-slate-400 resize-none"
              placeholder="Tell us more about your pet care needs or any questions you have..."
            />
          </div>
          
          <Button
            type="submit"
            variant="petPrimary"
            size="lg"
            className="w-full rounded-xl py-4 text-base"
            disabled={isSubmitting}
            loading={isSubmitting}
            loadingText="Sending..."
            leftIcon={!isSubmitting ? <Send className="w-5 h-5" /> : undefined}
          >
            Send Message
          </Button>
        </form>
        
      </div>
    </div>
  )
}

export default function ContactComponent() {
  return (
    <section id="contact" className="relative w-full overflow-hidden bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/40 py-16 md:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_rgba(59,130,246,0.08),_transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_76%,_rgba(99,102,241,0.07),_transparent_48%)]" />
      
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div
            variants={fadeInUp}
            className="mx-auto mb-12 max-w-6xl text-center lg:mb-14"
          >
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                Contact Us
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              Ready to give your pets the care they deserve? Let's start the conversation.
            </p>
          </motion.div>

          <div className="mx-auto max-w-6xl">
            <div className="group relative">
              <div className="absolute -inset-5 rounded-[2.2rem] bg-gradient-to-br from-blue-100/70 via-indigo-100/50 to-sky-100/50 blur-2xl opacity-60 transition-opacity duration-500 group-hover:opacity-80" />

              <div className="relative rounded-[2rem] border border-blue-100/60 bg-white/80 p-6 shadow-[0_28px_70px_-34px_rgba(59,130,246,0.25)] backdrop-blur-xl sm:p-8 lg:p-10">
                <motion.div className="space-y-7" variants={fadeInUp}>
                  <div className="rounded-[1.6rem] border border-blue-100/80 bg-gradient-to-br from-white via-blue-50/35 to-indigo-50/40 p-5 sm:p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <motion.a
                        href="mailto:borkinindustries@gmail.com"
                        className="group flex items-center rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg transition-shadow duration-300 group-hover:shadow-xl">
                          <Mail className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-700">Email Us</div>
                          <div className="truncate text-xs text-slate-600">borkinindustries@gmail.com</div>
                        </div>
                      </motion.a>

                      <motion.a
                        href="tel:+13523403659"
                        className="group flex items-center rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-lg transition-shadow duration-300 group-hover:shadow-xl">
                          <Phone className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-emerald-700">Call Us</div>
                          <div className="text-xs text-slate-600">352-340-3659</div>
                        </div>
                      </motion.a>
                    </div>
                  </div>

                  <div className="border-t border-blue-100/70 pt-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 shadow-lg">
                        <Send className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">Send Us a Message</h3>
                    </div>

                    <ContactForm />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
