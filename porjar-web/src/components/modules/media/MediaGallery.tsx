'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Images, Trash, PencilSimple, Star, Plus } from '@phosphor-icons/react'
import { MediaLightbox } from './MediaLightbox'
import { MediaUploadDialog } from './MediaUploadDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, sanitizeUrl } from '@/lib/utils'
import type { Media, MediaEntityType } from '@/types'

interface MediaGalleryProps {
  entityType: MediaEntityType
  entityId: string
  isAdmin?: boolean
}

export function MediaGallery({ entityType, entityId, isAdmin = false }: MediaGalleryProps) {
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function loadMedia() {
    try {
      const data = await api.get<Media[]>(
        `/media?entity_type=${entityType}&entity_id=${entityId}`
      )
      setMedia(data ?? [])
    } catch (err) {
      console.error('Gagal memuat media:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId])

  async function handleDelete(id: string) {
    if (!confirm('Hapus media ini?')) return
    try {
      await api.delete(`/admin/media/${id}`)
      setMedia((prev) => prev.filter((m) => m.id !== id))
    } catch {
      toast.error('Gagal menghapus media')
    }
  }

  async function handleToggleHighlight(item: Media) {
    try {
      const updated = await api.put<Media>(`/admin/media/${item.id}`, {
        is_highlight: !item.is_highlight,
      })
      setMedia((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    } catch {
      toast.error('Gagal mengubah highlight')
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-video rounded-lg bg-stone-100" />
        ))}
      </div>
    )
  }

  if (media.length === 0 && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-stone-100/80 p-10 text-center">
        <Images size={40} weight="duotone" className="mb-3 text-stone-300" />
        <p className="text-sm text-stone-500">Belum ada media</p>
      </div>
    )
  }

  return (
    <div>
      {/* Admin upload button */}
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <Plus size={16} weight="bold" />
            Upload Media
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {media.map((item, index) => (
          <div
            key={item.id}
            className="group relative cursor-pointer overflow-hidden rounded-lg border border-stone-200 bg-white transition-all hover:border-stone-300 hover:scale-[1.02]"
            onClick={() => setLightboxIndex(index)}
          >
            {item.file_type === 'image' ? (
              <img
                src={sanitizeUrl(item.thumbnail_url || item.file_url) || ''}
                alt={item.title || 'Media'}
                className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-stone-100">
                <Images size={32} className="text-stone-400" />
              </div>
            )}

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
              {item.title && (
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                </div>
              )}
            </div>

            {/* Highlight badge */}
            {item.is_highlight && (
              <div className="absolute top-2 left-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-black">
                HIGHLIGHT
              </div>
            )}

            {/* Admin actions */}
            {isAdmin && (
              <div
                className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => handleToggleHighlight(item)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                    item.is_highlight
                      ? 'bg-amber-500 text-black'
                      : 'bg-stone-100/90 text-stone-600 hover:bg-amber-500 hover:text-black'
                  )}
                  title="Toggle Highlight"
                >
                  <Star size={14} weight={item.is_highlight ? 'fill' : 'regular'} />
                </button>
                <button
                  onClick={() => setEditingId(item.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100/90 text-stone-600 transition-colors hover:bg-blue-500 hover:text-white"
                  title="Edit"
                >
                  <PencilSimple size={14} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100/90 text-stone-600 transition-colors hover:bg-red-500 hover:text-white"
                  title="Hapus"
                >
                  <Trash size={14} />
                </button>
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

      {/* Upload Dialog */}
      {showUpload && (
        <MediaUploadDialog
          entityType={entityType}
          entityId={entityId}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false)
            loadMedia()
          }}
        />
      )}
    </div>
  )
}
