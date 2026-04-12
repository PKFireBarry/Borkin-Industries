import { DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

interface ModalShellProps extends ComponentProps<typeof DialogContent> {
  maxWidth?: 'lg' | '2xl' | '4xl'
}

const maxWidthClassMap: Record<NonNullable<ModalShellProps['maxWidth']>, string> = {
  lg: 'sm:max-w-lg lg:max-w-2xl',
  '2xl': 'sm:max-w-2xl lg:max-w-4xl',
  '4xl': 'sm:max-w-4xl lg:max-w-6xl',
}

export function ModalShell({ maxWidth = '4xl', className, ...props }: ModalShellProps) {
  return (
      <DialogContent
        className={cn(
          'h-[80svh] max-h-[80svh] w-[90vw] max-w-[90vw] overflow-hidden rounded-[1.75rem] border-0 p-0 shadow-2xl sm:h-[85vh] sm:max-h-[95vh] sm:w-[95vw]',
          maxWidthClassMap[maxWidth],
          className
        )}
      {...props}
    />
  )
}
