'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  Trophy,
  CalendarBlank,
  Clock,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  GameController,
  ArrowRight,
  GraduationCap,
} from '@phosphor-icons/react'
import { CoachLayout } from '@/components/layouts/CoachLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { Icon } from '@phosphor-icons/react'

interface CoachDashboardData {
  school_name: string
  stats: {
    total_teams: number
    wins: number
    losses: number
    pending_verifications: number
  }
  teams: CoachTeam[]
  recent_results: CoachResult[]
  upcoming_matches: CoachSchedule[]
  pending_submissions: PendingSubmission[]
}

interface CoachTeam {
  id: string
  name: string
  game_name: string
  game_slug: string
  member_count: number
  status: string
}

interface CoachResult {
  id: string
  team_name: string
  opponent_name: string
  score_a: number
  score_b: number
  won: boolean
  game_name: string
  played_at: string
}

interface CoachSchedule {
  id: string
  team_name: string
  opponent_name: string
  game_name: string
  scheduled_at: string
}

interface PendingSubmission {
  match_id: string
  team_name: string
  opponent_name: string
  game_name: string
  needs_submission: boolean
}

interface StatCardProps {
  label: string
  value: number | string
  icon: Icon
  loading?: boolean
  color?: string
}

function StatCard({ label, value, icon: IconComp, loading, color = 'text-esi-red' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-esi-red/10">
          <IconComp size={32} weight="duotone" className={color} />
        </div>
        <div className="min-w-0">
          {loading ? (
            <>
              <Skeleton className="mb-1.5 h-8 w-16 bg-esi-border" />
              <Skeleton className="h-4 w-24 bg-esi-border" />
            </>
          ) : (
            <>
              <p className="text-3xl font-bold tabular-nums text-esi-text">{value}</p>
              <p className="text-sm text-esi-muted">{label}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CoachDashboardPage() {
  const [data, setData] = useState<CoachDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const result = await api.get<CoachDashboardData>('/coach/dashboard')
        setData(result)
      } catch (err) {
        console.error('Gagal memuat dashboard coach:', err)
        setData({
          school_name: 'Sekolah Saya',
          stats: { total_teams: 0, wins: 0, losses: 0, pending_verifications: 0 },
          teams: [],
          recent_results: [],
          upcoming_matches: [],
          pending_submissions: [],
        })
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  useWebSocket({
    channels: ['live-scores'],
    messageTypes: ['match_status', 'match_complete', 'bracket_update', 'new_submission'],
    onMessage: () => {
      api.get<CoachDashboardData>('/coach/dashboard').then(r => { if (r) setData(r) }).catch(() => {})
    },
  })

  return (
    <CoachLayout>
      {/* School header */}
      <div className="mb-4 sm:mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-esi-red/10">
          <GraduationCap size={28} weight="duotone" className="text-esi-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-esi-text">
            {loading ? <Skeleton className="h-7 w-48 bg-esi-border" /> : data?.school_name}
          </h1>
          <p className="text-sm text-esi-muted">Dashboard Guru Pembina</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Tim"
          value={data?.stats.total_teams ?? 0}
          icon={Users}
          loading={loading}
        />
        <StatCard
          label="Menang"
          value={data?.stats.wins ?? 0}
          icon={Trophy}
          loading={loading}
          color="text-green-600"
        />
        <StatCard
          label="Kalah"
          value={data?.stats.losses ?? 0}
          icon={XCircle}
          loading={loading}
          color="text-red-500"
        />
        <StatCard
          label="Pending Verifikasi"
          value={data?.stats.pending_verifications ?? 0}
          icon={Clock}
          loading={loading}
          color="text-amber-500"
        />
      </div>

      {/* Tim Sekolah */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold uppercase tracking-wide text-esi-text">
            <Users size={18} weight="fill" className="text-esi-red" />
            Tim Sekolah
          </h2>
          <Link href="/coach/teams" className="flex items-center gap-1 text-xs font-medium text-esi-red hover:underline">
            Lihat semua <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl bg-esi-border" />
            ))}
          </div>
        ) : data && data.teams.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.teams.map(team => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-all hover:border-esi-red/30 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-esi-red/10">
                    <GameController size={20} weight="duotone" className="text-esi-red" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-esi-text">{team.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-esi-muted">{team.game_name}</span>
                      <span className="text-xs text-esi-muted">{team.member_count} anggota</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      '-skew-x-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                      team.status === 'approved' || team.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : team.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400'
                    )}
                  >
                    {team.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
            <Users size={32} weight="duotone" className="mx-auto mb-2 text-esi-border" />
            <p className="text-sm text-esi-muted">Belum ada tim terdaftar</p>
          </div>
        )}
      </div>

      {/* Bottom Grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Hasil Terbaru */}
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold uppercase tracking-wide text-esi-text">
              <Trophy size={16} weight="duotone" className="text-esi-red" />
              Hasil Terbaru
            </h3>
            <Link href="/coach/results" className="text-xs font-medium text-esi-red hover:underline">
              Lihat semua
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg bg-esi-border" />
              ))}
            </div>
          ) : data && data.recent_results.length > 0 ? (
            <div className="space-y-2">
              {data.recent_results.map(result => (
                <div
                  key={result.id}
                  className="flex items-center gap-3 rounded-lg border border-stone-100 dark:border-zinc-800 bg-esi-bg/50 p-3"
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      result.won ? 'bg-green-100' : 'bg-red-100'
                    )}
                  >
                    {result.won ? (
                      <CheckCircle size={16} weight="fill" className="text-green-600" />
                    ) : (
                      <XCircle size={16} weight="fill" className="text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-esi-text">
                      {result.team_name} vs {result.opponent_name}
                    </p>
                    <p className="text-xs text-esi-muted">{result.game_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-esi-text">{result.score_a} - {result.score_b}</p>
                    <p className="text-[10px] text-esi-muted">
                      {new Date(result.played_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Trophy size={32} weight="duotone" className="mx-auto mb-2 text-esi-border" />
              <p className="text-sm text-esi-muted">Belum ada hasil pertandingan</p>
            </div>
          )}
        </div>

        {/* Jadwal Mendatang */}
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-base font-bold uppercase tracking-wide text-esi-text">
            <CalendarBlank size={16} weight="duotone" className="text-esi-red" />
            Jadwal Mendatang
          </h3>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg bg-esi-border" />
              ))}
            </div>
          ) : data && data.upcoming_matches.length > 0 ? (
            <div className="space-y-2">
              {data.upcoming_matches.map(match => (
                <div
                  key={match.id}
                  className="flex items-center gap-3 rounded-lg border border-stone-100 dark:border-zinc-800 bg-esi-bg/50 p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-esi-red/10">
                    <GameController size={16} weight="duotone" className="text-esi-red" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-esi-text">
                      {match.team_name} vs {match.opponent_name}
                    </p>
                    <p className="text-xs text-esi-muted">{match.game_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-esi-text">
                      {new Date(match.scheduled_at).toLocaleDateString('id-ID')}
                    </p>
                    <p className="text-[10px] text-esi-muted">
                      {new Date(match.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <CalendarBlank size={32} weight="duotone" className="mx-auto mb-2 text-esi-border" />
              <p className="text-sm text-esi-muted">Tidak ada jadwal mendatang</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Pengiriman Bukti */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold uppercase tracking-wide text-esi-text">
          <ImageIcon size={18} weight="fill" className="text-esi-red" />
          Status Pengiriman Bukti
        </h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl bg-esi-border" />
            ))}
          </div>
        ) : data && data.pending_submissions.length > 0 ? (
          <div className="space-y-2">
            {data.pending_submissions.map(sub => (
              <div
                key={sub.match_id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl border p-4 shadow-sm',
                  sub.needs_submission
                    ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50'
                    : 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30'
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      sub.needs_submission ? 'bg-amber-100' : 'bg-green-100'
                    )}
                  >
                    {sub.needs_submission ? (
                      <Clock size={16} weight="fill" className="text-amber-600" />
                    ) : (
                      <CheckCircle size={16} weight="fill" className="text-green-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-esi-text">
                      {sub.team_name} vs {sub.opponent_name}
                    </p>
                    <p className="text-xs text-esi-muted">{sub.game_name}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    '-skew-x-2 shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold uppercase',
                    sub.needs_submission ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  )}
                >
                  {sub.needs_submission ? 'Belum dikirim' : 'Sudah dikirim'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
            <ImageIcon size={32} weight="duotone" className="mx-auto mb-2 text-esi-border" />
            <p className="text-sm text-esi-muted">Tidak ada pertandingan yang memerlukan bukti</p>
          </div>
        )}
      </div>
    </CoachLayout>
  )
}
