import { cn } from '@/lib/utils'

interface RailDotsProps {
  count: number
  activeIndex: number
  className?: string
  mobileOnly?: boolean
}

export function RailDots({ count, activeIndex, className, mobileOnly = true }: RailDotsProps) {
  if (count <= 1) return null

  return (
    <div className={cn('mt-3 flex justify-center gap-1.5', mobileOnly && 'sm:hidden', className)}>
      {Array.from({ length: Math.min(count, 3) }).map((_, index) => (
        <span
          key={`rail-dot-${index}`}
          className={cn('h-2 w-2 rounded-full transition-colors', index === activeIndex ? 'bg-slate-900' : 'bg-slate-300')}
        />
      ))}
    </div>
  )
}
