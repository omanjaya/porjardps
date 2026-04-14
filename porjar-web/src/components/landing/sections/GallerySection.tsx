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
        <Link href="/gallery" className="inline-flex items-center gap-1 text-sm font-semibold transition hover:gap-2" style={{ color: RED }}>
          Galeri Lengkap <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {galleryMedia.map(m => (
          <Link
            key={m.id}
            href="/gallery"
            className="gallery-tile anim-card group relative aspect-square overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800"
          >
            <Image
              src={resolveMediaUrl(m.thumbnail_url || m.file_url) ?? ''}
              alt={m.title || 'Gallery'}
              fill
              sizes="(max-width: 640px) 50vw, 200px"
              className="object-cover transition-transform group-hover:scale-110"
              unoptimized
            />
          </Link>
        ))}
      </div>
    </section>
  )
}
