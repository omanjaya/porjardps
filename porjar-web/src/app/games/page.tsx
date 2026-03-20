'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight, Fire, Trophy } from '@phosphor-icons/react'
import { usePageAnimation } from '@/hooks/usePageAnimation'
import { GAME_CONFIG } from '@/constants/games'
import { cn } from '@/lib/utils'
import type { Game, GameSlug } from '@/types'

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  usePageAnimation(containerRef, [loading])

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Game[]>('/games')
        setGames((data ?? []).filter((g) => g.is_active))
      } catch (err) {
        console.error('Gagal memuat daftar game:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <PublicLayout>
      <div ref={containerRef}>
      {/* Hero Section */}
      <div className="anim-hero relative mb-10 overflow-hidden rounded-2xl border border-stone-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-porjar-red" />
        <div className="relative z-10">
          <h1 className="mb-2 text-3xl font-bold uppercase tracking-wide text-stone-900 md:text-4xl">
            Cabang{' '}
            <span className="text-porjar-red">
              E-Sport
            </span>
          </h1>
          <p className="text-stone-500">
            Pilih cabang e-sport untuk melihat turnamen dan jadwal pertandingan
          </p>
        </div>
      </div>

      {/* Games Grid */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl bg-stone-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {games.map((game) => {
            const config = GAME_CONFIG[game.slug as GameSlug]
            const activeTournaments = game.active_tournaments ?? 0
            const hasActiveTournament = activeTournaments > 0

            return (
              <Link
                key={game.id}
                href={`/games/${game.slug}`}
                className="anim-card group relative flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-porjar-red/30"
              >
                {/* Red top bar */}
                <div className="absolute inset-x-0 top-0 z-10 h-1 bg-porjar-red" />

                {/* Background image */}
                <div className="relative h-36 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundImage: `url(/images/games/${game.slug}-bg.webp)` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />

                  {/* Active tournament badge — more prominent */}
                  {hasActiveTournament && (
                    <span className="absolute right-2.5 top-3 z-10 flex items-center gap-1 rounded-full bg-porjar-red px-2.5 py-1 text-[10px] font-bold text-white shadow-md shadow-red-300/40 backdrop-blur-sm">
                      <Fire size={10} weight="fill" className="animate-pulse" />
                      {activeTournaments > 1
                        ? `${activeTournaments} Aktif`
                        : 'Berlangsung'}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col items-center p-5 pt-2 text-center">
                  {/* Game Logo */}
                  <div className="relative mb-3">
                    <img
                      src={config?.logo ?? `/images/games/${game.slug}-logo.webp`}
                      alt={game.name}
                      className="h-12 w-12 rounded-lg object-contain"
                    />
                    {/* Small trophy icon overlay when tournament is active */}
                    {hasActiveTournament && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 shadow-sm ring-2 ring-white">
                        <Trophy size={10} weight="fill" className="text-white" />
                      </span>
                    )}
                  </div>

                  <h3 className="mb-1 text-base font-bold text-stone-900 group-hover:text-porjar-red transition-colors">
                    {game.name}
                  </h3>

                  <p className="mb-1 text-xs text-stone-500">
                    {game.game_type === 'bracket' ? 'Bracket' : 'Battle Royale'} · {game.min_team_members}-{game.max_team_members} pemain
                  </p>

                  {/* Tournament status line */}
                  <div className="mb-3 min-h-[18px]">
                    {hasActiveTournament ? (
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        'bg-red-50 text-porjar-red border border-red-100'
                      )}>
                        <span className="h-1.5 w-1.5 rounded-full bg-porjar-red animate-pulse" />
                        {activeTournaments} turnamen sedang berjalan
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-400">Belum ada turnamen aktif</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs font-medium text-stone-400 group-hover:text-porjar-red transition-colors">
                    <span>Lihat Detail</span>
                    <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      </div>
    </PublicLayout>
  )
}
