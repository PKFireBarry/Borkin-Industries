'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TermsOfServiceSectionProps {
  defaultOpen?: boolean
  hideToggle?: boolean
}

const accentFamilies = [
  { text: 'text-blue-700', border: 'border-blue-100', bg: 'from-blue-50 to-indigo-50', dot: 'bg-blue-500' },
  { text: 'text-rose-700', border: 'border-rose-100', bg: 'from-rose-50 to-pink-50', dot: 'bg-rose-500' },
  { text: 'text-emerald-700', border: 'border-emerald-100', bg: 'from-emerald-50 to-green-50', dot: 'bg-emerald-500' },
  { text: 'text-violet-700', border: 'border-violet-100', bg: 'from-violet-50 to-purple-50', dot: 'bg-violet-500' },
  { text: 'text-amber-700', border: 'border-amber-100', bg: 'from-amber-50 to-yellow-50', dot: 'bg-amber-500' },
]

function getAccent(index: number) {
  return accentFamilies[index % accentFamilies.length]
}

const fadeInUp = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
}

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

interface TermsSectionData {
  title: string
  content: React.ReactNode
}

const termsSections: TermsSectionData[] = [
  {
    title: '1. Acceptance of These Terms',
    content: (
      <p>
        By requesting and/or using our pet care services (&quot;Services&quot;), you acknowledge that you have
        read, understand, and agree to these Terms. If you do not agree with any part of these Terms,
        you may not use our Services.
      </p>
    ),
  },
  {
    title: '2. Changes to These Terms',
    content: (
      <p>
        We may amend these Terms from time to time. Any changes will be effective when posted, and
        your continued use of our Services after the posting of revised Terms constitutes your
        acceptance of those changes. Please review these Terms periodically to stay informed of any
        updates.
      </p>
    ),
  },
  {
    title: '3. Our Services',
    content: (
      <>
        <p>
          We provide pet care services directly to pet owners (&quot;you&quot; or &quot;Pet Owner&quot;), including but not
          limited to:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6">
          <li>Pet sitting</li>
          <li>Dog walking</li>
          <li>Feeding and watering</li>
          <li>Administering medications (as directed)</li>
          <li>Other agreed-upon services</li>
        </ul>
        <p className="mt-3">
          We are committed to offering quality care for your pets in a safe and professional manner.
        </p>
      </>
    ),
  },
  {
    title: '4. Payment Terms',
    content: (
      <>
        <h4 className="mt-1 font-semibold text-slate-900">4.1 Service Fees</h4>
        <p className="mt-1">
          Fees for our Services will be agreed upon before the commencement of any service. The fees
          may vary based on the type of service, duration, and any special requirements.
        </p>
        <h4 className="mt-4 font-semibold text-slate-900">4.2 Payment Schedule</h4>
        <p className="mt-1">
          Payment is due upon completion of services. We accept cash, check, and major credit cards.
        </p>
        <h4 className="mt-4 font-semibold text-slate-900">4.3 Late Payments</h4>
        <p className="mt-1">
          If payments are not received by the due date, we reserve the right to suspend services until
          payment is made in full.
        </p>
      </>
    ),
  },
  {
    title: '5. Cancellation Policy',
    content: (
      <>
        <h4 className="mt-1 font-semibold text-slate-900">5.1 Cancellation by Pet Owner</h4>
        <p className="mt-1">
          If you need to cancel a scheduled service, please notify us at least 24 hours in advance.
          Cancellations made with less than 24 hours notice may incur a cancellation fee of 50% of the
          scheduled service fee.
        </p>
        <h4 className="mt-4 font-semibold text-slate-900">5.2 Cancellation by Company</h4>
        <p className="mt-1">
          We reserve the right to cancel services due to emergencies, unsafe conditions, or any
          unforeseen circumstances. In such cases, we will provide as much notice as possible and refund
          any prepaid amounts for the canceled services.
        </p>
      </>
    ),
  },
  {
    title: '6. Pet Owner Responsibilities',
    content: (
      <>
        <p>As a Pet Owner, you agree to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-6">
          <li>
            <strong className="text-slate-900">Provide Accurate Information:</strong> Offer complete and truthful information about
            your pet(s), including health history, behavior, and any special needs.
          </li>
          <li>
            <strong className="text-slate-900">Ensure Vaccinations:</strong> Confirm that your pet(s) are up-to-date on all
            required vaccinations and free of fleas, ticks, and other pests.
          </li>
          <li>
            <strong className="text-slate-900">Supply Necessary Items:</strong> Provide sufficient food, medications, leashes,
            collars, litter, and any other items necessary for the care of your pet(s).
            If medications need to be administered, a doctor of veterinary medicine must have prescribed the medications with clear and concise instructions written in the medication.
          </li>
          <li>
            <strong className="text-slate-900">Emergency Contact:</strong> Provide current contact information and at least one
            emergency contact who is authorized to make decisions regarding your pet(s) in your absence.
          </li>
          <li>
            <strong className="text-slate-900">Home Access:</strong> If services are to be provided in your home, ensure safe
            access by providing keys, security codes, or other necessary information.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: '7. Liability Release',
    content: (
      <>
        <h4 className="mt-1 font-semibold text-slate-900">7.1 Pet Behavior and Health</h4>
        <p className="mt-1">
          You acknowledge that all pets may respond differently to various situations and that we cannot
          predict every pet&apos;s reaction. You accept all risks associated with our care of your pet(s),
          including but not limited to illness, injury, or escape.
        </p>
        <h4 className="mt-4 font-semibold text-slate-900">7.2 Indemnification</h4>
        <p className="mt-1">
          You agree to indemnify and hold harmless Borkin Industries, its owner(s), employees, and
          agents from any claims, damages, or expenses (including veterinary fees and legal costs)
          arising from your pet&apos;s behavior, health issues, or any misrepresentations you have made.
        </p>
      </>
    ),
  },
  {
    title: '8. Emergency Care',
    content: (
      <>
        <p>In the event your pet requires medical attention:</p>
        <ul className="mt-3 list-disc space-y-2 pl-6">
          <li>
            <strong className="text-slate-900">Authorization:</strong> You authorize us to seek veterinary care for your pet if we
            deem it necessary.
          </li>
          <li>
            <strong className="text-slate-900">Notification:</strong> We will make reasonable efforts to contact you and your
            emergency contact before seeking care.
          </li>
          <li>
            <strong className="text-slate-900">Costs:</strong> You are responsible for all costs associated with veterinary care,
            including treatment, medications, and transportation.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: '9. Photo and Video Consent',
    content: (
      <>
        <p>
          You consent to us taking photographs or videos of your pet(s) during the provision of
          Services. These images may be used for:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6">
          <li>Updates to you about your pet</li>
          <li>Training and educational purposes</li>
          <li>Marketing and promotional materials (website, social media, brochures)</li>
        </ul>
        <p className="mt-3">
          If you prefer that images of your pet(s) not be used for marketing purposes, please inform us
          in writing.
        </p>
      </>
    ),
  },
  {
    title: '10. Confidentiality and Privacy',
    content: (
      <p>
        We respect your privacy. Any personal or sensitive information obtained during the provision
        of Services will be kept confidential and will not be shared with third parties except as
        required by law or as necessary to provide the Services.
      </p>
    ),
  },
  {
    title: '11. Severability',
    content: (
      <p>
        If any provision of these Terms is found to be unenforceable or invalid, the remaining
        provisions shall remain in full force and effect.
      </p>
    ),
  },
  {
    title: '12. Governing Law',
    content: (
      <p>
        These Terms are governed by and construed in accordance with the laws of [Your State], without
        regard to its conflict of law principles.
      </p>
    ),
  },
  {
    title: '13. Dispute Resolution',
    content: (
      <>
        <p>Any disputes arising from these Terms or our Services shall be resolved through:</p>
        <ul className="mt-3 list-disc space-y-1 pl-6">
          <li>
            <strong className="text-slate-900">Mediation:</strong> A neutral third-party mediator will facilitate a resolution.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: '14. Entire Agreement',
    content: (
      <p>
        These Terms constitute the entire agreement between you and Borkin Industries regarding the
        Services and supersede any prior agreements or understandings.
      </p>
    ),
  },
  {
    title: '15. Waiver',
    content: (
      <p>
        No waiver by us of any term or condition set forth in these Terms shall be deemed a further or
        continuing waiver of such term or condition or a waiver of any other term or condition.
      </p>
    ),
  },
]

export default function TermsOfServiceSection({
  defaultOpen = false,
  hideToggle = false,
}: TermsOfServiceSectionProps) {
  const [showTerms, setShowTerms] = useState(defaultOpen)

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-white via-slate-50 to-indigo-50 py-16 md:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_rgba(99,102,241,0.09),_transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_76%,_rgba(236,72,153,0.08),_transparent_48%)]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mx-auto mb-12 max-w-6xl text-center lg:mb-14"
        >
          <h2 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
              Terms of Service
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Updated: February 23, 2025
          </p>
        </motion.div>

        {!hideToggle && (
          <div className="mx-auto mb-8 flex max-w-6xl justify-center">
            <Button
              variant="petPrimary"
              size="pill"
              onClick={() => setShowTerms(!showTerms)}
              rightIcon={
                showTerms
                  ? <ChevronUp className="h-4 w-4" />
                  : <ChevronDown className="h-4 w-4" />
              }
            >
              {showTerms ? 'Hide' : 'Show'} Terms of Service
            </Button>
          </div>
        )}

        <AnimatePresence>
          {showTerms && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={stagger}
                className="mx-auto max-w-6xl space-y-4"
              >
                {/* Header card */}
                <motion.div
                  variants={fadeInUp}
                  className="rounded-[2rem] border border-white/75 bg-white/78 p-6 text-center shadow-[0_24px_60px_-36px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:p-8"
                >
                  <h3 className="text-2xl font-black text-slate-900">Borkin Industries</h3>
                  <p className="mt-1 text-base font-semibold uppercase tracking-wider text-slate-600">Terms of Service</p>
                  <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-indigo-300 to-transparent" />
                </motion.div>

                {/* Term sections */}
                {termsSections.map((section, index) => {
                  const accent = getAccent(index)
                  return (
                    <motion.div
                      key={index}
                      variants={fadeInUp}
                      className="rounded-[2rem] border border-white/75 bg-white/78 p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:p-8"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${accent.dot}`} />
                        <h3 className={`text-lg font-black sm:text-xl ${accent.text}`}>
                          {section.title}
                        </h3>
                      </div>
                      <div className={`rounded-2xl border ${accent.border} bg-gradient-to-br ${accent.bg} p-4 sm:p-5`}>
                        <div className="text-sm leading-relaxed text-slate-700 sm:text-base">
                          {section.content}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}

                {/* Acknowledgment */}
                <motion.div
                  variants={fadeInUp}
                  className="rounded-[2rem] border border-white/75 bg-white/78 p-6 text-center shadow-[0_24px_60px_-36px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:p-8"
                >
                  <div className="mx-auto mb-4 h-px w-24 bg-gradient-to-r from-transparent via-indigo-300 to-transparent" />
                  <h3 className="text-lg font-black text-indigo-700 sm:text-xl">
                    Acknowledgment and Acceptance
                  </h3>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-base">
                    By engaging our Services, you acknowledge that you have read, understood, and agree to these
                    Terms of Service.
                  </p>
                </motion.div>

                {/* Footer note */}
                <motion.div
                  variants={fadeInUp}
                  className="text-center"
                >
                  <p className="text-sm italic text-slate-500">
                    *This is a living document and is subject to change at anytime.*
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
