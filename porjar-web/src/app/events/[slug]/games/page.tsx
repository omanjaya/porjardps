'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GameController, ArrowRight } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useEvent } from '@/contexts/EventContext'
import { api } from '@/lib/api'
import type { Tournament, Game } from '@/types'

export default function EventGamesPage() {
  const event = useEvent()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.get<Game[]>('/games').catch(() => [] as Game[]),
      api
        .get<Tournament[] | { data?: Tournament[] }>(`/tournaments?event_id=${event.id}&per_page=100`)
        .catch(() => [] as Tournament[]),
    ])
      .then(([allGames, tRes]) => {
        if (cancelled) return
        const tournaments: Tournament[] = Array.isArray(tRes)
          ? tRes
          : Array.isArray((tRes as { data?: Tournament[] })?.data)
            ? (tRes as { data: Tournament[] }).data
            : []
        const eventGameSlugs = new Set(
          tournaments
            .filter((t) => {
              const eid = (t as unknown as { event_id?: string | number | null }).event_id
              return eid == null || String(eid) === String(event.id)
            })
            .map((t) => t.game?.slug)
            .filter(Boolean),
        )
        const filtered = eventGameSlugs.size > 0
          ? (allGames ?? []).filter((g) => eventGameSlugs.has(g.slug))
          : (allGames ?? [])
        setGames(filtered)
      })
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
            <GameController size={22} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">Cabang Game</h1>
            <p className="text-sm text-stone-500 dark:text-zinc-400">Cabang esport {event.name}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="h-40 rounded-xl bg-stone-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <EmptyState
          icon={GameController}
          title="Belum ada cabang game"
          description="Belum ada cabang game yang terdaftar untuk event ini."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {games.map((g) => (
            <Link
              key={g.slug}
              href={`/games/${g.slug}`}
              className="group flex flex-col items-center gap-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 transition hover:shadow-md hover:-translate-y-0.5"
            >
              <GameController size={32} style={{ color: event.primary_color }} />
              <span className="font-bold text-center text-stone-800 dark:text-zinc-100">
                {g.name}
              </span>
              <span className="text-xs font-semibold text-[var(--event-primary)] flex items-center gap-1">
                Lihat <ArrowRight size={12} weight="bold" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
