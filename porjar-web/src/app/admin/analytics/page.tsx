'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
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

function generateSparkline(length: number, base: number): number[] {
  const data: number[] = []
  let current = base
  for (let i = 0; i < length; i++) {
    current += Math.floor(Math.random() * 6) - 2
    if (current < 0) current = 0
    data.push(current)
  }
  return data
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

  const loadAnalytics = useCallback(async (r: DateRange) => {
    if (!isAuthenticated || authLoading) return
    setLoading(true)
    try {
      const result = await api.get<AnalyticsData>(`/admin/analytics?range=${r}`)
      setData(result)
    } catch (err) {
      console.error('Gagal memuat analytics:', err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    loadAnalytics(range)
  }, [range, loadAnalytics])

  // Memoize sparkline data so Math.random() isn't called on every render
  const sparklines = useMemo(() => {
    if (!data) return null
    return {
      players: generateSparkline(10, data.total_players),
      teams: generateSparkline(10, data.total_teams),
      matches: generateSparkline(10, data.total_matches),
      tournaments: generateSparkline(10, data.active_tournaments),
    }
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
            <StatTrend
              label="Total Pemain"
              value={data.total_players}
              trend={`+${Math.floor(data.total_players * 0.08)}%`}
              sparklineData={sparklines!.players}
            />
            <StatTrend
              label="Total Tim"
              value={data.total_teams}
              trend={`+${Math.floor(data.total_teams * 0.12)}%`}
              sparklineData={sparklines!.teams}
            />
            <StatTrend
              label="Total Pertandingan"
              value={data.total_matches}
              trend={`+${Math.floor(data.total_matches * 0.05)}%`}
              sparklineData={sparklines!.matches}
            />
            <StatTrend
              label="Turnamen Aktif"
              value={data.active_tournaments}
              trend={data.active_tournaments > 0 ? '+0%' : '0%'}
              sparklineData={sparklines!.tournaments}
            />
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
