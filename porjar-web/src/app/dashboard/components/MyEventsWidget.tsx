'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Trophy,
  CalendarBlank,
  Users,
  ArrowRight,
  ListChecks,
  TreeStructure,
} from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { AnimatedCard } from '@/components/shared/AnimatedCard'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { MyEventRegistration } from '@/types'

interface MyEventsWidgetProps {
  /**
   * Whether the user has at least one team. The parent dashboard uses a
   * single-team shape, so we take a boolean rather than a Team[] array.
   * When false, the widget renders nothing.
   */
  hasTeam: boolean
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Terbuka',
  ongoing: 'Berlangsung',
  completed: 'Selesai',
  archived: 'Arsip',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  ongoing: 'default',
  completed: 'outline',
  archived: 'outline',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

export function MyEventsWidget({ hasTeam }: MyEventsWidgetProps) {
  const [events, setEvents] = useState<MyEventRegistration[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let alive = true
    if (!hasTeam) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const data = await api.get<MyEventRegistration[]>('/my-events')
        if (!alive) return
        setEvents(Array.isArray(data) ? data : [])
      } catch {
        if (!alive) return
        setErrored(true)
        setEvents([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [hasTeam])

  if (!hasTeam) return null

  return (
    <AnimatedCard delay={100}>
      <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-esi-text">
            <Trophy size={18} weight="bold" className="text-esi-red" />
            Event Saya
          </h2>
          <Link
            href="/dashboard/events"
            className="text-xs font-semibold text-esi-red hover:underline"
          >
            Lihat semua
          </Link>
        </div>

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full bg-stone-100 dark:bg-zinc-800" />
            <Skeleton className="h-20 w-full bg-stone-100 dark:bg-zinc-800" />
          </div>
        )}

        {!loading && errored && (
          <div className="rounded-lg border border-dashed border-esi-border bg-esi-bg p-4 text-xs text-esi-muted">
            Gagal memuat event. Coba muat ulang halaman.
          </div>
        )}

        {!loading && !errored && events && events.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-esi-border bg-esi-bg px-4 py-6 text-center">
            <Trophy size={32} className="text-stone-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm font-medium text-esi-text">
              Kamu belum terdaftar di event manapun.
            </p>
            <Link
              href="/events"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-esi-red hover:underline"
            >
              Lihat Event Aktif <ArrowRight size={12} weight="bold" />
            </Link>
          </div>
        )}

        {!loading && !errored && events && events.length > 0 && (
          <div className="space-y-2.5">
            {events.slice(0, 4).map((reg) => {
              const startDate = formatDate(reg.event_start_date)
              return (
                <div
                  key={reg.id}
                  className="rounded-lg border border-esi-border bg-esi-bg p-3 transition-colors hover:border-esi-red/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/events/${reg.event_slug}`}
                        className="text-sm font-bold text-esi-text hover:text-esi-red line-clamp-1"
                      >
                        {reg.event_name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-esi-muted">
                        <span className="inline-flex items-center gap-1">
                          <Users size={12} />
                          <span className="truncate max-w-[160px]">{reg.team_name}</span>
                        </span>
                        {startDate && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarBlank size={12} />
                            {startDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={STATUS_VARIANT[reg.event_status] ?? 'secondary'}
                      className="shrink-0 text-[10px]"
                    >
                      {STATUS_LABELS[reg.event_status] ?? reg.event_status}
                    </Badge>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Link
                      href={`/events/${reg.event_slug}/schedule`}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-esi-border bg-white dark:bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-esi-text transition-colors hover:border-esi-red/40 hover:text-esi-red"
                    >
                      <ListChecks size={12} weight="bold" />
                      Lihat Jadwal
                    </Link>
                    <Link
                      href={`/events/${reg.event_slug}/tournaments`}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-esi-border bg-white dark:bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-esi-text transition-colors hover:border-esi-red/40 hover:text-esi-red"
                    >
                      <TreeStructure size={12} weight="bold" />
                      Lihat Bracket
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AnimatedCard>
  )
}
