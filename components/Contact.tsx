'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, MessageSquare, Send, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import cat from "../photo/cat.jpg"

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
        <div className="absolute -inset-2 bg-gradient-to-br from-green-100 to-emerald-200 rounded-2xl opacity-50" />
        <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-green-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Message Sent!</h3>
            <p className="text-slate-600 mb-6">
              Thank you for reaching out. We've received your message and will get back to you within 24 hours.
            </p>
            <button
              onClick={() => setIsSubmitted(false)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Send Another Message
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute -inset-2 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl opacity-50" />
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-200">
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
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-slate-900 placeholder-slate-400"
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
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-slate-900 placeholder-slate-400"
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
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-slate-900 placeholder-slate-400"
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
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 text-slate-900 placeholder-slate-400 resize-none"
              placeholder="Tell us more about your pet care needs or any questions you have..."
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Message
              </>
            )}
          </button>
        </form>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-200">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
            <div className="text-lg font-bold text-blue-600 mb-1">Free</div>
            <div className="text-sm font-medium text-blue-700">Initial Consultation</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
            <div className="text-lg font-bold text-green-600 mb-1">24/7</div>
            <div className="text-sm font-medium text-green-700">Emergency Support</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ContactComponent() {
  const title = "Get In Touch!";
  const description = "Feel free to reach out with any questions or inquiries. We're happy to discuss your pet care needs.";

  return (
    <section id="contact" className="relative w-full bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(120,119,198,0.1),_transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_rgba(236,72,153,0.1),_transparent_70%)] pointer-events-none" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32">
        <motion.div 
          className="relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {/* Header Section */}
          <motion.div
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-semibold tracking-wide rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contact Us</span>
            </motion.div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                Contact Us
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Ready to give your pets the care they deserve? Let's start the conversation.
            </p>
          </motion.div>

          {/* Main Content */}
          <div className="relative">
            {/* Background decoration */}
            <div className="absolute -inset-6 bg-gradient-to-br from-white via-slate-50 to-indigo-50 rounded-3xl blur-xl opacity-60" />
            <div className="absolute -inset-3 bg-gradient-to-br from-white to-slate-100 rounded-2xl opacity-80" />
            
            {/* Main card */}
            <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 p-8 md:p-12">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
                
                {/* Left Column - Contact Info */}
                <motion.div 
                  className="space-y-8" 
                  variants={fadeInUp}
                >
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-3xl font-bold text-slate-900 mb-4">{title}</h3>
                      <p className="text-lg text-slate-700 leading-relaxed">
                        {description}
                      </p>
                    </div>

                    {/* Contact Methods */}
                    <div className="space-y-4">
                      <h4 className="text-xl font-bold text-slate-900 mb-4">Get in Touch</h4>
                      
                      <motion.a
                        href="mailto:borkingindutsries@gmail.com"
                        className="group flex items-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                          <Mail className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">Email Us</div>
                          <div className="text-slate-600 group-hover:text-indigo-600 transition-colors">borkingindutsries@gmail.com</div>
                        </div>
                      </motion.a>
                      
                      <motion.a
                        href="tel:+18135377897"
                        className="group flex items-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                          <Phone className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-green-700 transition-colors">Call Us</div>
                          <div className="text-slate-600 group-hover:text-green-600 transition-colors">(813) 537-7897</div>
                        </div>
                      </motion.a>
                    </div>

                    {/* Response Time */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900">Quick Response</h4>
                      </div>
                      <p className="text-slate-700">We typically respond within 24 hours during business days.</p>
                    </div>
                  </div>

                  {/* Image */}
                  <motion.div 
                    variants={scaleIn} 
                    className="relative"
                  >
                    <div className="relative w-full max-w-lg mx-auto">
                      {/* Background decoration */}
                      <div className="absolute -inset-4 bg-gradient-to-br from-orange-100 to-pink-100 rounded-3xl blur-xl opacity-60" />
                      <div className="absolute -inset-2 bg-gradient-to-br from-orange-200 to-pink-200 rounded-2xl opacity-40" />
                      
                      {/* Main image container - Natural aspect ratio */}
                      <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white border-4 border-white">
                        <Image
                          src={cat}
                          alt="A friendly cat inviting contact"
                          width={500}
                          height={281}
                          className="w-full h-auto hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 500px"
                        />
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
                
                {/* Right Column - Contact Form */}
                <motion.div 
                  className="space-y-6" 
                  variants={fadeInUp}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Send className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Send Us a Message</h3>
                  </div>
                  
                  <ContactForm />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}