'use client'

// Wiring: import NewsSection from '@/components/landing/sections/NewsSection'
// then render <NewsSection news={news} /> in src/app/page.tsx. Data comes from
// useLandingData().news.

import Link from 'next/link'
import { Newspaper, ArrowRight, CalendarBlank } from '@phosphor-icons/react'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDateShort } from '@/lib/relativeTime'

export type NewsItem = {
  id: number | string
  title: string
  excerpt: string
  date: string
  category?: string
  href?: string
  imageUrl?: string
}

interface NewsSectionProps {
  news: NewsItem[]
}

export default function NewsSection({ news }: NewsSectionProps) {
  if (news.length === 0) {
    return (
      <section className="news-section py-12 sm:py-16 lg:py-20 bg-esi-bg dark:bg-esi-bg-dark">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-10 text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-esi-fg dark:text-esi-fg-dark flex items-center justify-center gap-3">
              <Newspaper weight="fill" className="text-esi-red" />
              Berita &amp; Pengumuman
            </h2>
            <p className="mt-2 text-esi-muted dark:text-esi-muted-dark">
              Update terbaru dari ESI Kota Denpasar
            </p>
          </div>
          <EmptyState
            icon={Newspaper}
            title="Belum ada berita"
            description="Berita dan pengumuman terbaru akan tampil di sini."
          />
        </div>
      </section>
    )
  }

  const [featured, ...rest] = news

  return (
    <section className="news-section py-12 sm:py-16 lg:py-20 bg-esi-bg dark:bg-esi-bg-dark">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-esi-fg dark:text-esi-fg-dark flex items-center justify-center gap-3">
            <Newspaper weight="fill" className="text-esi-red" />
            Berita &amp; Pengumuman
          </h2>
          <p className="mt-2 text-sm sm:text-base text-esi-muted dark:text-esi-muted-dark">
            Update terbaru dari ESI Kota Denpasar
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Featured large card */}
          <NewsCard item={featured} featured />

          {/* Rest */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {rest.slice(0, 3).map(item => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function NewsCard({ item, featured = false }: { item: NewsItem; featured?: boolean }) {
  const href = item.href || '#'
  return (
    <Link
      href={href}
      className={`news-card anim-card group flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-esi-surface-dark border border-esi-border dark:border-esi-border-dark shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ${
        featured ? 'lg:row-span-2 lg:col-span-1' : ''
      }`}
    >
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.title}
          className={`w-full object-cover ${featured ? 'h-64 lg:h-80' : 'h-40'}`}
        />
      )}
      <div className="p-5 flex flex-col flex-1">
        {item.category && (
          <span className="inline-flex self-start items-center px-3 py-1 rounded-full text-xs font-bold bg-esi-red/15 text-esi-red mb-3">
            {item.category}
          </span>
        )}
        <h3
          className={`font-bold text-esi-fg dark:text-esi-fg-dark group-hover:text-esi-red transition-colors ${
            featured ? 'text-2xl' : 'text-lg'
          }`}
        >
          {item.title}
        </h3>
        <p
          className="mt-2 text-sm text-esi-muted dark:text-esi-muted-dark overflow-hidden"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
        >
          {item.excerpt}
        </p>
        <div className="mt-4 flex items-center justify-between text-xs text-esi-muted dark:text-esi-muted-dark">
          <span className="inline-flex items-center gap-1.5">
            <CalendarBlank weight="bold" />
            {formatDateShort(item.date)}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-esi-red group-hover:gap-2 transition-all">
            Baca selengkapnya
            <ArrowRight weight="bold" />
          </span>
        </div>
      </div>
    </Link>
  )
}
