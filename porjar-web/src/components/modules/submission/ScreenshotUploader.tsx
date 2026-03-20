'use client'

import { useState, useRef, useCallback } from 'react'
import { UploadSimple, X, Image as ImageIcon, Warning } from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ScreenshotUploaderProps {
  onUpload: (urls: string[]) => void
  maxFiles?: number
  className?: string
}

interface FileItem {
  id: string
  file: File
  preview: string
  progress: number
  url: string | null
  error: string | null
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
// 10MB raw limit — setelah kompresi ukurannya akan jauh lebih kecil
const MAX_SIZE = 10 * 1024 * 1024

// Konversi dan kompres gambar ke WebP di browser sebelum upload.
// Menghemat bandwidth dan storage server tanpa tambahan CPU load di backend.
async function compressToWebP(file: File, maxWidth = 1920, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const webpName = file.name.replace(/\.[^.]+$/, '.webp')
          resolve(new File([blob], webpName, { type: 'image/webp' }))
        },
        'image/webp',
        quality
      )
    }

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
    img.src = objectUrl
  })
}

export function ScreenshotUploader({ onUpload, maxFiles = 5, className }: ScreenshotUploaderProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Format tidak didukung. Gunakan JPG, PNG, atau WebP.'
    }
    if (file.size > MAX_SIZE) {
      return 'Ukuran file melebihi 10MB.'
    }
    return null
  }

  const uploadFile = async (item: FileItem) => {
    try {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 20 } : f))

      // Kompres ke WebP sebelum upload
      const compressed = await compressToWebP(item.file)
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 50 } : f))

      const result = await api.upload<{ url: string }>('/uploads/screenshot', compressed)

      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 100, url: result.url } : f))
      return result.url
    } catch {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, error: 'Gagal upload', progress: 0 } : f))
      return null
    }
  }

  const handleFiles = useCallback(async (newFiles: File[]) => {
    const remaining = maxFiles - files.length
    if (remaining <= 0) return

    const toAdd = newFiles.slice(0, remaining)
    const newItems: FileItem[] = toAdd.map(file => {
      const error = validateFile(file)
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: error ? '' : URL.createObjectURL(file),
        progress: error ? 0 : 10,
        url: null,
        error,
      }
    })

    setFiles(prev => [...prev, ...newItems])

    const validItems = newItems.filter(item => !item.error)
    const urls: string[] = []

    for (const item of validItems) {
      const url = await uploadFile(item)
      if (url) urls.push(url)
    }

    if (urls.length > 0) {
      const allUrls = [...files.filter(f => f.url).map(f => f.url!), ...urls]
      onUpload(allUrls)
    }
  }, [files, maxFiles, onUpload]) // eslint-disable-line react-hooks/exhaustive-deps

  const removeFile = (id: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id)
      const urls = updated.filter(f => f.url).map(f => f.url!)
      onUpload(urls)
      return updated
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors',
          isDragging
            ? 'border-porjar-red bg-porjar-red/5'
            : 'border-stone-300 bg-porjar-bg/50 hover:border-porjar-red/50 hover:bg-porjar-bg',
          files.length >= maxFiles && 'pointer-events-none opacity-50'
        )}
      >
        <UploadSimple size={32} weight="duotone" className="mb-2 text-porjar-red" />
        <p className="text-sm font-medium text-porjar-text">
          Drag & drop screenshot di sini
        </p>
        <p className="mt-1 text-xs text-porjar-muted">
          atau klik untuk pilih file (JPG, PNG, WebP, max 10MB)
        </p>
        <p className="mt-0.5 text-[10px] text-porjar-muted/70">
          Otomatis dikompresi ke WebP sebelum dikirim
        </p>
        <p className="mt-1 text-xs text-porjar-muted">
          {files.length}/{maxFiles} file
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {/* Thumbnails */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {files.map(item => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-lg border border-stone-200 bg-white"
            >
              {item.error ? (
                <div className="flex h-24 flex-col items-center justify-center gap-1 p-2">
                  <Warning size={20} className="text-porjar-red" />
                  <p className="text-center text-[10px] text-porjar-red">{item.error}</p>
                </div>
              ) : (
                <>
                  <img
                    src={item.preview}
                    alt="Preview"
                    className="h-24 w-full object-cover"
                  />
                  {/* Progress bar */}
                  {item.progress < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-200">
                      <div
                        className="h-full bg-porjar-red transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.progress === 100 && (
                    <div className="absolute bottom-1 right-1 rounded-full bg-green-500 p-0.5">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(item.id) }}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={12} weight="bold" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
