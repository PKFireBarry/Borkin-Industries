"use client"

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Image as ImageIcon } from 'lucide-react'

interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  fallback?: string
  aspectRatio?: 'square' | 'video' | 'photo' | 'wide' | 'custom'
  customAspectRatio?: string // e.g., "16/9", "4/3"
  objectPosition?: 'top' | 'center' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  sizes?: string // e.g., "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  loading?: 'lazy' | 'eager'
  placeholder?: 'blur' | 'empty' | 'shimmer'
  blurDataURL?: string
  className?: string
  containerClassName?: string
  onLoad?: () => void
  onError?: () => void
}

const aspectRatioClasses = {
  square: 'aspect-square',
  video: 'aspect-video',
  photo: 'aspect-[4/3]',
  wide: 'aspect-[16/9]',
  custom: ''
}

export function ResponsiveImage({
  src,
  alt,
  fallback,
  aspectRatio = 'square',
  customAspectRatio,
  objectPosition = 'center',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  loading = 'lazy',
  placeholder = 'empty',
  blurDataURL,
  className,
  containerClassName,
  onLoad,
  onError,
  ...props
}: ResponsiveImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const imgRef = useRef<HTMLImageElement>(null)

  const getObjectPositionClass = (position: string) => {
    switch (position) {
      case 'top': return 'object-top'
      case 'center': return 'object-center'
      case 'bottom': return 'object-bottom'
      case 'left': return 'object-left'
      case 'right': return 'object-right'
      case 'top-left': return 'object-top object-left'
      case 'top-right': return 'object-top object-right'
      case 'bottom-left': return 'object-bottom object-left'
      case 'bottom-right': return 'object-bottom object-right'
      default: return 'object-center'
    }
  }

  const getAspectRatioClass = () => {
    if (aspectRatio === 'custom' && customAspectRatio) {
      return `aspect-[${customAspectRatio}]`
    }
    return aspectRatioClasses[aspectRatio]
  }

  useEffect(() => {
    setCurrentSrc(src)
    setIsLoading(true)
    setHasError(false)
  }, [src])

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    
    if (fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback)
      setIsLoading(true)
      setHasError(false)
    } else {
      onError?.()
    }
  }

  const handleRetry = () => {
    setHasError(false)
    setIsLoading(true)
    if (imgRef.current) {
      imgRef.current.src = currentSrc
    }
  }

  return (
    <div className={cn(
      'relative overflow-hidden',
      getAspectRatioClass(),
      containerClassName
    )}>
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          {placeholder === 'shimmer' ? (
            <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
          ) : placeholder === 'blur' && blurDataURL ? (
            <img
              src={blurDataURL}
              alt=""
              className="w-full h-full object-cover filter blur-sm scale-110"
            />
          ) : (
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          )}
        </div>
      )}

      {/* Error state */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
          <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
          <p className="text-xs text-gray-500 text-center px-2">Failed to load image</p>
          <button
            onClick={handleRetry}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        loading={loading}
        sizes={sizes}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          getObjectPositionClass(objectPosition),
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  )
}

// Specialized components for common use cases
export function AvatarImage({
  src,
  alt,
  fallback,
  size = 'md',
  className,
  ...props
}: Omit<ResponsiveImageProps, 'aspectRatio' | 'sizes'> & {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  }

  return (
    <div className={cn('relative overflow-hidden rounded-full', sizeClasses[size])}>
      <ResponsiveImage
        src={src}
        alt={alt}
        fallback={fallback}
        aspectRatio="square"
        objectPosition="center"
        className={cn('rounded-full', className)}
        {...props}
      />
    </div>
  )
}

export function ProfileImage({
  src,
  alt,
  fallback,
  size = 'lg',
  className,
  ...props
}: Omit<ResponsiveImageProps, 'aspectRatio' | 'sizes'> & {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40',
    '2xl': 'w-48 h-48'
  }

  return (
    <div className={cn('relative overflow-hidden rounded-full border-4 border-white shadow-lg', sizeClasses[size])}>
      <ResponsiveImage
        src={src}
        alt={alt}
        fallback={fallback}
        aspectRatio="square"
        objectPosition="center"
        className={cn('rounded-full', className)}
        {...props}
      />
    </div>
  )
}

export function CardImage({
  src,
  alt,
  fallback,
  aspectRatio = 'video',
  className,
  ...props
}: Omit<ResponsiveImageProps, 'sizes'>) {
  return (
    <ResponsiveImage
      src={src}
      alt={alt}
      fallback={fallback}
      aspectRatio={aspectRatio}
      objectPosition="center"
      className={cn('rounded-lg', className)}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      {...props}
    />
  )
} 