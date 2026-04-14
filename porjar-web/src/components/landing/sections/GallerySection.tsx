'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Image as ImageIcon } from '@phosphor-icons/react'
import { resolveMediaUrl } from '@/lib/api'
import type { Media } from '@/types'
import { RED } from '../constants'

interface Props {
  galleryMedia: Media[]
}

export function GallerySection({ galleryMedia }: Props) {
  if (galleryMedia.length === 0) return null
  return (
    <section className="gallery-section mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 mb-2">
            <ImageIcon size={12} weight="duotone" style={{ color: RED }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600 dark:text-zinc-300">Galeri</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 dark:text-zinc-100">Momen Terbaik</h2>
        </div>
        <Link href="/gallery" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:brightness-110" style={{ background: RED }}>
          Lihat Galeri Lengkap <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {galleryMedia.map((m, i) => (
          <Link
            key={m.id}
            href="/gallery"
            className={`gallery-tile anim-card group relative aspect-[4/3] overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700 shadow-sm bg-stone-100 dark:bg-zinc-800 ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
          >
            <Image
              src={resolveMediaUrl(m.thumbnail_url || m.file_url) ?? ''}
              alt={m.title || 'Gallery'}
              fill
              sizes={i === 0 ? '(max-width: 640px) 100vw, 400px' : '(max-width: 640px) 50vw, 200px'}
              className="object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
              unoptimized
            />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {m.title && <span className="w-full truncate px-3 py-2 text-xs font-semibold text-white">{m.title}</span>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
