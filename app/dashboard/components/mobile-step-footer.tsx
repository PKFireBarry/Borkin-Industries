import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileStepFooterProps {
  step: number
  maxStep: number
  onBack: () => void
  onNext: () => void
  onClose?: () => void
  canGoNext?: boolean
  backDisabled?: boolean
  nextDisabled?: boolean
  finalActionLabel?: string
  onFinalAction?: () => void
  finalActionDisabled?: boolean
  hideNextOnFinal?: boolean
  className?: string
  backButtonClassName?: string
  nextButtonClassName?: string
  desktopVisible?: boolean
}

export function MobileStepFooter({
  step,
  maxStep,
  onBack,
  onNext,
  onClose,
  canGoNext = true,
  backDisabled = false,
  nextDisabled = false,
  finalActionLabel,
  onFinalAction,
  finalActionDisabled = false,
  hideNextOnFinal = false,
  className,
  backButtonClassName,
  nextButtonClassName,
  desktopVisible = false,
}: MobileStepFooterProps) {
  const isFinalStep = step >= maxStep

  return (
    <div
      className={cn(
        'shrink-0 border-t border-slate-200/80 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur',
        desktopVisible ? 'sm:block' : 'sm:hidden',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="pill"
          onClick={onBack}
          disabled={step === 0 || backDisabled}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
          className={cn('min-w-[7.75rem] flex-1 rounded-2xl', backButtonClassName)}
        >
          Back
        </Button>

        {isFinalStep ? (
          hideNextOnFinal ? (
            <div className="min-w-[8.5rem]" />
          ) : (
            <Button
              type="button"
              variant="petCta"
              size="pill"
              onClick={onFinalAction}
              disabled={finalActionDisabled || !onFinalAction}
              className={cn('min-w-[9rem] flex-[1.15] rounded-2xl', nextButtonClassName)}
            >
              {finalActionLabel || 'Continue'}
            </Button>
          )
        ) : (
          <Button
            type="button"
            variant="petCta"
            size="pill"
            onClick={onNext}
            disabled={!canGoNext || nextDisabled}
            rightIcon={<ChevronRight className="h-4 w-4" />}
            className={cn('min-w-[7.75rem] flex-1 rounded-2xl', nextButtonClassName)}
          >
            Next
          </Button>
        )}
      </div>

      {onClose ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="mt-2 h-10 w-full rounded-2xl text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          Close
        </Button>
      ) : null}
    </div>
  )
}
