'use client'

import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import type { Event } from '@/types'
import { formatDateRange } from '@/lib/relativeTime'

interface Props {
  event: Event | null
}

export function ActiveEventBanner({ event }: Props) {
  if (!event || event.status !== 'ongoing') return null

  const dateRange = formatDateRange(event.start_date ?? undefined, event.end_date ?? undefined)

  return (
    <div
      className="relative z-40 mt-16 w-full text-white shadow-sm"
      style={{ background: 'linear-gradient(90deg, #A01822 0%, #C41E2A 50%, #A01822 100%)' }}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-2.5 sm:flex-row sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center sm:justify-start sm:text-left">
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <span className="text-[13px] font-bold uppercase tracking-wide">
            {event.name}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
            Sedang Berlangsung
          </span>
          {dateRange && (
            <span className="text-[12px] font-medium opacity-90">· {dateRange}</span>
          )}
        </div>
        <Link
          href={`/events/${event.slug}/tournaments`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-bold backdrop-blur-sm transition hover:bg-white/25"
        >
          Lihat Bracket
          <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
    </div>
  )
}
