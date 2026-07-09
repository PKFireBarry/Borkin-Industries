import { useRef } from 'react'
import type { TouchEvent } from 'react'

interface UseSwipeStepsOptions {
  step: number
  maxStep: number
  minStep?: number
  threshold?: number
  maxVerticalDelta?: number
  canGoNext?: boolean
  onNext: () => void
  onPrevious: () => void
}

export function useSwipeSteps({
  step,
  maxStep,
  minStep = 0,
  threshold = 50,
  maxVerticalDelta,
  canGoNext = true,
  onNext,
  onPrevious,
}: UseSwipeStepsOptions) {
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const deltaXRef = useRef(0)

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    startXRef.current = touch?.clientX ?? null
    startYRef.current = touch?.clientY ?? null
    deltaXRef.current = 0
  }

  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (startXRef.current == null) return
    deltaXRef.current = event.touches[0].clientX - startXRef.current
  }

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (startXRef.current == null) return

    const touch = event.changedTouches[0]
    const deltaX = deltaXRef.current || touch.clientX - startXRef.current
    const deltaY = startYRef.current == null ? 0 : touch.clientY - startYRef.current

    startXRef.current = null
    startYRef.current = null
    deltaXRef.current = 0

    if (typeof maxVerticalDelta === 'number' && Math.abs(deltaY) > maxVerticalDelta) return
    if (Math.abs(deltaX) < threshold) return

    if (deltaX < 0 && canGoNext && step < maxStep) {
      onNext()
      return
    }

    if (deltaX > 0 && step > minStep) {
      onPrevious()
    }
  }

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  }
}
