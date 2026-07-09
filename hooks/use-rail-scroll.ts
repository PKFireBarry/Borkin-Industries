import { useEffect, useRef, useState } from 'react'

interface UseRailScrollOptions {
  slideSelector: string
  itemCount: number
}

export function useRailScroll({ slideSelector, itemCount }: UseRailScrollOptions) {
  const railRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex((currentIndex) => Math.min(currentIndex, Math.max(itemCount - 1, 0)))
  }, [itemCount])

  const onScroll = () => {
    const rail = railRef.current
    if (!rail) return

    const slides = Array.from(rail.querySelectorAll<HTMLElement>(slideSelector))
    if (!slides.length) return

    const railCenter = rail.scrollLeft + rail.clientWidth / 2
    let closestIndex = 0
    let closestDistance = Number.POSITIVE_INFINITY

    slides.forEach((slide, index) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2
      const distance = Math.abs(slideCenter - railCenter)
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    })

    setActiveIndex(closestIndex)
  }

  const clampedDotIndex = (() => {
    if (itemCount <= 3) return activeIndex
    if (activeIndex === 0) return 0
    if (activeIndex === itemCount - 1) return 2
    return 1
  })()

  return {
    railRef,
    activeIndex,
    clampedDotIndex,
    onScroll,
  }
}
