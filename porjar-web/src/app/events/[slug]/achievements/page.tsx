'use client'

import { useEffect, useState } from 'react'
import { Trophy, Medal, Star } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useEvent } from '@/contexts/EventContext'
import { api } from '@/lib/api'

interface AchievementItem {
  id: number
  title?: string
  name?: string
  description?: string
  recipient?: string
  team_name?: string
  rank?: number
  tournament_name?: string
  event_id?: string | number | null
}

export default function EventAchievementsPage() {
  const event = useEvent()
  const [items, setItems] = useState<AchievementItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<AchievementItem[] | { data?: AchievementItem[] }>(`/achievements?event_id=${event.id}&per_page=100`)
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: AchievementItem[] })?.data)
            ? (res as { data: AchievementItem[] }).data
            : []
        setItems(list.filter((a) => a.event_id == null || String(a.event_id) === String(event.id)))
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
            <Star size={22} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">Prestasi</h1>
            <p className="text-sm text-stone-500 dark:text-zinc-400">Pencapaian {event.name}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="h-40 rounded-xl bg-stone-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Trophy} title="Belum ada prestasi" description="Prestasi dan pencapaian tim akan muncul di sini setelah pertandingan selesai." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4"
            >
              <div className="flex items-start gap-3">
                <Medal size={26} style={{ color: event.primary_color }} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-stone-800 dark:text-zinc-100">
                    {a.title ?? a.name ?? `Achievement #${a.id}`}
                  </h3>
                  {(a.recipient ?? a.team_name) && (
                    <p className="text-xs font-semibold text-[var(--event-primary)] mt-0.5">
                      {a.recipient ?? a.team_name}
                    </p>
                  )}
                  {a.description && (
                    <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1.5 line-clamp-2">
                      {a.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
