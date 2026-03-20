'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Trophy,
  Medal,
  Users,
  CalendarBlank,
  Sword,
  Crown,
  ChartBar,
  Target,
  CheckCircle,
  ArrowLeft,
} from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { usePageAnimation } from '@/hooks/usePageAnimation'
import { cn } from '@/lib/utils'
import { mediaUrl } from '@/lib/utils'
import { GAME_CONFIG } from '@/constants/games'
import type { Tournament, Standing, BracketMatch, BRLobby, TeamSummary, GameSlug } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatLabel(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function daysBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const diff = new Date(end).getTime() - new Date(start).getTime()
  const days = Math.round(diff / (1000 * 60 * 60 * 24)) + 1
  return days > 0 ? days : 1
}

function TeamLogo({ team, size = 10 }: { team: TeamSummary; size?: number }) {
  const url = mediaUrl(team.logo_url ?? null)
  const px = size * 4
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg bg-stone-100 border border-stone-200 overflow-hidden',
        `h-${size} w-${size}`
      )}
    >
      {url ? (
        <Image
          src={url}
          alt={team.name}
          width={px}
          height={px}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <Users size={size * 1.6} className="text-stone-400" />
      )}
    </div>
  )
}

// ─── Podium Card ─────────────────────────────────────────────────────────────

interface PodiumCardProps {
  standing: Standing
  rank: 1 | 2 | 3
  isBR: boolean
}

function PodiumCard({ standing, rank, isBR }: PodiumCardProps) {
  const configs = {
    1: {
      border: 'border-yellow-400',
      bg: 'bg-yellow-50',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      rankText: 'text-yellow-600',
      labelColor: 'text-yellow-700',
      label: 'Juara 1',
      ringClass: 'ring-2 ring-yellow-300',
      icon: Crown,
      size: 'large',
    },
    2: {
      border: 'border-stone-300',
      bg: 'bg-stone-50',
      iconBg: 'bg-stone-100',
      iconColor: 'text-stone-500',
      rankText: 'text-stone-600',
      labelColor: 'text-stone-600',
      label: 'Runner Up',
      ringClass: 'ring-1 ring-stone-200',
      icon: Medal,
      size: 'medium',
    },
    3: {
      border: 'border-orange-300',
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      rankText: 'text-orange-600',
      labelColor: 'text-orange-700',
      label: 'Peringkat 3',
      ringClass: 'ring-1 ring-orange-200',
      icon: Trophy,
      size: 'medium',
    },
  }

  const cfg = configs[rank]
  const IconComp = cfg.icon

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border-2 p-5 shadow-sm transition-transform hover:-translate-y-0.5',
        cfg.border,
        cfg.bg,
        cfg.ringClass,
        rank === 1 && 'py-7'
      )}
    >
      {/* Rank icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          cfg.iconBg,
          rank === 1 ? 'h-12 w-12' : 'h-10 w-10'
        )}
      >
        <IconComp
          size={rank === 1 ? 26 : 22}
          weight="fill"
          className={cfg.iconColor}
        />
      </div>

      {/* Team logo */}
      <TeamLogo team={standing.team} size={rank === 1 ? 14 : 12} />

      {/* Team name */}
      <div className="text-center">
        <p
          className={cn(
            'font-bold text-stone-900 leading-tight',
            rank === 1 ? 'text-base' : 'text-sm'
          )}
        >
          {standing.team.name}
        </p>
        <p className={cn('mt-0.5 text-xs font-semibold', cfg.labelColor)}>{cfg.label}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-center">
        <div>
          <p className={cn('text-lg font-bold tabular-nums', cfg.rankText)}>
            {standing.total_points}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-stone-500">Poin</p>
        </div>
        <div className="h-8 w-px bg-stone-200" />
        {isBR ? (
          <div>
            <p className="text-lg font-bold tabular-nums text-stone-700">{standing.total_kills}</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-500">Kills</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-bold tabular-nums text-stone-700">{standing.wins}</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-500">Menang</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TournamentReportPage() {
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [matches, setMatches] = useState<BracketMatch[]>([])
  const [lobbies, setLobbies] = useState<BRLobby[]>([])
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  usePageAnimation(containerRef, [loading])

  useEffect(() => {
    async function load() {
      try {
        const [t, s, m, l, tm] = await Promise.all([
          api.get<Tournament>(`/tournaments/${params.id}`),
          api.get<Standing[]>(`/tournaments/${params.id}/standings`).catch(() => [] as Standing[]),
          api.get<BracketMatch[]>(`/tournaments/${params.id}/bracket`).catch(() => [] as BracketMatch[]),
          api.get<BRLobby[]>(`/tournaments/${params.id}/lobbies`).catch(() => [] as BRLobby[]),
          api.get<TeamSummary[]>(`/tournaments/${params.id}/teams`).catch(() => [] as TeamSummary[]),
        ])
        setTournament(t)
        setStandings((s ?? []).sort((a, b) => a.rank_position - b.rank_position))
        setMatches(m ?? [])
        setLobbies(l ?? [])
        setTeams(tm ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat laporan turnamen')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  // ── Loading skeleton
  if (loading) {
    return (
      <PublicLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 bg-stone-100" />
          <Skeleton className="h-52 w-full rounded-xl bg-stone-100" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-40 rounded-xl bg-stone-100" />
            <Skeleton className="h-48 rounded-xl bg-stone-100" />
            <Skeleton className="h-40 rounded-xl bg-stone-100" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl bg-stone-100" />
          <Skeleton className="h-32 w-full rounded-xl bg-stone-100" />
        </div>
      </PublicLayout>
    )
  }

  // ── Error / not found
  if (error || !tournament) {
    return (
      <PublicLayout>
        <EmptyState
          icon={Trophy}
          title={error ? 'Terjadi Kesalahan' : 'Turnamen Tidak Ditemukan'}
          description={error ?? 'Laporan turnamen tidak tersedia saat ini.'}
        />
      </PublicLayout>
    )
  }

  // ── Derived values
  const isBR = tournament.format === 'battle_royale_points'
  const isCompleted = tournament.status === 'completed'
  const top3 = standings.slice(0, 3)
  const top10 = standings.slice(0, 10)

  const gameSlug = tournament.game?.slug as GameSlug | undefined
  const gameConfig = gameSlug ? GAME_CONFIG[gameSlug] : null
  const GameIcon = gameConfig?.icon ?? Trophy
  const gameLogo = gameConfig?.logo

  // Bracket: completed matches only, most recent first, max 10
  const completedMatches = matches
    .filter((m) => m.status === 'completed')
    .sort((a, b) => {
      const tA = a.completed_at ? new Date(a.completed_at).getTime() : 0
      const tB = b.completed_at ? new Date(b.completed_at).getTime() : 0
      return tB - tA
    })
    .slice(0, 10)

  // Group completed matches by round
  const matchesByRound = completedMatches.reduce<Record<number, BracketMatch[]>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = []
    acc[m.round].push(m)
    return acc
  }, {})
  const roundKeys = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => b - a) // most recent round first

  // BR lobbies grouped by day
  const lobbyDays = [...new Set(lobbies.map((l) => l.day_number))].sort((a, b) => a - b)

  // Stats
  const totalKills = standings.reduce((sum, s) => sum + s.total_kills, 0)
  const totalMatches = isBR
    ? lobbies.filter((l) => l.status === 'completed').length
    : completedMatches.length
  const eventDays = daysBetween(tournament.start_date, tournament.end_date)

  return (
    <PublicLayout>
      <PageHeader
        title="Laporan Turnamen"
        breadcrumbs={[
          { label: 'Turnamen', href: '/tournaments' },
          { label: tournament.name, href: `/tournaments/${tournament.id}` },
          { label: 'Laporan' },
        ]}
        actions={
          <Link
            href={`/tournaments/${tournament.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50 hover:text-stone-900"
          >
            <ArrowLeft size={15} />
            Kembali
          </Link>
        }
      />

      <div ref={containerRef} className="space-y-8">

        {/* ── A. Tournament Hero Card ─────────────────────────────────────── */}
        <div className="anim-hero relative overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          {/* Top accent bar */}
          <div className="absolute inset-x-0 top-0 h-1 bg-porjar-red" />

          {/* Completed banner */}
          {isCompleted && (
            <div className="flex items-center justify-center gap-2 bg-porjar-red px-4 py-2 mt-1">
              <CheckCircle size={16} weight="fill" className="text-white" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">
                TURNAMEN SELESAI
              </span>
            </div>
          )}

          <div className="px-6 py-7 md:px-10 md:py-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
              {/* Game logo */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-porjar-red/20 bg-red-50">
                {gameLogo ? (
                  <Image
                    src={gameLogo}
                    alt={tournament.game?.name ?? ''}
                    width={48}
                    height={48}
                    className="h-12 w-12 object-contain"
                  />
                ) : (
                  <GameIcon size={40} weight="duotone" className="text-porjar-red" />
                )}
              </div>

              {/* Name + badges */}
              <div className="flex-1">
                <h2 className="mb-2 text-2xl font-bold text-stone-900 md:text-3xl">
                  {tournament.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-porjar-red px-3 py-1 text-xs font-semibold text-white">
                    <GameIcon size={11} weight="fill" />
                    {tournament.game?.name ?? 'Game'}
                  </span>
                  <StatusBadge status={tournament.status} />
                </div>

                {/* Info chips */}
                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    { icon: ChartBar, label: 'Format', value: formatLabel(tournament.format) },
                    { icon: Sword, label: 'Best Of', value: `BO${tournament.best_of}` },
                    { icon: Users, label: 'Total Tim', value: `${tournament.team_count} Tim` },
                    {
                      icon: CalendarBlank,
                      label: 'Tanggal',
                      value:
                        tournament.start_date
                          ? `${formatDate(tournament.start_date)}${tournament.end_date ? ` – ${formatDate(tournament.end_date)}` : ''}`
                          : 'Belum ditentukan',
                    },
                  ].map(({ icon: Ic, label, value }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
                    >
                      <Ic size={14} className="shrink-0 text-porjar-red" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-stone-400">{label}</p>
                        <p className="text-xs font-semibold text-stone-800">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ongoing note */}
            {!isCompleted && (
              <div className="mt-6 flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-600" />
                </span>
                <span className="text-sm text-cyan-800">
                  Turnamen sedang berlangsung — laporan ini akan diperbarui seiring berjalannya pertandingan.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── B. Podium / Top 3 ─────────────────────────────────────────── */}
        {top3.length >= 1 && (
          <div className="anim-section rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Crown size={20} weight="fill" className="text-yellow-500" />
              <h2 className="text-lg font-bold text-stone-900">Podium</h2>
            </div>

            {/* Podium layout: 2 - 1 - 3 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Rank 2 — left */}
              {top3[1] ? (
                <div className="sm:mt-4">
                  <PodiumCard standing={top3[1]} rank={2} isBR={isBR} />
                </div>
              ) : (
                <div />
              )}

              {/* Rank 1 — center, elevated */}
              {top3[0] && (
                <div className="sm:-mt-2">
                  <PodiumCard standing={top3[0]} rank={1} isBR={isBR} />
                </div>
              )}

              {/* Rank 3 — right */}
              {top3[2] ? (
                <div className="sm:mt-6">
                  <PodiumCard standing={top3[2]} rank={3} isBR={isBR} />
                </div>
              ) : (
                <div />
              )}
            </div>
          </div>
        )}

        {/* ── C. Full Standings Table (top 10) ──────────────────────────── */}
        {top10.length > 0 && (
          <div className="anim-section rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Trophy size={18} weight="fill" className="text-porjar-red" />
                <h2 className="text-base font-bold text-stone-900">Klasemen</h2>
              </div>
              <Link
                href={`/tournaments/${tournament.id}/standings`}
                className="text-xs font-medium text-porjar-red hover:underline"
              >
                Lihat semua →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="py-3 pl-6 pr-2 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 w-12">
                      #
                    </th>
                    <th className="py-3 px-2 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Tim
                    </th>
                    <th className="py-3 px-2 text-center text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Main
                    </th>
                    <th className="py-3 px-2 text-center text-xs font-semibold uppercase tracking-wider text-stone-500">
                      W
                    </th>
                    <th className="py-3 px-2 text-center text-xs font-semibold uppercase tracking-wider text-stone-500">
                      L
                    </th>
                    <th className="py-3 px-2 text-right text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Poin
                    </th>
                    {isBR && (
                      <th className="py-3 pl-2 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-stone-500">
                        Kills
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {top10.map((s) => {
                    const isGold = s.rank_position === 1
                    const isSilver = s.rank_position === 2
                    const isBronze = s.rank_position === 3
                    return (
                      <tr
                        key={s.team.id}
                        className={cn(
                          'transition-colors hover:bg-stone-50',
                          isGold && 'bg-yellow-50/60',
                          isSilver && 'bg-stone-50/80',
                          isBronze && 'bg-orange-50/60',
                          s.is_eliminated && 'opacity-50'
                        )}
                      >
                        <td className="py-3 pl-6 pr-2">
                          <div className="flex items-center gap-1.5">
                            {isGold && (
                              <Crown size={13} weight="fill" className="text-yellow-500" />
                            )}
                            {isSilver && (
                              <Medal size={13} weight="fill" className="text-stone-400" />
                            )}
                            {isBronze && (
                              <Trophy size={13} weight="fill" className="text-orange-500" />
                            )}
                            <span
                              className={cn(
                                'font-bold tabular-nums',
                                isGold && 'text-yellow-700',
                                isSilver && 'text-stone-600',
                                isBronze && 'text-orange-700',
                                !isGold && !isSilver && !isBronze && 'text-stone-500'
                              )}
                            >
                              {s.rank_position}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2.5">
                            <TeamLogo team={s.team} size={8} />
                            <span className="font-medium text-stone-900">{s.team.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center tabular-nums text-stone-500">
                          {s.matches_played}
                        </td>
                        <td className="py-3 px-2 text-center tabular-nums font-medium text-green-600">
                          {s.wins}
                        </td>
                        <td className="py-3 px-2 text-center tabular-nums font-medium text-red-500">
                          {s.losses}
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums font-bold text-porjar-red">
                          {s.total_points}
                        </td>
                        {isBR && (
                          <td className="py-3 pl-2 pr-6 text-right tabular-nums text-stone-600">
                            {s.total_kills}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {standings.length > 10 && (
              <div className="border-t border-stone-100 px-6 py-3 text-center">
                <Link
                  href={`/tournaments/${tournament.id}/standings`}
                  className="text-xs font-medium text-porjar-red hover:underline"
                >
                  Lihat {standings.length - 10} tim lainnya →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── D. Match Results (bracket) / Lobby Summary (BR) ──────────── */}
        {isBR ? (
          /* Battle Royale: per-day lobby summary */
          lobbies.length > 0 && (
            <div className="anim-section space-y-4">
              <div className="flex items-center gap-2">
                <Target size={18} weight="fill" className="text-porjar-red" />
                <h2 className="text-base font-bold text-stone-900">Ringkasan Lobby</h2>
              </div>

              {lobbyDays.map((day) => {
                const dayLobbies = lobbies.filter((l) => l.day_number === day)
                const completedDayLobbies = dayLobbies.filter((l) => l.status === 'completed')
                return (
                  <div
                    key={day}
                    className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden"
                  >
                    <div className="border-b border-stone-100 bg-stone-50 px-5 py-3">
                      <span className="text-sm font-semibold text-stone-700">Hari {day}</span>
                      <span className="ml-2 text-xs text-stone-400">
                        {completedDayLobbies.length}/{dayLobbies.length} lobby selesai
                      </span>
                    </div>
                    <div className="divide-y divide-stone-50">
                      {dayLobbies.map((lobby) => {
                        const topResults = (lobby.results ?? [])
                          .sort((a, b) => a.placement - b.placement)
                          .slice(0, 3)
                        const isLobbyDone = lobby.status === 'completed'
                        return (
                          <div key={lobby.id} className="px-5 py-4">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-sm font-medium text-stone-700">
                                {lobby.lobby_name}
                              </span>
                              <StatusBadge status={lobby.status} />
                            </div>
                            {isLobbyDone && topResults.length > 0 ? (
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                {topResults.map((r) => (
                                  <div
                                    key={r.team.id}
                                    className="flex items-center gap-3 rounded-lg bg-stone-50 border border-stone-100 px-3 py-2.5"
                                  >
                                    <span
                                      className={cn(
                                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                        r.placement === 1 && 'bg-yellow-100 text-yellow-700',
                                        r.placement === 2 && 'bg-stone-200 text-stone-600',
                                        r.placement === 3 && 'bg-orange-100 text-orange-700'
                                      )}
                                    >
                                      {r.placement}
                                    </span>
                                    <TeamLogo team={r.team} size={7} />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-medium text-stone-800">
                                        {r.team.name}
                                      </p>
                                      <p className="text-[10px] text-stone-400">
                                        {r.kills} kill · {r.total_points} pts
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : !isLobbyDone ? (
                              <p className="text-xs text-stone-400 italic">Belum ada hasil</p>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          /* Bracket: completed matches grouped by round */
          completedMatches.length > 0 && (
            <div className="anim-section space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sword size={18} weight="fill" className="text-porjar-red" />
                  <h2 className="text-base font-bold text-stone-900">Hasil Pertandingan</h2>
                </div>
                <Link
                  href={`/tournaments/${tournament.id}/bracket`}
                  className="text-xs font-medium text-porjar-red hover:underline"
                >
                  Lihat Bracket →
                </Link>
              </div>

              {roundKeys.map((round) => {
                const roundMatches = matchesByRound[round]
                const maxRound = Math.max(...matches.map((m) => m.round))
                const roundLabel =
                  round === maxRound
                    ? 'Grand Final'
                    : round === maxRound - 1
                    ? 'Semifinal'
                    : `Round ${round}`

                return (
                  <div
                    key={round}
                    className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden"
                  >
                    <div className="border-b border-stone-100 bg-stone-50 px-5 py-3">
                      <span className="text-sm font-semibold text-stone-700">{roundLabel}</span>
                    </div>
                    <div className="divide-y divide-stone-50">
                      {roundMatches.map((match) => {
                        const aWon = match.winner?.id === match.team_a?.id
                        const bWon = match.winner?.id === match.team_b?.id
                        return (
                          <div key={match.id} className="flex items-center gap-0 px-5 py-3">
                            {/* Team A */}
                            <div
                              className={cn(
                                'flex flex-1 items-center gap-2.5',
                                aWon && 'font-semibold'
                              )}
                            >
                              {match.team_a ? (
                                <>
                                  <TeamLogo team={match.team_a} size={8} />
                                  <span
                                    className={cn(
                                      'truncate text-sm',
                                      aWon ? 'text-stone-900' : 'text-stone-400'
                                    )}
                                  >
                                    {match.team_a.name}
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm italic text-stone-300">TBD</span>
                              )}
                            </div>

                            {/* Score */}
                            <div className="flex shrink-0 items-center gap-1.5 px-3">
                              <span
                                className={cn(
                                  'w-6 text-center text-base font-bold tabular-nums',
                                  aWon ? 'text-porjar-red' : 'text-stone-400'
                                )}
                              >
                                {match.score_a}
                              </span>
                              <span className="text-xs font-medium text-stone-300">–</span>
                              <span
                                className={cn(
                                  'w-6 text-center text-base font-bold tabular-nums',
                                  bWon ? 'text-porjar-red' : 'text-stone-400'
                                )}
                              >
                                {match.score_b}
                              </span>
                            </div>

                            {/* Team B */}
                            <div
                              className={cn(
                                'flex flex-1 items-center justify-end gap-2.5',
                                bWon && 'font-semibold'
                              )}
                            >
                              {match.team_b ? (
                                <>
                                  <span
                                    className={cn(
                                      'truncate text-sm',
                                      bWon ? 'text-stone-900' : 'text-stone-400'
                                    )}
                                  >
                                    {match.team_b.name}
                                  </span>
                                  <TeamLogo team={match.team_b} size={8} />
                                </>
                              ) : (
                                <span className="text-sm italic text-stone-300">TBD</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── E. Stats Summary ──────────────────────────────────────────── */}
        <div className="anim-section">
          <div className="mb-4 flex items-center gap-2">
            <ChartBar size={18} weight="fill" className="text-porjar-red" />
            <h2 className="text-base font-bold text-stone-900">Statistik Event</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              {
                icon: Sword,
                label: 'Total Pertandingan',
                value: totalMatches.toString(),
                desc: isBR ? 'lobby selesai' : 'match selesai',
              },
              {
                icon: Users,
                label: 'Total Tim',
                value: (teams.length || tournament.team_count).toString(),
                desc: 'tim berpartisipasi',
              },
              {
                icon: Target,
                label: 'Total Kill',
                value: totalKills > 0 ? totalKills.toString() : '—',
                desc: 'kill keseluruhan',
              },
              {
                icon: CalendarBlank,
                label: 'Durasi Event',
                value: eventDays != null ? `${eventDays} Hari` : '—',
                desc:
                  tournament.start_date && tournament.end_date
                    ? `${formatDate(tournament.start_date)} s/d ${formatDate(tournament.end_date)}`
                    : 'belum ditentukan',
              },
            ].map(({ icon: Ic, label, value, desc }) => (
              <div
                key={label}
                className="anim-card rounded-xl border border-stone-200 bg-white p-5 shadow-sm border-l-4 border-l-porjar-red"
              >
                <div className="mb-3 flex items-center gap-2 text-stone-400">
                  <Ic size={16} className="text-porjar-red" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
                </div>
                <p className="text-2xl font-bold text-stone-900 tabular-nums">{value}</p>
                <p className="mt-0.5 text-xs text-stone-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer link ─────────────────────────────────────────────────── */}
        <div className="anim-fade pb-4 text-center">
          <Link
            href={`/tournaments/${tournament.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition-colors hover:text-porjar-red"
          >
            <ArrowLeft size={14} />
            Kembali ke halaman turnamen
          </Link>
        </div>

      </div>
    </PublicLayout>
  )
}
