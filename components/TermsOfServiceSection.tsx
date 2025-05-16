'use client'

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function TermsOfServiceSection() {
  const [showTerms, setShowTerms] = useState(false);

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-800 rounded-lg">
      <div className="container px-4 md:px-6">
        <motion.h2
          className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-6 text-purple-600 dark:text-purple-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Terms of Service
        </motion.h2>
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowTerms(!showTerms)}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors duration-300"
          >
            <span>{showTerms ? 'Hide' : 'Show'} Terms of Service</span>
            {showTerms ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        {showTerms && (
          <motion.div
            className="space-y-8 text-gray-600 dark:text-gray-300"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h1 className="text-2xl font-bold mb-4 text-center text-purple-600 dark:text-purple-300">
                Borkin Industries
              </h1>
              <h2 className="text-xl font-semibold mb-2 text-center">TERMS OF SERVICE</h2>
              <p className="text-center mb-4">Updated: Febuary 23, 2025</p>
              <hr className="border-gray-300 dark:border-gray-700" />
            </div>

            {/* Section 1 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                1. Acceptance of These Terms
              </h3>
              <p>
                By requesting and/or using our pet care services (&quot;Services&quot;), you acknowledge that you have
                read, understand, and agree to these Terms. If you do not agree with any part of these Terms,
                you may not use our Services.
              </p>
            </div>

            {/* Section 2 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                2. Changes to These Terms
              </h3>
              <p>
                We may amend these Terms from time to time. Any changes will be effective when posted, and
                your continued use of our Services after the posting of revised Terms constitutes your
                acceptance of those changes. Please review these Terms periodically to stay informed of any
                updates.
              </p>
            </div>

            {/* Section 3 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                3. Our Services
              </h3>
              <p>
                We provide pet care services directly to pet owners (&quot;you&quot; or &quot;Pet Owner&quot;), including but not
                limited to:
              </p>

              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Pet sitting</li>
                <li>Dog walking</li>
                <li>Feeding and watering</li>
                <li>Administering medications (as directed)</li>
                <li>Other agreed-upon services</li>
              </ul>
              <p className="mt-2">
                We are committed to offering quality care for your pets in a safe and professional manner.
              </p>
            </div>

            {/* Section 4 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                4. Payment Terms
              </h3>
              <h4 className="font-semibold mt-4">4.1 Service Fees</h4>
              <p>
                Fees for our Services will be agreed upon before the commencement of any service. The fees
                may vary based on the type of service, duration, and any special requirements.
              </p>
              <h4 className="font-semibold mt-4">4.2 Payment Schedule</h4>
              <p>
                Payment is due upon completion of services. We accept cash, check, and major credit cards.
              </p>
              <h4 className="font-semibold mt-4">4.3 Late Payments</h4>
              <p>
                If payments are not received by the due date, we reserve the right to suspend services until
                payment is made in full.
              </p>
            </div>

            {/* Section 5 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                5. Cancellation Policy
              </h3>
              <h4 className="font-semibold mt-4">5.1 Cancellation by Pet Owner</h4>
              <p>
                If you need to cancel a scheduled service, please notify us at least 24 hours in advance.
                Cancellations made with less than 24 hours notice may incur a cancellation fee of 50% of the
                scheduled service fee.
              </p>
              <h4 className="font-semibold mt-4">5.2 Cancellation by Company</h4>
              <p>
                We reserve the right to cancel services due to emergencies, unsafe conditions, or any
                unforeseen circumstances. In such cases, we will provide as much notice as possible and refund
                any prepaid amounts for the canceled services.
              </p>
            </div>

            {/* Section 6 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                6. Pet Owner Responsibilities
              </h3>
              <p>As a Pet Owner, you agree to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>
                  <strong>Provide Accurate Information:</strong> Offer complete and truthful information about
                  your pet(s), including health history, behavior, and any special needs.
                </li>
                <li>
                  <strong>Ensure Vaccinations:</strong> Confirm that your pet(s) are up-to-date on all
                  required vaccinations and free of fleas, ticks, and other pests.
                </li>
                <li>
                  <strong>Supply Necessary Items:</strong> Provide sufficient food, medications, leashes,
                  collars, litter, and any other items necessary for the care of your pet(s).
                  If medications need to be administered, a doctor of veterinary medicine must have prescribed the medications with clear and concise instructions written in the medication.
                </li>
                <li>
                  <strong>Emergency Contact:</strong> Provide current contact information and at least one
                  emergency contact who is authorized to make decisions regarding your pet(s) in your absence.
                </li>
                <li>
                  <strong>Home Access:</strong> If services are to be provided in your home, ensure safe
                  access by providing keys, security codes, or other necessary information.
                </li>
              </ul>
            </div>

            {/* Section 7 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                7. Liability Release
              </h3>
              <h4 className="font-semibold mt-4">7.1 Pet Behavior and Health</h4>
              <p>
                You acknowledge that all pets may respond differently to various situations and that we cannot
                predict every pet&quot;s reaction. You accept all risks associated with our care of your pet(s),
                including but not limited to illness, injury, or escape.
              </p>
              <h4 className="font-semibold mt-4">7.2 Indemnification</h4>
              <p>
                You agree to indemnify and hold harmless Borkin Industries, its owner(s), employees, and
                agents from any claims, damages, or expenses (including veterinary fees and legal costs)
                arising from your pet&quot;s behavior, health issues, or any misrepresentations you have made.
              </p>
            </div>

            {/* Section 8 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                8. Emergency Care
              </h3>
              <p>In the event your pet requires medical attention:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>
                  <strong>Authorization:</strong> You authorize us to seek veterinary care for your pet if we
                  deem it necessary.
                </li>
                <li>
                  <strong>Notification:</strong> We will make reasonable efforts to contact you and your
                  emergency contact before seeking care.
                </li>
                <li>
                  <strong>Costs:</strong> You are responsible for all costs associated with veterinary care,
                  including treatment, medications, and transportation.
                </li>
              </ul>
            </div>

            {/* Section 9 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                9. Photo and Video Consent
              </h3>
              <p>
                You consent to us taking photographs or videos of your pet(s) during the provision of
                Services. These images may be used for:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Updates to you about your pet</li>
                <li>Training and educational purposes</li>
                <li>Marketing and promotional materials (website, social media, brochures)</li>
              </ul>
              <p className="mt-2">
                If you prefer that images of your pet(s) not be used for marketing purposes, please inform us
                in writing.
              </p>
            </div>

            {/* Section 10 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                10. Confidentiality and Privacy
              </h3>
              <p>
                We respect your privacy. Any personal or sensitive information obtained during the provision
                of Services will be kept confidential and will not be shared with third parties except as
                required by law or as necessary to provide the Services.
              </p>
            </div>

            {/* Section 11 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                11. Severability
              </h3>
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, the remaining
                provisions shall remain in full force and effect.
              </p>
            </div>

            {/* Section 12 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                12. Governing Law
              </h3>
              <p>
                These Terms are governed by and construed in accordance with the laws of [Your State], without
                regard to its conflict of law principles.
              </p>
            </div>

            {/* Section 13 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                13. Dispute Resolution
              </h3>
              <p>
                Any disputes arising from these Terms or our Services shall be resolved through:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>
                  <strong>Mediation:</strong> A neutral third-party mediator will facilitate a resolution.
                </li>
              </ul>
            </div>

            {/* Section 14 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                14. Entire Agreement
              </h3>
              <p>
                These Terms constitute the entire agreement between you and Borkin Industries regarding the
                Services and supersede any prior agreements or understandings.
              </p>
            </div>

            {/* Section 15 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">15. Waiver</h3>
              <p>
                No waiver by us of any term or condition set forth in these Terms shall be deemed a further or
                continuing waiver of such term or condition or a waiver of any other term or condition.
              </p>
            </div>

            {/* Acknowledgment */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
              <hr className="border-gray-300 dark:border-gray-700 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-300">
                Acknowledgment and Acceptance
              </h3>
              <p>
                By engaging our Services, you acknowledge that you have read, understood, and agree to these
                Terms of Service.
              </p>
            </div>

            {/* Footer Note */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <p className="italic text-center text-sm">
                *This is a living document and is subject to change at anytime.*
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}