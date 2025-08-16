"use client"

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { ZoomIn, ZoomOut, Move, Check, X } from 'lucide-react'

interface ImageCropperProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  onCrop: (croppedImageUrl: string) => void
  aspectRatio?: number // 1 for square, 4/3 for landscape, etc.
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0-1, default 0.8
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export function ImageCropper({
  isOpen,
  onClose,
  imageUrl,
  onCrop,
  aspectRatio = 1,
  minWidth = 100,
  minHeight = 100,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
}: ImageCropperProps) {
  console.log('ImageCropper render - isOpen:', isOpen, 'imageUrl:', imageUrl?.substring(0, 50))
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null) // hidden source image
  const displayImageRef = useRef<HTMLImageElement>(null) // visible image for correct measurements
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 50, y: 50, width: 200, height: 200 })
  const [scale, setScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  // Load and setup image
  useEffect(() => {
    if (!isOpen || !imageUrl) return

    setIsLoading(true)
    setImageLoaded(false)
    
    const img = new Image()
    // Only set crossOrigin for external URLs, not blob URLs
    if (!imageUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous'
    }
    
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height })
      setImageLoaded(true)
      setIsLoading(false)
      // Reset zoom each time a new image loads
      setScale(1)
      
      // Initialize crop area based on container and aspect ratio
      setTimeout(() => {
        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect()
          const containerWidth = containerRect.width || 600
          const containerHeight = containerRect.height || 400
          
          // Calculate initial crop size maintaining aspect ratio - larger on desktop
          const isMobile = window.innerWidth < 640
          const cropSizeRatio = isMobile ? 0.7 : 0.5
          const maxCropSize = isMobile ? 250 : 350
          
          let cropWidth = Math.min(containerWidth * cropSizeRatio, maxCropSize)
          let cropHeight = cropWidth / aspectRatio
          
          if (cropHeight > containerHeight * cropSizeRatio) {
            cropHeight = containerHeight * cropSizeRatio
            cropWidth = cropHeight * aspectRatio
          }
          
          setCropArea({
            x: (containerWidth - cropWidth) / 2,
            y: (containerHeight - cropHeight) / 2,
            width: cropWidth,
            height: cropHeight
          })
        }
      }, 300) // Small delay to ensure container is rendered
    }
    img.onerror = (error) => {
      setIsLoading(false)
      console.error('Failed to load image:', imageUrl, error)
    }
    img.src = imageUrl
    
    if (imageRef.current) {
      imageRef.current.src = imageUrl
    }
  }, [isOpen, imageUrl, aspectRatio])

  // Get coordinates from mouse or touch event
  const getEventCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
  }

  // Handle mouse/touch events for dragging crop area
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const coords = getEventCoordinates(e)
    const x = coords.x - rect.left
    const y = coords.y - rect.top
    
    // Check if clicking/touching inside crop area
    if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setIsDragging(true)
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y })
      e.preventDefault()
    }
  }, [cropArea])

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const coords = getEventCoordinates(e)
    const x = coords.x - rect.left - dragStart.x
    const y = coords.y - rect.top - dragStart.y
    
    // Constrain to container bounds
    const maxX = rect.width - cropArea.width
    const maxY = rect.height - cropArea.height
    
    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y))
    }))
    e.preventDefault()
  }, [isDragging, dragStart, cropArea.width, cropArea.height])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  // Handle resize handles
  const handleResizePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent, handle: string) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    const coords = getEventCoordinates(e)
    setDragStart({ x: coords.x, y: coords.y })
    e.preventDefault()
  }, [])

  const handleResizePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isResizing || !resizeHandle || !containerRef.current) return
    
    const coords = getEventCoordinates(e)
    const deltaX = coords.x - dragStart.x
    const rect = containerRef.current.getBoundingClientRect()
    
    setCropArea(prev => {
      let newArea = { ...prev }
      
      switch (resizeHandle) {
        case 'se': // Southeast corner
          newArea.width = Math.max(minWidth, Math.min(rect.width - prev.x, prev.width + deltaX))
          newArea.height = newArea.width / aspectRatio
          break
        case 'sw': // Southwest corner
          const newWidth = Math.max(minWidth, prev.width - deltaX)
          newArea.x = Math.max(0, prev.x + prev.width - newWidth)
          newArea.width = newWidth
          newArea.height = newArea.width / aspectRatio
          break
        case 'ne': // Northeast corner
          newArea.width = Math.max(minWidth, Math.min(rect.width - prev.x, prev.width + deltaX))
          const newHeight = newArea.width / aspectRatio
          newArea.y = Math.max(0, prev.y + prev.height - newHeight)
          newArea.height = newHeight
          break
        case 'nw': // Northwest corner
          const newW = Math.max(minWidth, prev.width - deltaX)
          const newH = newW / aspectRatio
          newArea.x = Math.max(0, prev.x + prev.width - newW)
          newArea.y = Math.max(0, prev.y + prev.height - newH)
          newArea.width = newW
          newArea.height = newH
          break
      }
      
      // Ensure crop area stays within bounds
      if (newArea.x + newArea.width > rect.width) {
        newArea.width = rect.width - newArea.x
        newArea.height = newArea.width / aspectRatio
      }
      if (newArea.y + newArea.height > rect.height) {
        newArea.height = rect.height - newArea.y
        newArea.width = newArea.height * aspectRatio
      }
      
      return newArea
    })
    
    setDragStart({ x: coords.x, y: coords.y })
    e.preventDefault()
  }, [isResizing, resizeHandle, dragStart, aspectRatio, minWidth])

  // Handle zoom
  const handleZoom = useCallback((newScale: number[]) => {
    setScale(newScale[0])
  }, [])

  // Generate cropped image
  const generateCroppedImage = useCallback(() => {
    if (!imageRef.current || !canvasRef.current || !imageLoaded || !containerRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = imageRef.current

    if (!ctx) return

    // Compute mapping from visible image rect to natural image pixels
    const containerRect = containerRef.current.getBoundingClientRect()
    const imgRect = displayImageRef.current?.getBoundingClientRect()
    if (!imgRect) return

    const imgLeft = imgRect.left - containerRect.left
    const imgTop = imgRect.top - containerRect.top

    const scaleFactorX = imageDimensions.width / imgRect.width
    const scaleFactorY = imageDimensions.height / imgRect.height

    const sourceX = Math.max(0, (cropArea.x - imgLeft) * scaleFactorX)
    const sourceY = Math.max(0, (cropArea.y - imgTop) * scaleFactorY)
    const sourceWidth = Math.min(imageDimensions.width - sourceX, cropArea.width * scaleFactorX)
    const sourceHeight = Math.min(imageDimensions.height - sourceY, cropArea.height * scaleFactorY)

    // Set output canvas size based on source region, respecting constraints
    const outputWidth = Math.min(maxWidth, Math.max(minWidth, sourceWidth))
    const outputHeight = outputWidth / aspectRatio
    canvas.width = outputWidth
    canvas.height = outputHeight

    // Clear and draw
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    try {
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
      )
    } catch (error) {
      console.error('Error drawing image to canvas:', error)
    }

    // Convert to blob and create URL
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        onCrop(url)
        onClose()
      }
    }, 'image/jpeg', quality)
  }, [cropArea, imageDimensions, aspectRatio, maxWidth, minWidth, quality, onCrop, onClose, imageLoaded])

  // Add event listeners for both mouse and touch
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (isDragging || isResizing) {
        const syntheticEvent = {
          ...e,
          touches: 'touches' in e ? e.touches : undefined,
          clientX: 'clientX' in e ? e.clientX : undefined,
          clientY: 'clientY' in e ? e.clientY : undefined,
          preventDefault: () => e.preventDefault()
        } as any
        
        handlePointerMove(syntheticEvent)
        handleResizePointerMove(syntheticEvent)
      }
    }
    
    const handleGlobalEnd = () => {
      handlePointerUp()
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleGlobalMove)
      document.addEventListener('mouseup', handleGlobalEnd)
      document.addEventListener('touchmove', handleGlobalMove, { passive: false })
      document.addEventListener('touchend', handleGlobalEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMove)
      document.removeEventListener('mouseup', handleGlobalEnd)
      document.removeEventListener('touchmove', handleGlobalMove)
      document.removeEventListener('touchend', handleGlobalEnd)
    }
  }, [isDragging, isResizing, handlePointerMove, handleResizePointerMove, handlePointerUp])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col h-full">
          {/* Header with controls */}
          <div className="px-4 py-3 border-b bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Crop Image</h2>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Drag to move, resize corners, and zoom
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <ZoomOut className="w-4 h-4" />
                  <Slider
                    value={[scale]}
                    onValueChange={handleZoom}
                    min={0.5}
                    max={3}
                    step={0.1}
                    className="w-20 sm:w-24"
                  />
                  <ZoomIn className="w-4 h-4" />
                  <span className="text-xs text-muted-foreground min-w-[2.5rem]">
                    {Math.round(scale * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Crop Area - Takes remaining space */}
          <div className="flex-1 p-3 sm:p-4">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden w-full h-full min-h-[250px] sm:min-h-[350px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading image...</p>
                </div>
              </div>
            ) : !imageLoaded ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Failed to load image</p>
                  <Button variant="outline" onClick={onClose} className="mt-2">
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div
                ref={containerRef}
                className="relative w-full h-full cursor-move select-none touch-none"
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              >
                {/* Visible image for accurate sizing (object-contain) */}
                <img
                  ref={displayImageRef}
                  src={imageUrl}
                  alt="Crop preview"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
                />
                {/* Overlay - everything except crop area */}
                <div 
                  className="absolute inset-0 bg-black bg-opacity-50"
                  style={{
                    clipPath: `polygon(0% 0%, 0% 100%, ${cropArea.x}px 100%, ${cropArea.x}px ${cropArea.y}px, ${cropArea.x + cropArea.width}px ${cropArea.y}px, ${cropArea.x + cropArea.width}px ${cropArea.y + cropArea.height}px, ${cropArea.x}px ${cropArea.y + cropArea.height}px, ${cropArea.x}px 100%, 100% 100%, 100% 0%)`
                  }}
                />
                
                {/* Crop area border */}
                <div
                  className="absolute border-2 border-white shadow-lg pointer-events-none"
                  style={{
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height
                  }}
                />
                  
                {/* Resize handles */}
                <div
                  className="absolute w-4 h-4 bg-white border-2 border-blue-500 cursor-nw-resize touch-none rounded-full shadow-lg"
                  style={{ top: cropArea.y - 8, left: cropArea.x - 8 }}
                  onMouseDown={(e) => handleResizePointerDown(e, 'nw')}
                  onTouchStart={(e) => handleResizePointerDown(e, 'nw')}
                />
                <div
                  className="absolute w-4 h-4 bg-white border-2 border-blue-500 cursor-ne-resize touch-none rounded-full shadow-lg"
                  style={{ top: cropArea.y - 8, left: cropArea.x + cropArea.width - 8 }}
                  onMouseDown={(e) => handleResizePointerDown(e, 'ne')}
                  onTouchStart={(e) => handleResizePointerDown(e, 'ne')}
                />
                <div
                  className="absolute w-4 h-4 bg-white border-2 border-blue-500 cursor-sw-resize touch-none rounded-full shadow-lg"
                  style={{ top: cropArea.y + cropArea.height - 8, left: cropArea.x - 8 }}
                  onMouseDown={(e) => handleResizePointerDown(e, 'sw')}
                  onTouchStart={(e) => handleResizePointerDown(e, 'sw')}
                />
                <div
                  className="absolute w-4 h-4 bg-white border-2 border-blue-500 cursor-se-resize touch-none rounded-full shadow-lg"
                  style={{ top: cropArea.y + cropArea.height - 8, left: cropArea.x + cropArea.width - 8 }}
                  onMouseDown={(e) => handleResizePointerDown(e, 'se')}
                  onTouchStart={(e) => handleResizePointerDown(e, 'se')}
                />
                  
                {/* Center drag indicator */}
                <div 
                  className="absolute flex items-center justify-center pointer-events-none"
                  style={{
                    left: cropArea.x + cropArea.width / 2 - 12,
                    top: cropArea.y + cropArea.height / 2 - 12,
                    width: 24,
                    height: 24
                  }}
                >
                  <Move className="w-6 h-6 text-white opacity-75" />
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row gap-3 px-6 py-4 border-t bg-gray-50">
            <Button 
              type="button" 
              onClick={generateCroppedImage}
              disabled={isLoading || !imageLoaded}
              className="flex-1 sm:flex-none sm:order-2"
            >
              <Check className="w-4 h-4 mr-2" />
              Crop Image
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1 sm:flex-none sm:order-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>

          {/* Hidden elements */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Crop source"
            className="hidden"
            crossOrigin="anonymous"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </DialogContent>
    </Dialog>
  )
}