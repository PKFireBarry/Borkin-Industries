"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadFileToStorage } from "@/lib/firebase/storage"
import { Loader2, UploadCloud } from "lucide-react"

interface PhotoUploadProps {
  storagePath: string // e.g. `avatars/${userId}.jpg`
  onUpload: (url: string) => void
  label?: string
  initialUrl?: string
  disabled?: boolean
}

export function PhotoUpload({ storagePath, onUpload, label = "Upload Photo", initialUrl, disabled }: PhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(initialUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setPreview(URL.createObjectURL(f))
      setError(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) {
      setFile(f)
      setPreview(URL.createObjectURL(f))
      setError(null)
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

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <div
        className="relative flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-primary focus-within:border-primary transition-colors bg-muted/30"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        aria-label="Upload photo"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded-full mb-2 border" />
        ) : (
          <UploadCloud className="w-12 h-12 text-gray-400 mb-2" />
        )}
        <span className="text-xs text-gray-500">Drag & drop or click to select</span>
        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />
      </div>
      {file && !isUploading && (
        <Button type="button" onClick={handleUpload} className="mt-2 w-full" disabled={disabled}>
          Upload
        </Button>
      )}
      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
          <Loader2 className="animate-spin w-4 h-4" /> Uploading...
        </div>
      )}
      {error && <div className="text-destructive text-xs mt-1">{error}</div>}
    </div>
  )
} 