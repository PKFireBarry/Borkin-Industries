import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: ReactNode
  title: ReactNode
  description: ReactNode
  children?: ReactNode
  className?: string
  iconInCircle?: boolean
  iconWrapperClassName?: string
  titleClassName?: string
  descriptionClassName?: string
  actionsClassName?: string
}

export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
  iconInCircle = false,
  iconWrapperClassName,
  titleClassName,
  descriptionClassName,
  actionsClassName,
}: EmptyStateProps) {
  return (
    <div className={cn('rounded-[1.5rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm', className)}>
      <div
        className={cn(
          'mx-auto mb-4 flex items-center justify-center',
          iconInCircle && 'h-16 w-16 rounded-full bg-slate-100',
          iconWrapperClassName
        )}
      >
        {icon}
      </div>
      <h3 className={cn('text-lg font-semibold text-slate-900', titleClassName)}>{title}</h3>
      <p className={cn('mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600', descriptionClassName)}>{description}</p>
      {children ? (
        <div className={cn('mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row', actionsClassName)}>
          {children}
        </div>
      ) : null}
    </div>
  )
}
