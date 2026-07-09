import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardPageShellProps {
  children: ReactNode
  className?: string
}

interface DashboardPageHeaderProps {
  title: string
  description?: string
  eyebrow?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  variant?: 'bar' | 'summary'
  surfaceClassName?: string
  sticky?: boolean
  className?: string
}

interface DashboardPageContentProps {
  children: ReactNode
  className?: string
}

export function DashboardPageShell({ children, className }: DashboardPageShellProps) {
  return <div className={cn('min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50', className)}>{children}</div>
}

export function DashboardPageHeader({
  title,
  description,
  eyebrow,
  actions,
  meta,
  variant = 'bar',
  surfaceClassName,
  sticky = true,
  className,
}: DashboardPageHeaderProps) {
  if (variant === 'summary') {
    return (
      <section
        className={cn(
          'rounded-[1.75rem] border border-primary/10 bg-gradient-to-br from-white via-blue-50/70 to-indigo-50/60 p-4 shadow-sm sm:p-6',
          surfaceClassName,
          className
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            {eyebrow ? <div className="flex flex-wrap gap-2">{eyebrow}</div> : null}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
              {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">{actions}</div> : null}
        </div>
        {meta ? <div className="mt-4">{meta}</div> : null}
      </section>
    )
  }

  return (
    <div
      className={cn(
        'border-b border-slate-200/60 bg-white/80 backdrop-blur-sm',
        sticky && 'sticky top-0 z-10',
        className
      )}
    >
      <div className="px-4 sm:px-6 lg:px-[5%]">
        <div className="py-4 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
              {description ? <p className="mt-1 hidden text-slate-600 sm:block">{description}</p> : null}
            </div>
            {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
          </div>
          {meta ? <div className="mt-3 sm:mt-4">{meta}</div> : null}
        </div>
      </div>
    </div>
  )
}

export function DashboardPageContent({ children, className }: DashboardPageContentProps) {
  return <div className={cn('px-4 py-5 sm:px-6 sm:py-8 lg:px-[5%]', className)}>{children}</div>
}
