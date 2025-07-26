"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string
  objectPosition?: 'top' | 'center' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
)
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, alt = "", objectPosition = "center", ...props }, ref) => {
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

    return (
      <img
        ref={ref}
        className={cn(
          "aspect-square h-full w-full object-cover",
          getObjectPositionClass(objectPosition),
          className
        )}
        alt={alt}
        {...props}
      />
    )
  }
)
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  )
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
