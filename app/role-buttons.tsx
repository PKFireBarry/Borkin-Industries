"use client"

import { useTransition } from 'react'
import { setUserRole } from '@/lib/auth/set-user-role'

export function RoleButtons() {
  const [isPending, startTransition] = useTransition()

  const handleSelect = (role: 'client' | 'contractor') => {
    startTransition(() => {
      setUserRole(role)
    })
  }

  return (
    <div className="flex flex-col gap-4 mt-8 w-full max-w-xs">
      <button
        type="button"
        className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition disabled:opacity-60"
        disabled={isPending}
        onClick={() => handleSelect('client')}
      >
        {isPending ? 'Processing...' : 'Continue as Client'}
      </button>
      <button
        type="button"
        className="w-full py-3 px-4 rounded-lg bg-green-600 text-white font-semibold shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 transition disabled:opacity-60"
        disabled={isPending}
        onClick={() => handleSelect('contractor')}
      >
        {isPending ? 'Processing...' : 'Continue as Contractor'}
      </button>
    </div>
  )
} 