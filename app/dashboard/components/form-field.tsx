import { Label } from '@/components/ui/label'
import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  htmlFor: string
  children: ReactNode
  required?: boolean
}

export function FormField({ label, htmlFor, children, required = false }: FormFieldProps) {
  return (
    <div className="space-y-2.5">
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
        {label}
        {required ? ' *' : ''}
      </Label>
      {children}
    </div>
  )
}
