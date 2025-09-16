'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, User, CreditCard, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { ProfileValidationError } from '@/lib/validation/profile-completeness'

interface ProfileValidationModalProps {
  isOpen: boolean
  onClose: () => void
  error: ProfileValidationError
}

export function ProfileValidationModal({ isOpen, onClose, error }: ProfileValidationModalProps) {
  const profileIssues = error.type === 'profile' || error.type === 'both'
  const paymentIssues = error.type === 'payment' || error.type === 'both'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-0 shadow-2xl p-4 sm:p-6">
        <DialogHeader className="pb-4 sm:pb-6">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 text-center">
            {error.title}
          </DialogTitle>

          <DialogDescription className="text-sm sm:text-base text-slate-600 text-center mt-2">
            {error.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2">
          {/* Missing Fields Summary */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Missing Information:</h4>
            <div className="flex flex-wrap gap-2">
              {error.missingFields.map((field) => (
                <Badge key={field} variant="secondary" className="text-xs bg-slate-200 text-slate-700 border-slate-300">
                  {field}
                </Badge>
              ))}
            </div>
          </div>

          {/* Action Cards */}
          <div className="space-y-3">
            {profileIssues && (
              <div className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-slate-900 text-sm sm:text-base">Complete Your Profile</h5>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Add your personal information, address, and profile picture
                    </p>
                  </div>
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${profileIssues ? 'text-slate-300' : 'text-green-500'}`} />
                </div>
              </div>
            )}

            {paymentIssues && (
              <div className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-slate-900 text-sm sm:text-base">Add Payment Method</h5>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Add a credit or debit card to process booking payments
                    </p>
                  </div>
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${paymentIssues ? 'text-slate-300' : 'text-green-500'}`} />
                </div>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs sm:text-sm text-blue-800">
              <strong>Why is this required?</strong> This information helps contractors provide better service and ensures smooth booking processing. Your information is kept secure and private.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4 sm:pt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border-2 hover:bg-slate-50"
          >
            Maybe Later
          </Button>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {profileIssues && (
              <Link href={error.profileUrl} className="flex-1 sm:flex-none">
                <Button
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  onClick={onClose}
                >
                  <User className="w-4 h-4 mr-2" />
                  Complete Profile
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}

            {paymentIssues && (
              <Link href={error.paymentUrl} className="flex-1 sm:flex-none">
                <Button
                  className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium"
                  onClick={onClose}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Add Payment
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}