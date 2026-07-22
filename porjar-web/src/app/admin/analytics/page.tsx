'use client'

import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Event } from '@/types'
import {
  Users,
  Trophy,
  Sword,
  Lightning,
} from '@phosphor-icons/react'

const RegistrationChart = dynamic(
  () => import('@/components/modules/admin/AnalyticsCharts').then(mod => ({ default: mod.RegistrationChart })),
  { ssr: false }
)
const GameDistributionChart = dynamic(
  () => import('@/components/modules/admin/AnalyticsCharts').then(mod => ({ default: mod.GameDistributionChart })),
  { ssr: false }
)
const TournamentProgressChart = dynamic(
  () => import('@/components/modules/admin/AnalyticsCharts').then(mod => ({ default: mod.TournamentProgressChart })),
  { ssr: false }
)
const MatchHeatmap = dynamic(
  () => import('@/components/modules/admin/AnalyticsCharts').then(mod => ({ default: mod.MatchHeatmap })),
  { ssr: false }
)
const SchoolParticipationChart = dynamic(
  () => import('@/components/modules/admin/AnalyticsCharts').then(mod => ({ default: mod.SchoolParticipationChart })),
  { ssr: false }
)
const StatTrend = dynamic(
  () => import('@/components/modules/admin/StatTrend').then(mod => ({ default: mod.StatTrend })),
  { ssr: false }
)

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface AnalyticsData {
  total_players: number
  total_teams: number
  total_matches: number
  active_tournaments: number
  registrations_by_date: { date: string; teams: number; players: number }[]
  teams_by_game: { game: string; count: number }[]
  top_schools: { school: string; level: string; teams: number }[]
  tournament_progress: { name: string; completed: number; total: number }[]
  match_heatmap?: { day: number; hour: number; count: number }[]
}

type DateRange = '7d' | '30d' | 'all'

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

/**
 * Derives an honest period-over-period trend + sparkline from a REAL daily
 * time series (e.g. registrations_by_date). No randomness, no fabrication:
 * the series is split in half and the second half is compared to the first.
 *
 * When the first half has zero activity, a percentage is undefined (division
 * by zero), so we fall back to a plain "+100%"/"0%" convention rather than
 * inventing a number — this only ever reflects real counts.
 */
function computeRealTrend(series: number[]): { trend: string; sparkline: number[] } | null {
  if (series.length < 2) return null
  const mid = Math.floor(series.length / 2)
  const firstHalf = series.slice(0, mid)
  const secondHalf = series.slice(mid)
  const firstSum = firstHalf.reduce((a, b) => a + b, 0)
  const secondSum = secondHalf.reduce((a, b) => a + b, 0)
  const delta = secondSum - firstSum
  const pct = firstSum > 0 ? Math.round((delta / firstSum) * 100) : (secondSum > 0 ? 100 : 0)
  return {
    trend: `${pct >= 0 ? '+' : ''}${pct}%`,
    sparkline: series,
  }
}

// ═══════════════════════════════════════════════
// Skeleton Loaders
// ═══════════════════════════════════════════════

function ChartSkeleton({ className = 'h-80' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm p-4 sm:p-5 ${className}`}>
      <Skeleton className="mb-4 h-4 w-40 bg-stone-200" />
      <Skeleton className="h-full w-full rounded-lg bg-stone-100 dark:bg-zinc-800" />
    </div>
  )
}

// Plain stat card — used where the API has no real time-series to derive an
// honest trend/sparkline from (total matches, active tournaments). Shows only
// the real current value, no fabricated delta.
function PlainStat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums text-stone-900 dark:text-zinc-100">{value}</p>
        <p className="mt-0.5 text-sm text-stone-500 dark:text-zinc-400">{label}</p>
      </div>
      <div className="shrink-0 text-stone-300 dark:text-zinc-600">{icon}</div>
    </div>
  )
}

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm px-5 py-4">
      <Skeleton className="mb-2 h-7 w-16 bg-stone-200" />
      <Skeleton className="mb-1 h-4 w-24 bg-stone-200" />
      <Skeleton className="h-3 w-12 bg-stone-200" />
    </div>
  )
}

// ═══════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════

export default function AdminAnalyticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRange>('30d')
  const [events, setEvents] = useState<Event[]>([])
  const [eventId, setEventId] = useState<string>('')

  // Load the event list once for the scope dropdown (reuses the existing
  // /admin/events endpoint — already RBAC-scoped to the admin's own events).
  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    api.get<Event[]>('/admin/events').then(setEvents).catch(() => setEvents([]))
  }, [isAuthenticated, authLoading])

  const loadAnalytics = useCallback(async (r: DateRange, evId: string) => {
    if (!isAuthenticated || authLoading) return
    setLoading(true)
    try {
      const qs = evId ? `range=${r}&event_id=${evId}` : `range=${r}`
      const result = await api.get<AnalyticsData>(`/admin/analytics?${qs}`)
      setData(result)
    } catch (err) {
      console.error('Gagal memuat analytics:', err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    loadAnalytics(range, eventId)
  }, [range, eventId, loadAnalytics])

  // Real, honestly-derived trends + sparklines from the actual daily
  // registration series returned by the API. No fabricated numbers: if the
  // series can't support a comparison, the trend is simply omitted.
  const playersTrend = useMemo(() => {
    if (!data) return null
    return computeRealTrend(data.registrations_by_date.map(d => d.players))
  }, [data])
  const teamsTrend = useMemo(() => {
    if (!data) return null
    return computeRealTrend(data.registrations_by_date.map(d => d.teams))
  }, [data])

  const dateRangeButtons: { label: string; value: DateRange }[] = [
    { label: '7 Hari', value: '7d' },
    { label: '30 Hari', value: '30d' },
    { label: 'Semua', value: 'all' },
  ]

  return (
    <>
      <PageHeader
        title="Analitik"
        description="Statistik dan visualisasi data ESI Denpasar"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {events.length > 0 && (
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-zinc-200"
              >
                <option value="">Semua Event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            )}
            <div className="flex items-center rounded-lg border border-stone-200 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 p-0.5">
              {dateRangeButtons.map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => setRange(btn.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    range === btn.value
                      ? 'bg-esi-red text-white'
                      : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Stats Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : data ? (
          <>
            {playersTrend ? (
              <StatTrend
                label="Total Pemain"
                value={data.total_players}
                trend={playersTrend.trend}
                sparklineData={playersTrend.sparkline}
              />
            ) : (
              <PlainStat label="Total Pemain" value={data.total_players} icon={<Users size={28} weight="duotone" />} />
            )}
            {teamsTrend ? (
              <StatTrend
                label="Total Tim"
                value={data.total_teams}
                trend={teamsTrend.trend}
                sparklineData={teamsTrend.sparkline}
              />
            ) : (
              <PlainStat label="Total Tim" value={data.total_teams} icon={<Users size={28} weight="duotone" />} />
            )}
            {/* No real time-series backs matches/active-tournaments deltas
                (match_heatmap is all-time by weekday/hour, not periodized;
                tournament_progress has no time dimension) — show real values only. */}
            <PlainStat label="Total Pertandingan" value={data.total_matches} icon={<Sword size={28} weight="duotone" />} />
            <PlainStat label="Turnamen Aktif" value={data.active_tournaments} icon={<Lightning size={28} weight="duotone" />} />
          </>
        ) : (
          <div className="col-span-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm p-8 text-center">
            <Trophy size={40} weight="duotone" className="mx-auto mb-3 text-stone-300 dark:text-zinc-600" />
            <p className="text-sm text-stone-500 dark:text-zinc-400">Tidak dapat memuat data analitik</p>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      {loading ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton className="lg:col-span-2 h-64" />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : data ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Registration over time */}
          <RegistrationChart data={data.registrations_by_date || []} />

          {/* Game distribution donut */}
          <GameDistributionChart data={data.teams_by_game || []} />

          {/* Match heatmap (full width) */}
          <div className="lg:col-span-2">
            <MatchHeatmap data={data.match_heatmap || []} />
          </div>

          {/* Tournament progress */}
          <TournamentProgressChart data={data.tournament_progress || []} />

          {/* School participation */}
          <SchoolParticipationChart data={data.top_schools || []} />
        </div>
      ) : null}
    </>
  )
}
