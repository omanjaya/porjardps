'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { GameSelector } from '@/components/shared/GameSelector'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { GAME_CONFIG } from '@/constants/games'
import {
  Trophy,
  Users,
  CalendarBlank,
  ArrowRight,
  TreeStructure,
  ChartBar,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { usePageAnimation } from '@/hooks/usePageAnimation'
import type { Tournament, GameSlug, TournamentStatus } from '@/types'

const STATUS_OPTIONS: { value: TournamentStatus; label: string }[] = [
  { value: 'registration', label: 'Registrasi' },
  { value: 'ongoing', label: 'Berlangsung' },
  { value: 'upcoming', label: 'Akan Datang' },
  { value: 'completed', label: 'Selesai' },
]

interface TournamentsClientProps {
  initialTournaments: Tournament[]
  initialGames: { slug: GameSlug; name: string }[]
}

export function TournamentsClient({ initialTournaments, initialGames }: TournamentsClientProps) {
  const [activeGame, setActiveGame] = useState<GameSlug | null>(null)
  const [activeStatus, setActiveStatus] = useState<TournamentStatus | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = initialTournaments.filter((t) => {
    if (activeGame && t.game?.slug !== activeGame) return false
    if (activeStatus && t.status !== activeStatus) return false
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  usePageAnimation(containerRef, [filtered.length])

  return (
    <div ref={containerRef}>
      {/* Search & Filters */}
      <div className="mb-6 space-y-3">
        {/* Search */}
        <div className="relative max-w-sm">
          <MagnifyingGlass
            size={18}
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari turnamen..."
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-colors focus:border-porjar-red focus:ring-2 focus:ring-porjar-red/20"
          />
        </div>

        {/* Game tabs — horizontal scroll on mobile */}
        {initialGames.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              onClick={() => setActiveGame(null)}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-base font-semibold transition-colors ${
                activeGame === null
                  ? 'border-porjar-red bg-porjar-red text-white shadow-sm'
                  : 'border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              Semua
            </button>
            <GameSelector games={initialGames} activeSlug={activeGame} onSelect={setActiveGame} />
          </div>
        )}

        {/* Status filter — horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button
            onClick={() => setActiveStatus(null)}
            className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeStatus === null
                ? 'border-stone-700 bg-stone-900 text-white shadow-sm'
                : 'border-stone-200 text-stone-500 hover:bg-stone-50'
            }`}
          >
            Semua Status
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setActiveStatus(activeStatus === s.value ? null : s.value)}
              className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeStatus === s.value
                  ? 'border-porjar-red bg-porjar-red text-white shadow-sm'
                  : 'border-stone-200 text-stone-500 hover:bg-stone-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Belum Ada Turnamen"
          description="Turnamen akan ditampilkan di sini saat panitia membuka pendaftaran."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((tournament) => {
            const gameSlug = tournament.game?.slug as GameSlug | undefined
            const config = gameSlug ? GAME_CONFIG[gameSlug] : null
            const gameLogo = config?.logo

            return (
              <Link
                key={tournament.id}
                href={`/tournaments/${tournament.id}`}
                className="anim-list-item group block rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:border-porjar-red/30 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left */}
                  <div className="flex items-start gap-4">
                    {/* Game logo */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-50 border border-stone-200">
                      {gameLogo ? (
                        <Image src={gameLogo} alt={tournament.game?.name ?? ''} width={32} height={32} className="h-8 w-8 object-contain" />
                      ) : (
                        <Trophy size={24} weight="duotone" className="text-stone-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-stone-900 group-hover:text-porjar-red transition-colors">
                          {tournament.name}
                        </h3>
                        <StatusBadge status={tournament.status} />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 font-medium text-stone-600">
                          {tournament.format.replace(/_/g, ' ')}
                        </span>
                        <span className="font-medium">BO{tournament.best_of}</span>
                        <div className="flex items-center gap-1">
                          <Users size={12} />
                          <span>{tournament.team_count ?? 0} tim</span>
                        </div>
                        {tournament.start_date && (
                          <div className="flex items-center gap-1">
                            <CalendarBlank size={12} />
                            <span>
                              {new Date(tournament.start_date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 transition-colors group-hover:border-porjar-red/20 group-hover:text-porjar-red">
                      {tournament.game?.slug === 'ff' || tournament.game?.slug === 'pubgm' ? (
                        <>
                          <ChartBar size={14} />
                          Klasemen
                        </>
                      ) : (
                        <>
                          <TreeStructure size={14} />
                          Bracket
                        </>
                      )}
                      <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
