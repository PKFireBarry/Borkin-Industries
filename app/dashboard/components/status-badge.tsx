import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  size?: 'compact' | 'default'
  capitalize?: boolean
  className?: string
}

const statusStyles: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

export function StatusBadge({ status, size = 'default', capitalize = true, className }: StatusBadgeProps) {
  const statusKey = (status || '').toLowerCase()
  const tone = statusStyles[statusKey] || 'bg-slate-100 text-slate-800 border-slate-200'
  const label = status ? (capitalize ? status.charAt(0).toUpperCase() + status.slice(1) : status) : 'Unknown'

  if (size === 'compact') {
    return <span className={cn('rounded-full px-2 py-1 text-[11px]', tone.replace(/ border-[^ ]+/g, ''), className)}>{label}</span>
  }

  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-sm', tone, className)}>{label}</span>
}
