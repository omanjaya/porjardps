'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { MediaLightbox } from '@/components/modules/media/MediaLightbox'
import { Images } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Media } from '@/types'

export default function GalleryPage() {
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Media[]>('/media/highlights?limit=50')
        setMedia(data ?? [])
      } catch (err) {
        console.error('Gagal memuat galeri:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <PublicLayout>
      <PageHeader
        title="Galeri & Highlight"
        description="Kumpulan foto dan momen terbaik dari PORJAR Denpasar Esport 2026"
        breadcrumbs={[
          { label: 'Beranda', href: '/' },
          { label: 'Galeri' },
        ]}
      />

      {loading ? (
        <div className="columns-2 gap-3 space-y-3 md:columns-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton
              key={i}
              className="rounded-lg bg-stone-200"
              style={{ height: `${150 + Math.random() * 100}px` }}
            />
          ))}
        </div>
      ) : media.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-16 text-center shadow-sm">
          <Images size={56} weight="duotone" className="mb-4 text-stone-300" />
          <p className="text-stone-500">Belum ada highlight</p>
          <p className="mt-1 text-sm text-stone-400">
            Foto dan momen terbaik akan ditampilkan di sini
          </p>
        </div>
      ) : (
        <>
          {/* Masonry Grid */}
          <div className="columns-2 gap-3 space-y-3 md:columns-3">
            {media.map((item, index) => (
              <div
                key={item.id}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-stone-200 bg-white break-inside-avoid shadow-sm transition-all hover:border-stone-300 hover:shadow-md"
                onClick={() => setLightboxIndex(index)}
              >
                {item.file_type === 'image' ? (
                  <img
                    src={item.thumbnail_url || item.file_url}
                    alt={item.title || 'Media'}
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-stone-100">
                    <Images size={32} className="text-stone-400" />
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    {item.title && (
                      <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    )}
                    {item.description && (
                      <p className="mt-0.5 text-xs text-stone-200 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Highlight badge */}
                {item.is_highlight && (
                  <div className="absolute top-2 left-2 rounded-full bg-porjar-red px-2 py-0.5 text-[10px] font-bold text-white">
                    HIGHLIGHT
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Lightbox */}
          {lightboxIndex !== null && (
            <MediaLightbox
              media={media}
              currentIndex={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
              onNavigate={setLightboxIndex}
            />
          )}
        </>
      )}
    </PublicLayout>
  )
}
