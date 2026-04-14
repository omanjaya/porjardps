'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Images, Image as ImageIcon } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useEvent } from '@/contexts/EventContext'
import { api, resolveMediaUrl } from '@/lib/api'

interface MediaItem {
  id: number
  url?: string
  thumbnail_url?: string
  title?: string
  caption?: string
  event_id?: string | number | null
}

export default function EventGalleryPage() {
  const event = useEvent()
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<MediaItem[] | { data?: MediaItem[] }>(`/media?event_id=${event.id}&per_page=100`)
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: MediaItem[] })?.data)
            ? (res as { data: MediaItem[] }).data
            : []
        setItems(list.filter((m) => m.event_id == null || String(m.event_id) === String(event.id)))
      })
      .catch(() => setItems([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [event.id])

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-esi-red/10">
            <ImageIcon size={22} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">Galeri</h1>
            <p className="text-sm text-stone-500 dark:text-zinc-400">Foto & video {event.name}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <Skeleton key={i} className="aspect-square rounded-xl bg-stone-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Images} title="Galeri kosong" description="Belum ada foto atau video yang diunggah." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((m) => {
            const src = resolveMediaUrl(m.thumbnail_url ?? m.url) ?? ''
            return (
              <div
                key={m.id}
                className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800"
              >
                {src && (
                  <Image
                    src={src}
                    alt={m.title ?? m.caption ?? 'Media'}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
