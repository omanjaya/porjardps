'use client'

import { useEffect, useState } from 'react'
import { CalendarBlank, Clock, MapPin } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useEvent } from '@/contexts/EventContext'
import { api } from '@/lib/api'

interface ScheduleItem {
  id: number
  title?: string
  match_name?: string
  scheduled_at?: string
  start_time?: string
  venue?: string
  location?: string
  tournament_id?: number
  event_id?: string | number | null
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
            return (
              <div
                key={s.id}
                className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <CalendarBlank
                    size={20}
                    style={{ color: event.primary_color }}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-stone-800 dark:text-zinc-100">
                      {s.title ?? s.match_name ?? `Match #${s.id}`}
                    </h3>
                    {where && (
                      <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                        <MapPin size={12} /> {where}
                      </p>
                    )}
                  </div>
                </div>
                {when && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-zinc-400">
                    <Clock size={12} />
                    {new Date(when).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
