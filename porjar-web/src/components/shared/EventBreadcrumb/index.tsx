'use client'

import Link from 'next/link'
import { CaretLeft, Trophy, CalendarBlank, CaretRight } from '@phosphor-icons/react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDateShort } from '@/lib/relativeTime'

interface EventBreadcrumbProps {
  eventSlug: string
  eventName: string
  eventStatus: string
  startDate?: string | null
  endDate?: string | null
  currentPage?: string
}

function formatDateRange(start?: string | null, end?: string | null): string | null {
  if (!start && !end) return null
  if (start && end) {
    const s = new Date(start)
    const e = new Date(end)
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
    if (sameMonth) {
      return `${s.getDate()}-${e.getDate()} ${e.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`
    }
    return `${formatDateShort(s)} - ${formatDateShort(e)}`
  }
  return formatDateShort((start ?? end) as string)
}

export function EventBreadcrumb({
  eventSlug,
  eventName,
  eventStatus,
  startDate,
  endDate,
  currentPage,
}: EventBreadcrumbProps) {
  const dateRange = formatDateRange(startDate, endDate)

  return (
    <div className="border-b border-esi-border bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-2">
        {/* Desktop: single row */}
        <div className="hidden md:flex items-center gap-3 text-xs text-stone-600 dark:text-zinc-400">
          <Link
            href="/"
            className="flex items-center gap-1 font-medium text-stone-500 dark:text-zinc-500 transition-colors hover:text-[var(--event-primary)]"
          >
            <CaretLeft size={12} weight="bold" />
            <span>Kembali ke Beranda</span>
          </Link>

          <span className="text-stone-300 dark:text-zinc-700">|</span>

          <Link
            href={`/events/${eventSlug}`}
            className="flex items-center gap-1.5 font-semibold text-stone-800 dark:text-zinc-200 transition-colors hover:text-[var(--event-primary)]"
          >
            <Trophy size={14} weight="fill" className="text-[var(--event-primary)]" />
            <span className="truncate max-w-[200px]">{eventName}</span>
          </Link>

          <StatusBadge status={eventStatus} />

          {dateRange && (
            <>
              <span className="text-stone-300 dark:text-zinc-700">|</span>
              <span className="flex items-center gap-1.5">
                <CalendarBlank size={13} weight="regular" className="text-stone-400" />
                <span>{dateRange}</span>
              </span>
            </>
          )}

          {currentPage && (
            <>
              <span className="ml-auto flex items-center gap-1.5 font-medium text-stone-700 dark:text-zinc-300">
                <CaretRight size={12} weight="bold" className="text-stone-400" />
                <span>{currentPage}</span>
              </span>
            </>
          )}
        </div>

        {/* Mobile: stacked */}
        <div className="md:hidden flex flex-col gap-1.5 text-[11px] text-stone-600 dark:text-zinc-400">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/"
              className="flex items-center gap-1 font-medium text-stone-500 dark:text-zinc-500"
            >
              <CaretLeft size={11} weight="bold" />
              <span>Beranda</span>
            </Link>
            {currentPage && (
              <span className="flex items-center gap-1 font-medium text-stone-700 dark:text-zinc-300 truncate">
                <CaretRight size={11} weight="bold" className="text-stone-400 shrink-0" />
                <span className="truncate">{currentPage}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/events/${eventSlug}`}
              className="flex items-center gap-1 font-semibold text-stone-800 dark:text-zinc-200"
            >
              <Trophy size={12} weight="fill" className="text-[var(--event-primary)]" />
              <span className="truncate max-w-[140px]">{eventName}</span>
            </Link>
            <StatusBadge status={eventStatus} className="text-[10px] px-2 py-0" />
            {dateRange && (
              <span className="flex items-center gap-1 text-stone-500 dark:text-zinc-500">
                <CalendarBlank size={11} className="text-stone-400" />
                <span>{dateRange}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
