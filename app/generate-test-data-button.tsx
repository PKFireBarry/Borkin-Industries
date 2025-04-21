"use client"

import { useState, useTransition } from 'react'
import { generateTestData } from '@/lib/firebase/generate-test-data'

export function GenerateTestDataButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  const handleClick = () => {
    setResult(null)
    startTransition(async () => {
      try {
        await generateTestData()
        setResult('Test data generated successfully!')
      } catch (err: any) {
        setResult('Failed to generate test data: ' + (err?.message || err))
      }
    })
  }

  return (
    <div className="mt-8 flex flex-col items-center">
      <button
        type="button"
        className="px-6 py-3 rounded-lg bg-orange-600 text-white font-semibold shadow hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 transition disabled:opacity-60"
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? 'Generating...' : 'Generate Test Data'}
      </button>
      {result && (
        <div className="mt-4 text-sm text-center text-orange-700 dark:text-orange-300">{result}</div>
      )}
    </div>
  )
} 