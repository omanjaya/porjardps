'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'

function convertToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const max = 512
      let { width, height } = img
      if (width > max || height > max) {
        const ratio = Math.min(max / width, max / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas not supported')); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('conversion failed'))
        },
        'image/webp',
        0.9,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
    img.src = url
  })
}

export function useLogoUpload(onUploaded: (url: string) => void) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setUploading(true)
    try {
      const webpBlob = await convertToWebP(file)
      const webpFile = new File([webpBlob], 'logo.webp', { type: 'image/webp' })
      const res = await api.upload<{ url: string }>('/upload', webpFile)
      if (res?.url) {
        onUploaded(res.url)
        toast.success('Logo berhasil diupload')
      }
    } catch {
      toast.error('Gagal mengupload logo')
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    setUploading(false)
    setDragOver(false)
  }

  return { uploading, dragOver, setDragOver, inputRef, upload, reset }
}
