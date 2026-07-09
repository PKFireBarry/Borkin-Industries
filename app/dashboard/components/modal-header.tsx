import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalHeaderProps {
  eyebrow: string
  title: string
  description?: string
  onClose: () => void
  titleId?: string
  closeAriaLabel?: string
  eyebrowClassName?: string
  className?: string
  descriptionAlwaysVisible?: boolean
}

export function ModalHeader({
  eyebrow,
  title,
  description,
  onClose,
  titleId,
  closeAriaLabel = 'Close modal',
  eyebrowClassName,
  className,
  descriptionAlwaysVisible = false,
}: ModalHeaderProps) {
  return (
    <div className={cn('shrink-0 border-b border-slate-200/70 bg-white/95 px-4 py-3 sm:px-6 sm:py-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500', eyebrowClassName)}>{eyebrow}</p>
          <DialogTitle id={titleId} className="mt-1 text-lg font-semibold text-slate-900 sm:text-2xl">
            {title}
          </DialogTitle>
          {description ? (
            descriptionAlwaysVisible ? (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            ) : (
              <DialogDescription className="mt-1 hidden text-sm text-slate-600 sm:block">{description}</DialogDescription>
            )
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label={closeAriaLabel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
