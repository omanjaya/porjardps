'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Users, ArrowRight, MagnifyingGlass } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useEvent } from '@/contexts/EventContext'
import { api } from '@/lib/api'
import type { Tournament } from '@/types'

export default function EventTournamentsPage() {
  const event = useEvent()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<Tournament[] | { data?: Tournament[] }>(`/tournaments?event_id=${event.id}&per_page=100`)
      .then((res) => {
        if (cancelled) return
        const list: Tournament[] = Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: Tournament[] })?.data)
            ? (res as { data: Tournament[] }).data
            : []
        const filtered = list.filter((t) => {
          const eid = (t as unknown as { event_id?: string | number | null }).event_id
          return eid == null || String(eid) === String(event.id)
        })
        setTournaments(filtered)
      })
      .catch(() => setTournaments([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [event.id])

  const visible = tournaments.filter((t) =>
    !search ? true : t.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-esi-red/10">
            <Trophy size={22} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">Turnamen</h1>
            <p className="text-sm text-stone-500 dark:text-zinc-400">Daftar turnamen {event.name}</p>
          </div>
        </div>
      </div>

      <div className="relative mb-6">
        <MagnifyingGlass
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari turnamen..."
          className="w-full rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--event-primary)]"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="h-40 rounded-xl bg-stone-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Belum ada turnamen"
          description="Belum ada turnamen yang terdaftar untuk event ini."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="group flex flex-col rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 transition hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={18} style={{ color: event.primary_color }} />
                <StatusBadge status={t.status} />
              </div>
              <h3 className="font-bold text-stone-800 dark:text-zinc-100 line-clamp-2">
                {t.name}
              </h3>
              {t.game?.name && (
                <p className="text-xs text-stone-500 mt-1">{t.game.name}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {(t as unknown as { team_count?: number }).team_count ?? 0} tim
                </span>
                <span className="flex items-center gap-1 font-semibold text-[var(--event-primary)]">
                  Detail <ArrowRight size={12} weight="bold" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
