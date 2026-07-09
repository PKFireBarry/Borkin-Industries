import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  iconWrapClassName: string
  className?: string
  iconContainerClassName?: string
  titleClassName?: string
  descriptionClassName?: string
  align?: 'start' | 'center'
  shadow?: boolean
  shape?: 'rounded-2xl' | 'rounded-full'
  titleAs?: 'h3' | 'p'
}

export function SectionHeader({
  icon,
  title,
  description,
  iconWrapClassName,
  className,
  iconContainerClassName,
  titleClassName,
  descriptionClassName,
  align = 'center',
  shadow = false,
  shape = 'rounded-2xl',
  titleAs = 'h3',
}: SectionHeaderProps) {
  const TitleTag = titleAs

  return (
    <div className={cn('mb-4 flex gap-3', align === 'start' ? 'items-start' : 'items-center', className)}>
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center',
          shape,
          shadow && 'shadow-sm',
          iconWrapClassName,
          iconContainerClassName
        )}
      >
        {icon}
      </div>
      <div>
        <TitleTag className={cn('text-base font-semibold text-slate-900 sm:text-lg', titleClassName)}>{title}</TitleTag>
        {description ? <p className={cn('mt-1 text-xs text-slate-600 sm:text-sm', descriptionClassName)}>{description}</p> : null}
      </div>
    </div>
  )
}
