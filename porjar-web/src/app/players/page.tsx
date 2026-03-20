'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { MagnifyingGlass, Users, Shield, GameController } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// Consistent avatar color based on name hash
const AVATAR_COLORS = [
  'bg-red-100 text-red-700',
  'bg-orange-100 text-orange-700',
  'bg-amber-100 text-amber-700',
  'bg-lime-100 text-lime-700',
  'bg-emerald-100 text-emerald-700',
  'bg-teal-100 text-teal-700',
  'bg-sky-100 text-sky-700',
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-pink-100 text-pink-700',
]
function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

interface PlayerSummary {
  id: string
  full_name: string
  avatar_url: string | null
  team_name?: string | null
  game_name?: string | null
  game_slug?: string | null
}

interface PlayersResponse {
  data: PlayerSummary[]
  total: number
  page: number
  limit: number
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const limit = 24

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) })
      if (q) params.set('search', q)
      const res = await api.get<PlayersResponse>(`/players?${params}`)
      setPlayers(res?.data ?? [])
      setTotal(res?.total ?? 0)
    } catch (err) {
      console.error('Gagal memuat pemain:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(query, page)
  }, [query, page, load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setQuery(search)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <PublicLayout>
      <PageHeader title="Direktori Pemain" description={`${total} pemain terdaftar`} />

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama pemain..."
            className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-9 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-porjar-red focus:outline-none focus:ring-1 focus:ring-porjar-red"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-porjar-red px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Cari
        </button>
      </form>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-stone-100 bg-white p-4">
              <Skeleton className="h-14 w-14 rounded-full bg-stone-100" />
              <Skeleton className="h-3 w-16 rounded bg-stone-100" />
              <Skeleton className="h-2.5 w-12 rounded bg-stone-100" />
            </div>
          ))}
        </div>
      ) : players.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Pemain Tidak Ditemukan"
          description={query ? `Tidak ada pemain dengan nama "${query}"` : 'Belum ada pemain terdaftar.'}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {players.map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className={cn(
                  'group flex flex-col items-center gap-2 rounded-xl border border-stone-200 bg-white p-4 text-center shadow-sm',
                  'transition-all duration-200 hover:border-porjar-red/30 hover:shadow-md hover:scale-[1.03]',
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full ring-2 ring-stone-200 overflow-hidden transition-all group-hover:ring-porjar-red/30',
                  !player.avatar_url && getAvatarColor(player.full_name),
                )}>
                  {player.avatar_url ? (
                    <img
                      src={player.avatar_url}
                      alt={player.full_name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold leading-none">
                      {player.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name */}
                <span className="line-clamp-2 text-xs font-semibold text-stone-800 group-hover:text-porjar-red transition-colors leading-snug">
                  {player.full_name}
                </span>

                {/* Team + Game info (if available) */}
                {(player.team_name || player.game_name) && (
                  <div className="flex flex-col items-center gap-0.5 w-full">
                    {player.team_name && (
                      <span className="flex items-center gap-1 text-[10px] text-stone-400 truncate max-w-full">
                        <Shield size={9} weight="fill" className="shrink-0 text-stone-300" />
                        <span className="truncate">{player.team_name}</span>
                      </span>
                    )}
                    {player.game_name && (
                      <span className="flex items-center gap-1 text-[10px] text-stone-400 truncate max-w-full">
                        <GameController size={9} className="shrink-0 text-stone-300" />
                        <span className="truncate">{player.game_name}</span>
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 disabled:opacity-40 hover:bg-stone-50"
              >
                Prev
              </button>
              <span className="text-sm text-stone-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 disabled:opacity-40 hover:bg-stone-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </PublicLayout>
  )
}
