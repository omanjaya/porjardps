'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Trophy,
  UsersThree,
  Broadcast,
  WarningCircle,
  Crown,
  PencilSimple,
  UserPlus,
  ArrowsClockwise,
  ClipboardText,
  Plus,
} from '@phosphor-icons/react'
import { GAME_CONFIG } from '@/constants/games'
import type { GameSlug } from '@/types'

// ── Types matching GET /admin/events/:id/overview ──────────────────────────

interface EventOverviewEvent {
  id: string
  slug: string
  name: string
  status: string
  start_date: string | null
  end_date: string | null
  logo_url: string | null
  primary_color: string
}

interface EventOverviewTournament {
  id: string
  name: string
  game_name: string
  game_slug: string
  format: string
  status: string
  matches_total: number
  matches_completed: number
  live_matches: number
  champion_team_name: string | null
}

interface EventOverviewTotals {
  teams: number
  live_matches: number
  tournaments: number
}

interface EventOverviewAttention {
  disputed_submissions: number
  overdue_matches: number
  total: number
}

interface EventOverview {
  event: EventOverviewEvent
  tournaments: EventOverviewTournament[]
  totals: EventOverviewTotals
  attention: EventOverviewAttention
}

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: 'Single Elimination',
  double_elimination: 'Double Elimination',
  round_robin: 'Round Robin',
  swiss: 'Swiss System',
  group_stage_playoff: 'Grup + Playoff',
  multi_stage: 'Multi Stage',
  battle_royale_points: 'Battle Royale Points',
  battle_royale_placement: 'Battle Royale Placement',
}

const REFRESH_INTERVAL_MS = 20_000

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'Tanggal belum ditentukan'
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const startLabel = start ? new Date(start).toLocaleDateString('id-ID', opts) : null
  const endLabel = end ? new Date(end).toLocaleDateString('id-ID', opts) : null
  if (startLabel && endLabel && startLabel !== endLabel) return `${startLabel} – ${endLabel}`
  return startLabel ?? endLabel ?? 'Tanggal belum ditentukan'
}

export default function AdminEventOverviewPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const params = useParams<{ id: string }>()

  const [overview, setOverview] = useState<EventOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadOverview = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!isAuthenticated || authLoading) return
      if (!opts?.silent) setLoading(true)
      try {
        const data = await api.get<EventOverview>(`/admin/events/${params.id}/overview`)
        setOverview(data ?? null)
        setError(null)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat ringkasan event')
        if (!opts?.silent) setOverview(null)
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [params.id, isAuthenticated, authLoading]
  )

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  // Lightweight auto-refresh for live monitoring
  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    intervalRef.current = setInterval(() => {
      loadOverview({ silent: true })
    }, REFRESH_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loadOverview, isAuthenticated, authLoading])

  async function handleManualRefresh() {
    await loadOverview({ silent: true })
    toast.success('Data diperbarui')
  }

  if (loading) {
    return (
      <>
        <Skeleton className="h-10 w-64 bg-stone-200 dark:bg-zinc-800" />
        <Skeleton className="mt-4 h-24 w-full bg-stone-200 dark:bg-zinc-800" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200 dark:bg-zinc-800" />
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Monitoring Event"
          breadcrumbs={[
            { label: 'Events', href: '/admin/events' },
            { label: 'Monitoring' },
          ]}
        />
        <EmptyState
          icon={WarningCircle}
          title="Gagal Memuat Data"
          description={error}
          actionLabel="Coba Lagi"
          onAction={() => loadOverview()}
        />
      </>
    )
  }

  if (!overview) {
    return (
      <EmptyState
        icon={Trophy}
        title="Event Tidak Ditemukan"
        description="Event tidak ada atau sudah dihapus."
      />
    )
  }

  const { event, tournaments, totals, attention } = overview

  return (
    <>
      <PageHeader
        title={event.name}
        breadcrumbs={[
          { label: 'Events', href: '/admin/events' },
          { label: event.name },
        ]}
        actions={
          <>
            <Link href="/admin/events">
              <Button
                variant="outline"
                className="border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300"
              >
                <ArrowLeft size={14} className="mr-1.5" />
                Semua Event
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleManualRefresh}
              className="border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300"
            >
              <ArrowsClockwise size={14} className="mr-1.5" />
              Refresh
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={event.status} />
        <span className="text-sm text-stone-500 dark:text-zinc-400">
          {formatDateRange(event.start_date, event.end_date)}
        </span>
      </div>

      {/* Totals strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
            <Trophy size={14} />
            Turnamen
          </div>
          <p className="text-2xl font-bold text-stone-900 dark:text-zinc-100 tabular-nums">
            {totals.tournaments}
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
            <UsersThree size={14} />
            Tim
          </div>
          <p className="text-2xl font-bold text-stone-900 dark:text-zinc-100 tabular-nums">
            {totals.teams}
          </p>
        </div>

        <div
          className={`rounded-xl border p-4 shadow-sm ${
            totals.live_matches > 0
              ? 'border-esi-red/30 bg-esi-red/5 dark:bg-red-950/20'
              : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
          }`}
        >
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
            <Broadcast size={14} />
            Live Sekarang
          </div>
          <p
            className={`flex items-center gap-2 text-2xl font-bold tabular-nums ${
              totals.live_matches > 0 ? 'text-esi-red' : 'text-stone-900 dark:text-zinc-100'
            }`}
          >
            {totals.live_matches > 0 && (
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
              </span>
            )}
            {totals.live_matches}
          </p>
        </div>

        <div
          className={`rounded-xl border p-4 shadow-sm ${
            attention.total > 0
              ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
              : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
          }`}
        >
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
            <WarningCircle size={14} />
            Perlu Perhatian
          </div>
          {attention.total > 0 ? (
            <p className="text-2xl font-bold text-red-700 dark:text-red-400 tabular-nums">
              {attention.total}
            </p>
          ) : (
            <p className="text-2xl font-bold text-stone-900 dark:text-zinc-100 tabular-nums">0</p>
          )}
          {attention.total > 0 && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {attention.disputed_submissions > 0 && `${attention.disputed_submissions} sengketa`}
              {attention.disputed_submissions > 0 && attention.overdue_matches > 0 && ' · '}
              {attention.overdue_matches > 0 && `${attention.overdue_matches} terlambat`}
            </p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href={`/admin/events/${params.id}/teams`}>
          <Button variant="outline" className="border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300">
            <UserPlus size={14} className="mr-1.5" />
            Assign Tim
          </Button>
        </Link>
        <Link href={`/admin/events/${params.id}/edit`}>
          <Button variant="outline" className="border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300">
            <PencilSimple size={14} className="mr-1.5" />
            Edit Event
          </Button>
        </Link>
        <Link href={`/admin/events/${params.id}/registrations`}>
          <Button variant="outline" className="border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300">
            <ClipboardText size={14} className="mr-1.5" />
            Pendaftar Event
          </Button>
        </Link>
        <Link href={`/admin/tournaments?event_id=${params.id}&new=1`}>
          <Button variant="outline" className="border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300">
            <Plus size={14} className="mr-1.5" />
            Buat Turnamen
          </Button>
        </Link>
      </div>

      {/* Tournaments table */}
      {tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Belum Ada Turnamen"
          description="Event ini belum memiliki turnamen."
        />
      ) : (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-zinc-700 hover:bg-transparent bg-stone-50 dark:bg-zinc-800/50">
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Game</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Turnamen</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Format</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Status</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Progres</TableHead>
                  <TableHead className="text-center text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Live</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Juara</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournaments.map((t) => {
                  const config = GAME_CONFIG[t.game_slug as GameSlug]
                  const progressPct =
                    t.matches_total > 0 ? Math.round((t.matches_completed / t.matches_total) * 100) : 0

                  return (
                    <TableRow key={t.id} className="border-stone-100 dark:border-zinc-700">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {config ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={config.logo}
                              alt={config.name}
                              className="h-6 w-6 rounded object-contain"
                            />
                          ) : null}
                          <span className="text-sm text-stone-600 dark:text-zinc-400">
                            {config?.name ?? t.game_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/tournaments/${t.id}`}
                          className="font-medium text-stone-900 dark:text-zinc-100 hover:text-esi-red transition-colors"
                        >
                          {t.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-stone-500 dark:text-zinc-400">
                        {FORMAT_LABELS[t.format] ?? t.format.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={t.status} />
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-700">
                            <div
                              className="h-full rounded-full bg-esi-red transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="whitespace-nowrap text-xs tabular-nums text-stone-500 dark:text-zinc-400">
                            {t.matches_completed}/{t.matches_total}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {t.live_matches > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-esi-red/10 dark:bg-red-950/30 px-2.5 py-0.5 text-xs font-semibold text-esi-red dark:text-red-400">
                            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600" />
                            </span>
                            {t.live_matches}
                          </span>
                        ) : (
                          <span className="text-sm text-stone-400 dark:text-zinc-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {t.champion_team_name ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                            <Crown size={14} weight="fill" />
                            {t.champion_team_name}
                          </span>
                        ) : (
                          <span className="text-sm text-stone-400 dark:text-zinc-500">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  )
}
