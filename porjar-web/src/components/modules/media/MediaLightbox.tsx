'use client'

import { useEffect, useCallback } from 'react'
import { X, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { sanitizeUrl } from '@/lib/utils'
import type { Media } from '@/types'

interface MediaLightboxProps {
  media: Media[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export function MediaLightbox({ media, currentIndex, onClose, onNavigate }: MediaLightboxProps) {
  const current = media[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < media.length - 1

  const handlePrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1)
  }, [hasPrev, currentIndex, onNavigate])

  const handleNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1)
  }, [hasNext, currentIndex, onNavigate])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose, handlePrev, handleNext])

  if (!current) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
      >
        <X size={24} />
      </button>

      {/* Navigation - Previous */}
      {hasPrev && (
        <button
          onClick={handlePrev}
          className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <CaretLeft size={28} weight="bold" />
        </button>
      )}

      {/* Navigation - Next */}
      {hasNext && (
        <button
          onClick={handleNext}
          className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <CaretRight size={28} weight="bold" />
        </button>
      )}

      {/* Content */}
      <div className="relative z-10 flex max-h-[90vh] max-w-[90vw] flex-col items-center">
        {current.file_type === 'image' ? (
          <img
            src={sanitizeUrl(current.file_url) || ''}
            alt={current.title || 'Media'}
            className="max-h-[80vh] max-w-full rounded-lg object-contain"
          />
        ) : (
          <div className="flex aspect-video w-full max-w-3xl items-center justify-center rounded-lg bg-slate-800">
            <a
              href={sanitizeUrl(current.file_url) || ''}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              Buka Video
            </a>
          </div>
        )}

        {/* Title & Description */}
        {(current.title || current.description) && (
          <div className="mt-4 max-w-2xl text-center">
            {current.title && (
              <h3 className="text-lg font-semibold text-white">{current.title}</h3>
            )}
            {current.description && (
              <p className="mt-1 text-sm text-slate-400">{current.description}</p>
            )}
          </div>
        )}

        {/* Counter */}
        <div className="mt-3 text-xs text-slate-500">
          {currentIndex + 1} / {media.length}
        </div>
      </div>
    </div>
  )
}
