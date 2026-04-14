'use client'

import { useEffect, useState } from 'react'
import { CalendarBlank, Clock, MapPin, GameController } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useEvent } from '@/contexts/EventContext'
import { api } from '@/lib/api'

interface ScheduleItem {
  id: number
  title?: string
  match_name?: string
  tournament_name?: string
  scheduled_at?: string
  start_time?: string
  venue?: string
  location?: string
  tournament_id?: number
  event_id?: string | number | null
  game_name?: string
}

export default function EventSchedulePage() {
  const event = useEvent()
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<ScheduleItem[] | { data?: ScheduleItem[] }>(`/schedules?event_id=${event.id}&per_page=200`)
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: ScheduleItem[] })?.data)
            ? (res as { data: ScheduleItem[] }).data
            : []
        setItems(list.filter((s) => s.event_id == null || String(s.event_id) === String(event.id)))
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
            <CalendarBlank size={22} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">Jadwal Pertandingan</h1>
            <p className="text-sm text-stone-500 dark:text-zinc-400">Jadwal match {event.name}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl bg-stone-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarBlank}
          title="Belum ada jadwal"
          description="Belum ada jadwal pertandingan untuk event ini."
        />
      ) : (
        <div className="space-y-3">
          {items.map((s) => {
            const when = s.scheduled_at ?? s.start_time
            const where = s.venue ?? s.location
            const displayName = s.title ?? s.match_name ?? s.tournament_name ?? `Match #${s.id}`
            const borderColor = event.primary_color ?? '#ef4444'
            return (
              <div
                key={s.id}
                className="rounded-xl border border-stone-200 dark:border-zinc-700 border-l-[3px] bg-white dark:bg-zinc-900 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all hover:shadow-sm"
                style={{ borderLeftColor: borderColor }}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${borderColor}15` }}
                  >
                    <GameController
                      size={18}
                      weight="duotone"
                      style={{ color: borderColor }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-800 dark:text-zinc-100 truncate">
                      {displayName}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {s.game_name && (
                        <span className="text-xs font-medium text-stone-500 dark:text-zinc-400">
                          {s.game_name}
                        </span>
                      )}
                      {where && (
                        <span className="text-xs text-stone-500 dark:text-zinc-400 flex items-center gap-1">
                          <MapPin size={12} className="shrink-0" /> {where}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {when && (
                  <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-stone-100 dark:bg-zinc-800 px-3 py-1.5">
                    <Clock size={14} className="text-stone-500 dark:text-zinc-400" />
                    <span className="font-mono text-sm font-bold text-stone-700 dark:text-zinc-300">
                      {new Date(when).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
