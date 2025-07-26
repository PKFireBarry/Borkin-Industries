/**
 * Image processing utilities for the application
 */

export interface ImageProcessingOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  aspectRatio?: number
}

export interface CropOptions {
  x: number
  y: number
  width: number
  height: number
  aspectRatio?: number
}

/**
 * Resize an image to fit within specified dimensions while maintaining aspect ratio
 */
export function resizeImage(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<File> {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 800,
      maxHeight = 800,
      quality = 0.8,
      format = 'jpeg'
    } = options

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      if (ctx) {
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: `image/${format}`
              })
              resolve(resizedFile)
            } else {
              reject(new Error('Failed to process image'))
            }
          },
          `image/${format}`,
          quality
        )
      } else {
        reject(new Error('Failed to get canvas context'))
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Crop an image to specified dimensions
 */
export function cropImage(
  file: File,
  cropOptions: CropOptions,
  options: ImageProcessingOptions = {}
): Promise<File> {
  return new Promise((resolve, reject) => {
    const {
      quality = 0.8,
      format = 'jpeg'
    } = options

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Set canvas to crop dimensions
      canvas.width = cropOptions.width
      canvas.height = cropOptions.height

      if (ctx) {
        // Draw cropped portion
        ctx.drawImage(
          img,
          cropOptions.x,
          cropOptions.y,
          cropOptions.width,
          cropOptions.height,
          0,
          0,
          cropOptions.width,
          cropOptions.height
        )

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const croppedFile = new File([blob], file.name, {
                type: `image/${format}`
              })
              resolve(croppedFile)
            } else {
              reject(new Error('Failed to process image'))
            }
          },
          `image/${format}`,
          quality
        )
      } else {
        reject(new Error('Failed to get canvas context'))
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Rotate an image by specified degrees
 */
export function rotateImage(
  file: File,
  degrees: number,
  options: ImageProcessingOptions = {}
): Promise<File> {
  return new Promise((resolve, reject) => {
    const {
      quality = 0.8,
      format = 'jpeg'
    } = options

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions for rotation
      const radians = (degrees * Math.PI) / 180
      const cos = Math.abs(Math.cos(radians))
      const sin = Math.abs(Math.sin(radians))
      
      const newWidth = img.width * cos + img.height * sin
      const newHeight = img.width * sin + img.height * cos

      canvas.width = newWidth
      canvas.height = newHeight

      if (ctx) {
        // Move to center and rotate
        ctx.translate(newWidth / 2, newHeight / 2)
        ctx.rotate(radians)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const rotatedFile = new File([blob], file.name, {
                type: `image/${format}`
              })
              resolve(rotatedFile)
            } else {
              reject(new Error('Failed to process image'))
            }
          },
          `image/${format}`,
          quality
        )
      } else {
        reject(new Error('Failed to get canvas context'))
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Get image dimensions
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): {
  isValid: boolean
  error?: string
} {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please select a valid image file (JPEG, PNG, WebP, or GIF)'
    }
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Image file size must be less than 10MB'
    }
  }

  return { isValid: true }
}

/**
 * Generate a data URL from a file
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      resolve(reader.result as string)
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Convert a data URL to a File object
 */
export function dataURLToFile(dataURL: string, filename: string, mimeType: string): File {
  const arr = dataURL.split(',')
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  
  return new File([u8arr], filename, { type: mimeType })
} 