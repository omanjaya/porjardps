'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import {
  GameController,
  Trophy,
  Users,
  TreeStructure,
  ChartBar,
  CalendarBlank,
  ArrowLeft,
} from '@phosphor-icons/react'
import { usePageAnimation } from '@/hooks/usePageAnimation'
import { GAME_CONFIG } from '@/constants/games'
import type { Game, Tournament, GameSlug } from '@/types'

export default function GameDetailPage() {
  const params = useParams<{ slug: string }>()
  const [game, setGame] = useState<Game | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  usePageAnimation(containerRef, [loading])

  useEffect(() => {
    async function load() {
      try {
        const g = await api.get<Game>(`/games/${params.slug}`)
        setGame(g)
        try {
          const t = await api.get<Tournament[]>(`/tournaments?game_id=${g.id}`)
          setTournaments(t ?? [])
        } catch (err) {
          console.error('Gagal memuat turnamen:', err)
          setTournaments([])
        }
      } catch (err) {
        console.error('Gagal memuat data game:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.slug])

  if (loading) {
    return (
      <PublicLayout>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl bg-stone-100" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-xl bg-stone-100" />
            <Skeleton className="h-24 rounded-xl bg-stone-100" />
          </div>
          <Skeleton className="h-32 w-full rounded-xl bg-stone-100" />
          <Skeleton className="h-32 w-full rounded-xl bg-stone-100" />
        </div>
      </PublicLayout>
    )
  }

  if (!game) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <GameController size={48} weight="duotone" className="mb-4 text-stone-400" />
          <h2 className="text-lg font-semibold text-stone-900">Game tidak ditemukan</h2>
          <p className="mt-1 text-sm text-stone-500">Game yang kamu cari tidak tersedia.</p>
          <Link
            href="/games"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-porjar-red hover:text-porjar-red-dark transition-colors"
          >
            <ArrowLeft size={14} />
            Kembali ke daftar game
          </Link>
        </div>
      </PublicLayout>
    )
  }

  const slug = game.slug
  const config = GAME_CONFIG[slug]
  const gameLogo = config?.logo ?? `/images/games/${slug}-logo.webp`
  const gameBg = `/images/games/${slug}-bg.webp`

  const totalTeams = tournaments.reduce((sum, t) => sum + (t.team_count ?? 0), 0)
  const totalMatches = tournaments.length

  return (
    <PublicLayout>
      <div ref={containerRef}>
      {/* Back link */}
      <Link
        href="/games"
        className="anim-fade mb-4 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-porjar-red transition-colors"
      >
        <ArrowLeft size={14} />
        Semua Game
      </Link>

      {/* Hero Banner */}
      <div className="anim-hero relative mb-8 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {/* Background image */}
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${gameBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/70" />
        {/* Red top bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-porjar-red" />

        <div className="relative z-10 flex flex-col items-center gap-4 p-6 md:flex-row md:items-start md:gap-6 md:p-8">
          {/* Game Logo */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white border border-stone-200 shadow-sm">
            <Image src={gameLogo} alt={game.name} width={64} height={64} className="h-16 w-16 object-contain" />
          </div>

          {/* Game Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold text-stone-900 md:text-3xl">{game.name}</h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className="inline-flex items-center rounded-full border border-porjar-red/20 bg-red-50 px-3 py-1 text-xs font-semibold text-porjar-red">
                {game.game_type === 'bracket' ? 'Bracket' : 'Battle Royale'}
              </span>
              <span className="inline-flex items-center gap-1 text-sm text-stone-500">
                <Users size={14} weight="duotone" />
                {game.min_team_members}-{game.max_team_members} pemain
              </span>
              {game.max_substitutes > 0 && (
                <span className="text-sm text-stone-400">
                  +{game.max_substitutes} cadangan
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="anim-section mb-8 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <Users size={24} weight="duotone" className="text-porjar-red" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-stone-900">{totalTeams}</p>
            <p className="text-sm text-stone-500">Total Tim Terdaftar</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <Trophy size={24} weight="duotone" className="text-porjar-red" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-stone-900">{totalMatches}</p>
            <p className="text-sm text-stone-500">Turnamen</p>
          </div>
        </div>
      </div>

      {/* Tournaments List */}
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-500">
        Turnamen ({tournaments.length})
      </h2>

      {tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Belum Ada Turnamen"
          description={`Belum ada turnamen untuk ${game.name}.`}
        />
      ) : (
        <div className="space-y-3">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="anim-list-item rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-stone-300"
            >
              {/* Red left border accent based on status */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: Info */}
                <div className="min-w-0 flex-1 border-l-4 border-porjar-red pl-4">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-semibold text-stone-900">{tournament.name}</h3>
                    <StatusBadge status={tournament.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    {/* Format badge */}
                    <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 font-medium text-stone-700">
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
                          {tournament.end_date && (
                            <>
                              {' - '}
                              {new Date(tournament.end_date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-2">
                  {game.game_type === 'bracket' && (
                    <Link
                      href={`/tournaments/${tournament.id}/bracket`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-porjar-red px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-porjar-red-dark"
                    >
                      <TreeStructure size={14} weight="duotone" />
                      Lihat Bracket
                    </Link>
                  )}
                  <Link
                    href={`/tournaments/${tournament.id}/standings`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900"
                  >
                    <ChartBar size={14} weight="duotone" />
                    Lihat Klasemen
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </PublicLayout>
  )
}
