'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { X, UploadSimple, Image as ImageIcon, CheckCircle } from '@phosphor-icons/react'
import type { MediaEntityType } from '@/types'

interface MediaUploadDialogProps {
  entityType?: MediaEntityType
  entityId?: string
  onClose: () => void
  onUploaded: () => void
}

interface UploadResult {
  url: string
  filename: string
  size: number
  mime_type: string
}

export function MediaUploadDialog({
  entityType = 'general',
  entityId,
  onClose,
  onUploaded,
}: MediaUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fileType, setFileType] = useState<'image' | 'video_link'>('image')
  const [videoUrl, setVideoUrl] = useState('')
  const [isHighlight, setIsHighlight] = useState(false)
  const [selectedEntityType, setSelectedEntityType] = useState<MediaEntityType>(entityType)
  const [selectedEntityId, setSelectedEntityId] = useState(entityId || '')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(selectedFile: File) {
    setFile(selectedFile)
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(selectedFile)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  async function handleSubmit() {
    setUploading(true)
    setProgress(10)

    try {
      let fileUrl = ''

      if (fileType === 'image' && file) {
        setProgress(30)
        const uploadResult = await api.upload<UploadResult>('/upload', file)
        fileUrl = uploadResult.url
        setProgress(70)
      } else if (fileType === 'video_link') {
        if (!videoUrl) {
          setUploading(false)
          return
        }
        fileUrl = videoUrl
        setProgress(50)
      }

      await api.post('/admin/media', {
        entity_type: selectedEntityType,
        entity_id: selectedEntityId || null,
        file_url: fileUrl,
        file_type: fileType,
        title: title || null,
        description: description || null,
        is_highlight: isHighlight,
        sort_order: 0,
      })

      setProgress(100)
      onUploaded()
    } catch {
      toast.error('Gagal mengupload media')
      setUploading(false)
      setProgress(0)
    }
  }

  const canSubmit = fileType === 'image' ? !!file : !!videoUrl

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-50">Upload Media</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* File type toggle */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFileType('image')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              fileType === 'image'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300'
            }`}
          >
            Gambar
          </button>
          <button
            onClick={() => setFileType('video_link')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              fileType === 'video_link'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300'
            }`}
          >
            Link Video
          </button>
        </div>

        {/* File picker / drag-drop zone */}
        {fileType === 'image' ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
              isDragging
                ? 'border-blue-400 bg-blue-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-40 rounded-lg object-contain"
                />
                <div className="mt-2 text-center text-xs text-slate-400">
                  {file?.name} ({((file?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                </div>
              </div>
            ) : (
              <>
                <ImageIcon size={40} className="mb-2 text-slate-600" />
                <p className="text-sm text-slate-400">
                  Drag & drop gambar, atau <span className="text-blue-400">klik untuk pilih</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">JPEG, PNG, WebP (max 10MB)</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileSelect(f)
              }}
            />
          </div>
        ) : (
          <div className="mb-4">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Title */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-400">Judul</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul media (opsional)"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500"
          />
        </div>

        {/* Description */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-400">Deskripsi</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi singkat (opsional)"
            rows={2}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none resize-none focus:border-blue-500"
          />
        </div>

        {/* Entity association (if not pre-set) */}
        {!entityId && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Tipe Entitas</label>
              <select
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value as MediaEntityType)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="general">Umum</option>
                <option value="match">Pertandingan</option>
                <option value="tournament">Turnamen</option>
                <option value="team">Tim</option>
                <option value="lobby">Lobby</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Entity ID</label>
              <input
                type="text"
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                placeholder="UUID (opsional)"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Highlight checkbox */}
        <label className="mb-4 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isHighlight}
            onChange={(e) => setIsHighlight(e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-300">Tandai sebagai Highlight</span>
        </label>

        {/* Progress bar */}
        {uploading && (
          <div className="mb-4 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Mengupload...
              </>
            ) : (
              <>
                <UploadSimple size={16} weight="bold" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
