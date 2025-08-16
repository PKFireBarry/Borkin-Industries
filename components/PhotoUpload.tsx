"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadFileToStorage } from "@/lib/firebase/storage"
import { Loader2, UploadCloud, Crop, RotateCcw } from "lucide-react"
import { ImageCropper } from "@/components/ui/image-cropper"

interface PhotoUploadProps {
  storagePath: string // e.g. `avatars/${userId}.jpg`
  onUpload: (url: string) => void
  label?: string
  initialUrl?: string
  disabled?: boolean
  enableCropping?: boolean
  aspectRatio?: number // 1 for square, 4/3 for landscape, etc.
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0-1, default 0.8
  previewSize?: 'sm' | 'md' | 'lg' | 'xl'
}

export function PhotoUpload({ 
  storagePath, 
  onUpload, 
  label = "Upload Photo", 
  initialUrl, 
  disabled,
  enableCropping = true,
  aspectRatio = 1,
  minWidth = 100,
  minHeight = 100,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8,
  previewSize = 'md'
}: PhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(initialUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewSizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24 sm:w-32 sm:h-32',
    lg: 'w-32 h-32 sm:w-48 sm:h-48 lg:w-56 lg:h-56',
    xl: 'w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96'
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      console.log('File selected:', f.name, 'enableCropping:', enableCropping)
      setFile(f)
      const url = URL.createObjectURL(f)
      setTempImageUrl(url)
      setPreview(url)
      setError(null)
      
      // If cropping is enabled, show cropper immediately
      if (enableCropping) {
        console.log('Setting showCropper to true')
        setShowCropper(true)
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) {
      setFile(f)
      const url = URL.createObjectURL(f)
      setTempImageUrl(url)
      setPreview(url)
      setError(null)
      
      // If cropping is enabled, show cropper immediately
      if (enableCropping) {
        setShowCropper(true)
      }
    }
  }

  const handleCrop = async (croppedImageUrl: string) => {
    // Update preview with the cropped image, but DO NOT replace tempImageUrl.
    // Keeping tempImageUrl as the original source allows re-cropping from the original.
    setPreview(croppedImageUrl)
    setShowCropper(false)
    
    // Convert the cropped image URL back to a File object and upload immediately
    try {
      const res = await fetch(croppedImageUrl)
      const blob = await res.blob()
      const croppedFile = new File([blob], file?.name || 'cropped-image.jpg', {
        type: 'image/jpeg'
      })
      setFile(croppedFile)
      
      // Auto-upload the cropped image
      setIsUploading(true)
      setError(null)
      const url = await uploadFileToStorage(croppedFile, storagePath)
      setPreview(url)
      onUpload(url)
    } catch (err) {
      console.error('Error processing and uploading cropped image:', err)
      setError('Failed to process and upload cropped image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setError(null)
    try {
      const url = await uploadFileToStorage(file, storagePath)
      setPreview(url)
      onUpload(url)
    } catch (err) {
      setError("Failed to upload photo. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRotate = () => {
    if (!tempImageUrl) return
    
    // Create a canvas to rotate the image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Swap width and height for 90-degree rotation
      canvas.width = img.height
      canvas.height = img.width
      
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(Math.PI / 2)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const rotatedUrl = URL.createObjectURL(blob)
            setTempImageUrl(rotatedUrl)
            setPreview(rotatedUrl)
            
            const rotatedFile = new File([blob], file?.name || 'rotated-image.jpg', {
              type: 'image/jpeg'
            })
            setFile(rotatedFile)
          }
        }, 'image/jpeg', quality)
      }
    }
    
    img.src = tempImageUrl
  }

  const handleRemove = () => {
    setFile(null)
    setPreview(initialUrl || null)
    setTempImageUrl(null)
    setError(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      
      <div
        className="relative flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary focus-within:border-primary transition-colors bg-muted/30"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        aria-label="Upload photo"
      >
        {preview ? (
          <div className="space-y-4">
            <div className="relative">
              <img 
                src={preview} 
                alt="Preview" 
                className={`${previewSizeClasses[previewSize]} object-cover rounded-full border shadow-lg`} 
              />
              
              {/* Quick action buttons */}
              {file && enableCropping && (
                <div className="absolute -top-2 -right-2 flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-8 h-8 p-0 rounded-full shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowCropper(true)
                    }}
                    title="Crop image"
                  >
                    <Crop className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-8 h-8 p-0 rounded-full shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRotate()
                    }}
                    title="Rotate image"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                {isUploading ? 'Uploading...' : 'Click to change or drag a new image'}
              </p>
              {isUploading && (
                <div className="flex justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <UploadCloud className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-700">Upload a photo</p>
              <p className="text-xs text-gray-500 mt-1">
                Drag & drop or click to select
                {enableCropping && <br />}
                {enableCropping && "Supports cropping and rotation"}
              </p>
            </div>
          </div>
        )}
        
        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />
      </div>
      
      {error && <div className="text-destructive text-xs mt-1">{error}</div>}
      
      {/* Image Cropper Dialog */}
      {(() => {
        console.log('PhotoUpload render - showCropper:', showCropper, 'tempImageUrl:', !!tempImageUrl)
        return showCropper && tempImageUrl && (
          <ImageCropper
            isOpen={showCropper}
            onClose={() => setShowCropper(false)}
            imageUrl={tempImageUrl}
            onCrop={handleCrop}
            aspectRatio={aspectRatio}
            minWidth={minWidth}
            minHeight={minHeight}
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            quality={quality}
          />
        )
      })()}
    </div>
  )
} 