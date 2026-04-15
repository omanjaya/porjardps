'use client'

import { useEffect, useState } from 'react'
import { Trophy, Medal } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useEvent } from '@/contexts/EventContext'
import { api } from '@/lib/api'
import type { SchoolStanding } from '@/types'

export default function EventSchoolStandingsPage() {
  const event = useEvent()
  const [standings, setStandings] = useState<SchoolStanding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<SchoolStanding[]>(`/school-standings?event_id=${event.id}`)
      .then((res) => {
        if (cancelled) return
        setStandings(Array.isArray(res) ? res : [])
      })
      .catch(() => setStandings([]))
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
            <Medal size={22} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">Klasemen Sekolah</h1>
            <p className="text-sm text-stone-500 dark:text-zinc-400">Perolehan medali {event.name}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl bg-stone-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : standings.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Belum ada klasemen"
          description="Klasemen akan muncul setelah pertandingan selesai."
        />
      ) : (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 dark:border-zinc-800 min-w-[320px]">
            <div className="col-span-1">#</div>
            <div className="col-span-6">Sekolah</div>
            <div className="col-span-2 text-right">Emas</div>
            <div className="col-span-2 text-right">Perak</div>
            <div className="col-span-1 text-right">Perunggu</div>
          </div>
          {standings.map((s, i) => (
            <div
              key={s.id}
              className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-stone-100 dark:border-zinc-800 last:border-0 min-w-[320px]"
            >
              <div className="col-span-1 font-bold text-stone-400">{i + 1}</div>
              <div className="col-span-6 font-semibold text-stone-800 dark:text-zinc-100 truncate">
                {s.name}
              </div>
              <div className="col-span-2 text-right font-bold text-amber-500 tabular-nums">
                {s.gold}
              </div>
              <div className="col-span-2 text-right font-bold text-stone-400 tabular-nums">
                {s.silver}
              </div>
              <div className="col-span-1 text-right font-bold text-amber-700 tabular-nums">
                {s.bronze}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </>
  )
}
