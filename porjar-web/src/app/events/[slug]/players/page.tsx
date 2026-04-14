'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, MagnifyingGlass, UserCircle } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useEvent } from '@/contexts/EventContext'
import { api } from '@/lib/api'

interface PlayerSummary {
  id: number
  name?: string
  display_name?: string
  ign?: string
  team_name?: string
  school_name?: string
}

export default function EventPlayersPage() {
  const event = useEvent()
  const [players, setPlayers] = useState<PlayerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<PlayerSummary[] | { data?: PlayerSummary[] }>(`/players?event_id=${event.id}&per_page=200`)
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: PlayerSummary[] })?.data)
            ? (res as { data: PlayerSummary[] }).data
            : []
        setPlayers(list)
      })
      .catch(() => setPlayers([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [event.id])

  const visible = players.filter((p) => {
    const name = p.display_name ?? p.name ?? p.ign ?? ''
    return !search ? true : name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-esi-red/10">
            <UserCircle size={22} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">Daftar Pemain</h1>
            <p className="text-sm text-stone-500 dark:text-zinc-400">Pemain peserta {event.name}</p>
          </div>
        </div>
      </div>

      <div className="relative mb-6">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari pemain..."
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
        <EmptyState icon={Users} title="Belum ada pemain" description="Belum ada pemain yang terdaftar." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((p) => (
            <Link
              key={p.id}
              href={`/players/${p.id}`}
              className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 hover:shadow-md transition flex items-center gap-3"
            >
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: event.primary_color }}
              >
                {(p.display_name ?? p.name ?? p.ign ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-stone-800 dark:text-zinc-100 truncate text-sm">
                  {p.display_name ?? p.name ?? p.ign ?? 'Unknown'}
                </h3>
                {p.team_name && <p className="text-xs text-stone-500 truncate">{p.team_name}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
