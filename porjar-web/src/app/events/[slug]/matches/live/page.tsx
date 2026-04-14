'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Broadcast, Lightning } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useEvent } from '@/contexts/EventContext'
import { api } from '@/lib/api'

interface LiveMatch {
  id: number
  name?: string
  team_a_name?: string
  team_b_name?: string
  score_a?: number
  score_b?: number
  tournament_id?: number
  tournament_name?: string
  event_id?: string | number | null
}

export default function EventLiveMatchesPage() {
  const event = useEvent()
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<LiveMatch[] | { data?: LiveMatch[] }>(`/matches/live?event_id=${event.id}`)
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: LiveMatch[] })?.data)
            ? (res as { data: LiveMatch[] }).data
            : []
        setMatches(list.filter((m) => m.event_id == null || String(m.event_id) === String(event.id)))
      })
      .catch(() => setMatches([]))
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
            <Lightning size={22} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">Match Live</h1>
            <p className="text-sm text-stone-500 dark:text-zinc-400">Pertandingan berlangsung</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="h-40 rounded-xl bg-stone-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={Broadcast}
          title="Tidak ada pertandingan live"
          description="Saat ini belum ada pertandingan yang sedang berlangsung."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((m) => (
            <Link
              key={m.id}
              href={`/matches/${m.id}`}
              className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 hover:shadow-md transition"
            >
              <p className="text-xs font-semibold text-stone-400 mb-2">
                {m.tournament_name ?? `Tournament #${m.tournament_id ?? ''}`}
              </p>
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-stone-800 dark:text-zinc-100 flex-1 truncate">
                  {m.team_a_name ?? 'TBD'}
                </span>
                <span className="text-2xl font-black tabular-nums" style={{ color: event.primary_color }}>
                  {m.score_a ?? 0} - {m.score_b ?? 0}
                </span>
                <span className="font-bold text-stone-800 dark:text-zinc-100 flex-1 truncate text-right">
                  {m.team_b_name ?? 'TBD'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
