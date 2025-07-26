"use client"

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { RotateCcw, ZoomIn, ZoomOut, Move, Crop, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface TransformState {
  scale: number
  rotation: number
  translateX: number
  translateY: number
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
  console.log('ImageCropper render - isOpen:', isOpen, 'imageUrl:', imageUrl)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 })
  const [transform, setTransform] = useState<TransformState>({
    scale: 1,
    rotation: 0,
    translateX: 0,
    translateY: 0
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)

  // Initialize crop area when image loads
  useEffect(() => {
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current
      const container = containerRef.current
      
      img.onload = () => {
        const containerRect = container.getBoundingClientRect()
        const imgRect = img.getBoundingClientRect()
        
        // Calculate initial crop area
        const size = Math.min(containerRect.width * 0.8, containerRect.height * 0.8, 300)
        const x = (containerRect.width - size) / 2
        const y = (containerRect.height - size) / 2
        
        setCropArea({
          x,
          y,
          width: size,
          height: size
        })
        setIsLoading(false)
      }
    }
  }, [imageUrl])

  // Handle mouse/touch events for dragging crop area
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      
      // Check if clicking on crop area
      if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
          y >= cropArea.y && y <= cropArea.y + cropArea.height) {
        setIsDragging(true)
        setDragStart({ x: x - cropArea.x, y: y - cropArea.y })
      }
    }
  }, [cropArea])

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left - dragStart.x
    const y = clientY - rect.top - dragStart.y
    
    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(rect.width - prev.width, x)),
      y: Math.max(0, Math.min(rect.height - prev.height, y))
    }))
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  // Handle zoom
  const handleZoom = useCallback((delta: number) => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale + delta))
    }))
  }, [])

  // Handle rotation
  const handleRotate = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }))
  }, [])

  // Generate cropped image
  const generateCroppedImage = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = imageRef.current

    if (!ctx) return

    // Set canvas size to crop area
    canvas.width = cropArea.width
    canvas.height = cropArea.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate source coordinates
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height

    const sourceX = (cropArea.x - transform.translateX) * scaleX
    const sourceY = (cropArea.y - transform.translateY) * scaleY
    const sourceWidth = cropArea.width * scaleX
    const sourceHeight = cropArea.height * scaleY

    // Draw cropped image
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

    // Convert to blob and then to URL
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        onCrop(url)
        onClose()
      }
    }, 'image/jpeg', quality)
  }, [cropArea, transform, onCrop, onClose, quality])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'Enter':
          generateCroppedImage()
          break
        case '+':
        case '=':
          e.preventDefault()
          handleZoom(0.1)
          break
        case '-':
          e.preventDefault()
          handleZoom(-0.1)
          break
        case 'r':
          e.preventDefault()
          handleRotate()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleZoom, handleRotate, generateCroppedImage, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Crop Image</DialogTitle>
        </DialogHeader>
        
        <div className="p-8 text-center">
          <p className="text-lg mb-4">Image Cropper is working!</p>
          <p className="text-sm text-gray-600 mb-6">Image URL: {imageUrl.substring(0, 50)}...</p>
          
          <div className="space-y-4">
            <Button onClick={() => onCrop(imageUrl)}>
              Test Crop (Return Original)
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="button" onClick={() => onCrop(imageUrl)}>
            <Check className="w-4 h-4 mr-2" />
            Crop Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 