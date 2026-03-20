'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { MediaLightbox } from './MediaLightbox'
import { cn } from '@/lib/utils'
import type { Media } from '@/types'

interface HighlightCarouselProps {
  autoPlay?: boolean
  interval?: number
  limit?: number
}

export function HighlightCarousel({
  autoPlay = true,
  interval = 5000,
  limit = 10,
}: HighlightCarouselProps) {
  const [highlights, setHighlights] = useState<Media[]>([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Media[]>(`/media/highlights?limit=${limit}`)
        setHighlights(data ?? [])
      } catch (err) {
        console.error('Gagal memuat highlight:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [limit])

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % highlights.length)
  }, [highlights.length])

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + highlights.length) % highlights.length)
  }, [highlights.length])

  // Auto-play
  useEffect(() => {
    if (!autoPlay || highlights.length <= 1 || isHovered) return
    timerRef.current = setInterval(goNext, interval)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoPlay, interval, highlights.length, isHovered, goNext])

  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-2xl bg-stone-100" />
    )
  }

  if (highlights.length === 0) return null

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides */}
      <div className="relative aspect-[21/9] w-full overflow-hidden">
        {highlights.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              'absolute inset-0 transition-all duration-700 ease-in-out cursor-pointer',
              index === current ? 'opacity-100 translate-x-0' : index < current ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'
            )}
            onClick={() => setLightboxIndex(index)}
          >
            {item.file_type === 'image' ? (
              <img
                src={item.file_url}
                alt={item.title || 'Highlight'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-stone-100">
                <span className="text-stone-400">Video Highlight</span>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            {/* Title overlay */}
            {item.title && (
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-lg font-bold text-white md:text-xl">{item.title}</h3>
                {item.description && (
                  <p className="mt-1 text-sm text-slate-300 line-clamp-2">{item.description}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation arrows (on hover) */}
      {highlights.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            style={{ opacity: isHovered ? 1 : 0 }}
          >
            <CaretLeft size={22} weight="bold" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            style={{ opacity: isHovered ? 1 : 0 }}
          >
            <CaretRight size={22} weight="bold" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {highlights.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {highlights.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                index === current ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
              )}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <MediaLightbox
          media={highlights}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  )
}
