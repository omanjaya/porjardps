'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Trophy,
  Users,
  CalendarBlank,
  ListBullets,
  TreeStructure,
  ChartBar,
  Shield,
  HashStraight,
  ClockCountdown,
  WarningCircle,
  List,
} from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { GAME_CONFIG } from '@/constants/games'
import { mediaUrl } from '@/lib/utils'
import { usePageAnimation } from '@/hooks/usePageAnimation'
import type { Tournament, Team, GameSlug } from '@/types'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Belum ditentukan'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatLabel(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function isBattleRoyale(format: string): boolean {
  return format === 'battle_royale_points'
}

// --- Slot Progress Bar helpers ---

function slotColor(pct: number): { bar: string; text: string } {
  if (pct >= 100) return { bar: 'from-red-600 to-red-500', text: 'text-red-600' }
  if (pct >= 90) return { bar: 'from-red-500 to-rose-400', text: 'text-red-500' }
  if (pct >= 70) return { bar: 'from-amber-500 to-yellow-400', text: 'text-amber-600' }
  return { bar: 'from-emerald-500 to-green-400', text: 'text-emerald-600' }
}

function SlotBadge({ registered, max }: { registered: number; max: number }) {
  const full = registered >= max
  if (full) {
    return (
      <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
        PENUH
      </span>
    )
  }
  return (
    <span className="rounded-full bg-porjar-red px-3 py-1 text-xs font-medium text-white">
      {registered} / {max} tim
    </span>
  )
}

function SlotProgressBar({ registered, max }: { registered: number; max: number }) {
  const pct = Math.min(100, Math.round((registered / max) * 100))
  const remaining = Math.max(0, max - registered)
  const { bar, text } = slotColor(pct)

  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-stone-700">
          {registered} / {max} tim terdaftar
        </span>
        {remaining > 0 ? (
          <span className={`font-semibold ${text}`}>{remaining} slot tersisa</span>
        ) : (
          <span className="font-bold text-red-600 uppercase tracking-wide">Penuh</span>
        )}
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${bar} transition-all duration-500`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={registered}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  usePageAnimation(containerRef, [loading])

  useEffect(() => {
    async function load() {
      try {
        const [t, teamList] = await Promise.all([
          api.get<Tournament>(`/tournaments/${params.id}`),
          api.get<Team[]>(`/tournaments/${params.id}/teams`).catch(() => [] as Team[]),
        ])
        setTournament(t)
        setTeams(teamList ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data turnamen')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  if (loading) {
    return (
      <PublicLayout>
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-xl bg-stone-100" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl bg-stone-100" />
            ))}
          </div>
          <Skeleton className="h-40 rounded-xl bg-stone-100" />
        </div>
      </PublicLayout>
    )
  }

  if (error || !tournament) {
    return (
      <PublicLayout>
        <EmptyState
          icon={WarningCircle}
          title={error ? 'Terjadi Kesalahan' : 'Turnamen Tidak Ditemukan'}
          description={error ?? 'Turnamen yang kamu cari tidak ada atau sudah dihapus.'}
        />
      </PublicLayout>
    )
  }

  const gameSlug = tournament.game?.slug as GameSlug | undefined
  const gameConfig = gameSlug ? GAME_CONFIG[gameSlug] : null
  const GameIcon = gameConfig?.icon ?? Trophy
  const gameLogo = gameConfig?.logo
  const brMode = isBattleRoyale(tournament.format)

  const infoCards = [
    {
      label: 'Best Of',
      value: `BO${tournament.best_of}`,
      icon: HashStraight,
    },
    {
      label: 'Maks Tim',
      value: tournament.max_teams ?? 'Unlimited',
      icon: Users,
    },
    {
      label: 'Registrasi',
      value: `${formatDate(tournament.registration_start)} - ${formatDate(tournament.registration_end)}`,
      icon: CalendarBlank,
    },
    {
      label: 'Pelaksanaan',
      value: `${formatDate(tournament.start_date)} - ${formatDate(tournament.end_date)}`,
      icon: ClockCountdown,
    },
  ]

  return (
    <PublicLayout>
      <PageHeader
        title=""
        breadcrumbs={[
          { label: 'Turnamen', href: '/tournaments' },
          { label: tournament.name },
        ]}
      />

      <div ref={containerRef}>
      {/* Hero Section */}
      <div className="anim-hero relative mb-8 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {/* Red top bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-porjar-red" />

        <div className="relative px-6 py-8 md:px-10 md:py-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            {/* Game logo */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-red-50 border border-porjar-red/20">
              {gameLogo ? (
                <Image src={gameLogo} alt={tournament.game?.name ?? ''} width={40} height={40} className="h-10 w-10 object-contain" />
              ) : (
                <GameIcon
                  size={36}
                  weight="duotone"
                  className="text-porjar-red"
                />
              )}
            </div>

            <div className="flex-1">
              <h1 className="mb-2 text-2xl font-bold text-stone-900 md:text-3xl">
                {tournament.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                {/* Game badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-porjar-red text-white">
                  <GameIcon size={12} weight="fill" />
                  {tournament.game?.name ?? 'Game'}
                </span>
                {/* Format badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 border border-stone-200">
                  <TreeStructure size={12} weight="fill" />
                  {formatLabel(tournament.format)}
                </span>
                {/* Status badge */}
                <StatusBadge status={tournament.status} />
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-2">
              {brMode ? (
                <Link href={`/tournaments/${tournament.id}/standings`}>
                  <Button className="gap-1.5 bg-porjar-red hover:bg-porjar-red-dark text-white">
                    <ChartBar size={16} weight="fill" />
                    Lihat Klasemen
                  </Button>
                </Link>
              ) : (
                <Link href={`/tournaments/${tournament.id}/bracket`}>
                  <Button className="gap-1.5 bg-porjar-red hover:bg-porjar-red-dark text-white">
                    <TreeStructure size={16} weight="fill" />
                    Lihat Bracket
                  </Button>
                </Link>
              )}
              <Link href={`/tournaments/${tournament.id}/schedule`}>
                <Button
                  variant="outline"
                  className="gap-1.5 border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                >
                  <CalendarBlank size={16} />
                  Jadwal
                </Button>
              </Link>
              {brMode && (
                <Link href={`/tournaments/${tournament.id}/lobbies`}>
                  <Button variant="outline" className="gap-1.5 border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900">
                    <List size={16} />
                    Hasil Lobby
                  </Button>
                </Link>
              )}
              <Link href={`/tournaments/${tournament.id}/report`}>
                <Button variant="outline" className="gap-1.5 border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900">
                  <ChartBar size={16} />
                  Laporan
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {infoCards.map((card) => {
          const CardIcon = card.icon
          return (
            <div
              key={card.label}
              className="anim-card rounded-xl border border-stone-200 bg-white p-4 shadow-sm border-l-4 border-l-porjar-red"
            >
              <div className="mb-2 flex items-center gap-2 text-stone-500">
                <CardIcon size={16} className="text-porjar-red" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {card.label}
                </span>
              </div>
              <p className="text-sm font-semibold text-stone-900">{card.value}</p>
            </div>
          )
        })}
      </div>

      {/* Rules Section */}
      {tournament.rules && (
        <div className="anim-section mb-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-stone-900">
            <ListBullets size={20} weight="bold" />
            Peraturan Turnamen
          </h2>
          <div className="prose prose-stone prose-sm max-w-none text-stone-600">
            <p className="whitespace-pre-wrap">{tournament.rules}</p>
          </div>
        </div>
      )}

      {/* Registered Teams */}
      <div className="anim-section rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
            <Shield size={20} weight="bold" />
            Tim Terdaftar
          </h2>
          {tournament.max_teams == null ? (
            <span className="rounded-full bg-porjar-red px-3 py-1 text-xs font-medium text-white">
              {teams.length} tim
            </span>
          ) : (
            <SlotBadge registered={teams.length} max={tournament.max_teams} />
          )}
        </div>

        {/* Slot progress bar — only when max_teams is set */}
        {tournament.max_teams != null && (
          <SlotProgressBar registered={teams.length} max={tournament.max_teams} />
        )}

        {teams.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Users size={40} weight="thin" className="mb-3 text-stone-300" />
            <p className="text-sm text-stone-500">Belum ada tim yang terdaftar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="anim-list-item flex items-center gap-4 rounded-lg border border-stone-200 bg-stone-50 p-3 transition-colors hover:bg-stone-100"
              >
                {/* Logo */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-stone-200">
                  {team.logo_url ? (
                    <Image
                      src={mediaUrl(team.logo_url)!}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-lg object-cover"
                      unoptimized
                    />
                  ) : (
                    <Shield size={20} className="text-stone-400" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-stone-900">
                      {team.name}
                    </span>
                    <StatusBadge status={team.status} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-stone-500">
                    {team.school && <span>{team.school.name}</span>}
                    <span className="flex items-center gap-1">
                      <Users size={10} />
                      {team.member_count} anggota
                    </span>
                  </div>
                </div>

                {/* Seed */}
                {team.seed != null && (
                  <span className="rounded-full bg-porjar-red px-2.5 py-0.5 text-xs font-bold text-white">
                    Seed #{team.seed}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
      </div>
    </PublicLayout>
  )
}
