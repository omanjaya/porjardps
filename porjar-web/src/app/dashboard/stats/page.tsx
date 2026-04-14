'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Trophy,
  Sword,
  XCircle,
  ChartBar,
  GameController,
  Medal,
  Crosshair,
  Skull,
  Handshake,
  Star,
  ArrowRight,
  Clock,
  Crown,
} from '@phosphor-icons/react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { EmptyState } from '@/components/shared/EmptyState'
import { EmptyStateIllustration } from '@/components/shared/EmptyStateIllustration'
import { AchievementBadge } from '@/components/modules/player/AchievementBadge'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  PlayerProfile,
  GameStatsItem,
  BracketMatch,
} from '@/types'

interface MyMatchesData {
  team: {
    id: string
    name: string
    game_name: string
    game_slug: string
    school_name: string
  } | null
  current_match: BracketMatch | null
  upcoming_matches: BracketMatch[]
  past_matches: BracketMatch[]
  bracket_path: string[]
  submissions: { match_id: string; status: string; match_label: string }[]
}

export default function PlayerStatsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [matchData, setMatchData] = useState<MyMatchesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || authLoading || !user) return

    async function loadStats() {
      setLoading(true)
      setError(null)
      try {
        const [profileRes, matchRes] = await Promise.allSettled([
          api.get<PlayerProfile>(`/players/${user!.id}`),
          api.get<MyMatchesData>('/player/my-matches'),
        ])

        if (profileRes.status === 'fulfilled' && profileRes.value) {
          setProfile(profileRes.value)
        }
        if (matchRes.status === 'fulfilled' && matchRes.value) {
          setMatchData(matchRes.value)
        }

        // If both fail, show error
        if (profileRes.status === 'rejected' && matchRes.status === 'rejected') {
          setError('Gagal memuat data statistik')
        }
      } catch {
        setError('Gagal memuat data statistik')
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [isAuthenticated, authLoading, user])

  // Compute stats from match data as fallback
  const computedStats = useMemo(() => {
    if (!matchData?.team || !matchData.past_matches) {
      return { wins: 0, losses: 0, total: 0, winRate: 0 }
    }
    const teamId = matchData.team.id
    let wins = 0
    let losses = 0
    for (const match of matchData.past_matches) {
      if (match.status === 'bye') continue
      if (match.status !== 'completed') continue
      if (match.winner?.id === teamId) {
        wins++
      } else if (match.winner) {
        losses++
      }
    }
    const total = wins + losses
    const winRate = total > 0 ? (wins / total) * 100 : 0
    return { wins, losses, total, winRate }
  }, [matchData])

  // Use profile stats if available, fallback to computed
  const totalMatches = profile?.total_matches ?? computedStats.total
  const totalWins = profile?.total_wins ?? computedStats.wins
  const totalLosses = profile?.total_losses ?? computedStats.losses
  const winRate = profile?.win_rate ?? computedStats.winRate
  const totalMVP = profile?.total_mvp ?? 0
  const achievements = profile?.achievements ?? []
  const gameStats = profile?.game_stats ?? []

  // Recent matches (last 5 completed)
  const recentMatches = useMemo(() => {
    if (!matchData?.past_matches) return []
    return matchData.past_matches
      .filter((m) => m.status === 'completed')
      .slice(-5)
      .reverse()
  }, [matchData])

  if (loading || authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 rounded-lg bg-stone-200 dark:bg-zinc-700" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-stone-200 dark:bg-zinc-700" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl bg-stone-200 dark:bg-zinc-700" />
          <Skeleton className="h-64 rounded-xl bg-stone-200 dark:bg-zinc-700" />
        </div>
      </DashboardLayout>
    )
  }

  if (error && !profile && !matchData) {
    return (
      <DashboardLayout>
        <EmptyState
          icon={ChartBar}
          title="Gagal Memuat Statistik"
          description={error}
        />
      </DashboardLayout>
    )
  }

  const hasData = totalMatches > 0 || achievements.length > 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-esi-red/10">
            <ChartBar size={22} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-esi-text sm:text-xl">
              Statistik Saya
            </h1>
            <p className="text-xs text-esi-muted">
              Ringkasan performa dan pencapaianmu
            </p>
          </div>
        </div>

        {!hasData ? (
          /* Empty state when no stats */
          <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <EmptyStateIllustration
              type="no-stats"
              title="Belum Ada Data"
              description="Statistik akan muncul setelah kamu menyelesaikan pertandingan pertamamu. Semangat!"
            />
          </div>
        ) : (
          <>
            {/* Stats Cards Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={Sword}
                label="Total Match"
                value={<AnimatedNumber value={totalMatches} />}
                color="text-esi-red"
                bg="bg-esi-red/10"
              />
              <StatCard
                icon={Trophy}
                label="Kemenangan"
                value={<AnimatedNumber value={totalWins} />}
                color="text-green-600"
                bg="bg-green-50 dark:bg-green-950/30"
              />
              <StatCard
                icon={XCircle}
                label="Kekalahan"
                value={<AnimatedNumber value={totalLosses} />}
                color="text-red-500"
                bg="bg-red-50 dark:bg-red-950/30"
              />

              {/* Win Rate Ring Card */}
              <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-4 shadow-sm flex flex-col items-center justify-center">
                <WinRateRing rate={Math.round(winRate)} />
                <p className="mt-2 text-[11px] font-medium text-esi-muted">Win Rate</p>
              </div>
            </div>

            {/* MVP Card (if any) */}
            {totalMVP > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50 dark:from-amber-950/30 to-yellow-50 dark:to-yellow-950/30 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
                    <Star size={24} weight="fill" className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      {totalMVP}x MVP
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Kamu terpilih sebagai MVP di {totalMVP} pertandingan
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Per-Game Stats */}
            {gameStats.length > 0 && (
              <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 shadow-sm">
                <div className="border-b border-esi-border px-5 py-3">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-esi-text">
                    <GameController size={16} weight="bold" />
                    Statistik Per Game
                  </h2>
                </div>
                <div className="divide-y divide-esi-border">
                  {gameStats.map((gs) => (
                    <GameStatRow key={gs.game.id} stat={gs} />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Matches */}
            {recentMatches.length > 0 && (
              <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 shadow-sm">
                <div className="flex items-center justify-between border-b border-esi-border px-5 py-3">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-esi-text">
                    <Clock size={16} weight="bold" />
                    Pertandingan Terakhir
                  </h2>
                  <Link
                    href="/dashboard/my-matches"
                    className="flex items-center gap-1 text-xs font-semibold text-esi-red hover:underline"
                  >
                    Lihat Semua
                    <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="divide-y divide-esi-border">
                  {recentMatches.map((match) => (
                    <RecentMatchRow
                      key={match.id}
                      match={match}
                      teamId={matchData?.team?.id ?? ''}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 shadow-sm">
              <div className="flex items-center justify-between border-b border-esi-border px-5 py-3">
                <h2 className="flex items-center gap-2 text-sm font-bold text-esi-text">
                  <Medal size={16} weight="bold" />
                  Pencapaian
                </h2>
                <Link
                  href="/achievements"
                  className="flex items-center gap-1 text-xs font-semibold text-esi-red hover:underline"
                >
                  Lihat Semua
                  <ArrowRight size={12} />
                </Link>
              </div>
              <div className="p-4">
                {achievements.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {achievements.map((ua) => (
                      <AchievementBadge
                        key={ua.id}
                        achievement={ua.achievement}
                        earned
                        earnedAt={ua.earned_at}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 dark:bg-zinc-800">
                      <Medal size={24} className="text-stone-400 dark:text-zinc-500" />
                    </div>
                    <p className="text-sm font-medium text-stone-500 dark:text-zinc-400">
                      Belum ada pencapaian
                    </p>
                    <p className="mt-1 text-xs text-stone-400 dark:text-zinc-500">
                      Terus bermain untuk membuka pencapaian baru!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: IconComp,
  label,
  value,
  color,
  bg,
  extra,
}: {
  icon: React.ComponentType<{
    size?: number
    weight?: 'duotone' | 'fill' | 'regular' | 'bold'
    className?: string
  }>
  label: string
  value: React.ReactNode
  color: string
  bg: string
  extra?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}
        >
          <IconComp size={18} weight="duotone" className={color} />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-esi-text sm:text-2xl">
            {value}
          </p>
          <p className="text-[11px] font-medium text-esi-muted">{label}</p>
        </div>
      </div>
      {extra && <div className="mt-3">{extra}</div>}
    </div>
  )
}

// ── Win Rate Ring ────────────────────────────────────────────────────────────

function WinRateRing({ rate }: { rate: number }) {
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (rate / 100) * circumference
  const color = rate >= 60 ? '#16a34a' : rate >= 40 ? '#2563eb' : '#dc2626'
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="h-24 w-24 -rotate-90">
        <circle cx="48" cy="48" r="40" fill="none" className="stroke-stone-200 dark:stroke-zinc-700" strokeWidth="6" />
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-xl font-bold text-esi-text">{rate}%</span>
    </div>
  )
}

// ── Animated Number ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) {
      setDisplay(0)
      return
    }
    let start = 0
    const step = value / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [value, duration])
  return <>{display}</>
}

// ── Per-Game Stat Row ────────────────────────────────────────────────────────

function GameStatRow({ stat }: { stat: GameStatsItem }) {
  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-esi-red/10">
            <GameController
              size={16}
              weight="duotone"
              className="text-esi-red"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-esi-text">
              {stat.game.name}
            </p>
            <p className="text-[11px] text-esi-muted">
              {stat.matches_played} match &middot; {stat.win_rate.toFixed(0)}%
              win rate
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-600">
            <Trophy size={12} weight="fill" />
            {stat.wins}W
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <XCircle size={12} weight="fill" />
            {stat.losses}L
          </span>
        </div>
      </div>

      {/* KDA row for games with kill data */}
      {(stat.total_kills > 0 ||
        stat.total_deaths > 0 ||
        stat.total_assists > 0) && (
        <div className="mt-2 flex items-center gap-4 rounded-lg bg-esi-bg px-3 py-2 text-xs">
          <span className="flex items-center gap-1 text-esi-muted">
            <Crosshair size={12} className="text-green-500" />
            <span className="font-medium text-esi-text">
              {stat.total_kills}
            </span>{' '}
            Kills
          </span>
          <span className="flex items-center gap-1 text-esi-muted">
            <Skull size={12} className="text-red-400" />
            <span className="font-medium text-esi-text">
              {stat.total_deaths}
            </span>{' '}
            Deaths
          </span>
          <span className="flex items-center gap-1 text-esi-muted">
            <Handshake size={12} className="text-blue-500" />
            <span className="font-medium text-esi-text">
              {stat.total_assists}
            </span>{' '}
            Assists
          </span>
        </div>
      )}

      {/* MVP badge for this game */}
      {stat.mvp_count > 0 && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          <Crown size={12} weight="fill" />
          {stat.mvp_count}x MVP
        </div>
      )}
    </div>
  )
}

// ── Recent Match Row ─────────────────────────────────────────────────────────

function RecentMatchRow({
  match,
  teamId,
}: {
  match: BracketMatch
  teamId: string
}) {
  const isWin = match.winner?.id === teamId
  const opponent =
    match.team_a?.id === teamId ? match.team_b : match.team_a

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      {/* Win/Loss indicator */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isWin ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'
        }`}
      >
        {isWin ? (
          <Trophy size={16} weight="fill" className="text-green-600" />
        ) : (
          <XCircle size={16} weight="fill" className="text-red-400" />
        )}
      </div>

      {/* Match info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-esi-text">
          vs {opponent?.name ?? 'TBD'}
        </p>
        <p className="text-[11px] text-esi-muted">
          R{match.round} M{match.match_number}
          {match.best_of > 1 && <> &middot; BO{match.best_of}</>}
          {match.completed_at && (
            <>
              {' '}
              &middot;{' '}
              {new Date(match.completed_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
              })}
            </>
          )}
        </p>
      </div>

      {/* Score */}
      <div className="shrink-0 text-right">
        <span
          className={`text-sm font-bold ${isWin ? 'text-green-600' : 'text-red-500'}`}
        >
          {match.score_a} - {match.score_b}
        </span>
        <p
          className={`text-[11px] font-semibold ${isWin ? 'text-green-600' : 'text-red-500'}`}
        >
          {isWin ? 'MENANG' : 'KALAH'}
        </p>
      </div>
    </div>
  )
}
