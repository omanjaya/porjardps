'use client'

import { useEffect, useState, useCallback } from 'react'
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
  Printer,
  Trophy,
  UsersThree,
  GraduationCap,
  CheckCircle,
  MapPin,
  Buildings,
} from '@phosphor-icons/react'
import { GAME_CONFIG } from '@/constants/games'
import type { GameSlug } from '@/types'

// ── Types matching GET /admin/events/:id/report ────────────────────────────

interface EventReportEvent {
  id: string
  slug: string
  name: string
  status: string
  start_date: string | null
  end_date: string | null
  venue: string | null
  organizer: string | null
  logo_url: string | null
  primary_color: string
}

interface EventReportTotals {
  tournaments: number
  teams: number
  players: number
  schools: number
  matches_completed: number
}

interface EventReportStanding {
  rank_position: number
  team_name: string
  school_name: string | null
}

interface EventReportTournament {
  id: string
  name: string
  game_name: string
  game_slug: string
  format: string
  status: string
  champion_team_name: string | null
  standings: EventReportStanding[]
}

interface EventReport {
  event: EventReportEvent
  totals: EventReportTotals
  tournaments: EventReportTournament[]
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

const RANK_MEDAL: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'Tanggal belum ditentukan'
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  const startLabel = start ? new Date(start).toLocaleDateString('id-ID', opts) : null
  const endLabel = end ? new Date(end).toLocaleDateString('id-ID', opts) : null
  if (startLabel && endLabel && startLabel !== endLabel) return `${startLabel} – ${endLabel}`
  return startLabel ?? endLabel ?? 'Tanggal belum ditentukan'
}

export default function EventReportPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const params = useParams<{ id: string }>()

  const [report, setReport] = useState<EventReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    setLoading(true)
    try {
      const data = await api.get<EventReport>(`/admin/events/${params.id}/report`)
      setReport(data ?? null)
      setError(null)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memuat laporan event'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [params.id, isAuthenticated, authLoading])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <>
        <Skeleton className="h-10 w-64 bg-stone-200 dark:bg-zinc-700" />
        <Skeleton className="mt-4 h-24 w-full bg-stone-200 dark:bg-zinc-700" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200 dark:bg-zinc-700" />
      </>
    )
  }

  if (!report) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-stone-500 dark:text-zinc-400">
          {error ?? 'Laporan tidak tersedia'}
        </p>
        {error && (
          <Button
            size="sm"
            variant="outline"
            className="mt-4 border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400"
            onClick={loadReport}
          >
            Coba Lagi
          </Button>
        )}
      </div>
    )
  }

  const { event, totals, tournaments } = report

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          nav, aside, header, .no-print { display: none !important; }
          body { background: white !important; }
          .print-container { max-width: 100% !important; padding: 0 !important; }
          .print-section { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print">
        <PageHeader
          title="Laporan Event"
          description={event.name}
          breadcrumbs={[
            { label: 'Events', href: '/admin/events' },
            { label: event.name, href: `/admin/events/${params.id}` },
            { label: 'Laporan' },
          ]}
          actions={
            <>
              <Link href={`/admin/events/${params.id}`}>
                <Button
                  variant="outline"
                  className="border-stone-300 dark:border-zinc-600 text-stone-700 dark:text-zinc-300"
                >
                  <ArrowLeft size={14} className="mr-1.5" />
                  Kembali
                </Button>
              </Link>
              <Button
                onClick={handlePrint}
                className="bg-esi-red hover:bg-esi-red-dark text-white"
              >
                <Printer size={14} className="mr-1.5" />
                Cetak / Print
              </Button>
            </>
          }
        />
      </div>

      <div className="print-container space-y-6">
        {/* Event header */}
        <div className="print-section rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {event.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.logo_url}
                  alt={event.name}
                  className="h-16 w-16 rounded-lg object-contain print:h-12 print:w-12"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold text-stone-900 dark:text-zinc-100">
                  {event.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-500 dark:text-zinc-400">
                  <StatusBadge status={event.status} />
                  <span>{formatDateRange(event.start_date, event.end_date)}</span>
                  {event.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {event.venue}
                    </span>
                  )}
                  {event.organizer && (
                    <span className="flex items-center gap-1">
                      <Buildings size={14} />
                      {event.organizer}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-stone-400 dark:text-zinc-500">
              Laporan dibuat: {new Date().toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>

        {/* Totals strip */}
        <div className="print-section grid grid-cols-2 gap-3 sm:grid-cols-5">
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
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
              <UsersThree size={14} />
              Pemain
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-zinc-100 tabular-nums">
              {totals.players}
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
              <GraduationCap size={14} />
              Sekolah
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-zinc-100 tabular-nums">
              {totals.schools}
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
              <CheckCircle size={14} />
              Match Selesai
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-zinc-100 tabular-nums">
              {totals.matches_completed}
            </p>
          </div>
        </div>

        {/* Per-tournament recap */}
        {tournaments.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Belum Ada Turnamen"
            description="Event ini belum memiliki turnamen untuk direkap."
          />
        ) : (
          <div className="space-y-6">
            {tournaments.map((t) => {
              const config = GAME_CONFIG[t.game_slug as GameSlug]
              const GameIcon = config?.icon

              return (
                <div
                  key={t.id}
                  className="print-section rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-zinc-700 p-4">
                    <div className="flex items-center gap-2">
                      {GameIcon && (
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bgColor}`}
                        >
                          <GameIcon size={18} className={config.color} />
                        </span>
                      )}
                      <div>
                        <h3 className="font-semibold text-stone-900 dark:text-zinc-100">
                          {t.name}
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-zinc-400">
                          {config?.name ?? t.game_name} · {FORMAT_LABELS[t.format] ?? t.format}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>

                  {/* Champion highlight */}
                  {t.champion_team_name && (
                    <div className="flex items-center gap-2 border-b border-stone-200 dark:border-zinc-700 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                      <Trophy size={18} className="text-amber-500" weight="fill" />
                      <span className="text-sm text-stone-600 dark:text-zinc-400">Juara:</span>
                      <span className="font-semibold text-stone-900 dark:text-zinc-100">
                        {t.champion_team_name}
                      </span>
                    </div>
                  )}

                  {/* Top-3 standings */}
                  {t.standings.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Peringkat</TableHead>
                            <TableHead>Tim</TableHead>
                            <TableHead>Sekolah</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {t.standings.map((s) => (
                            <TableRow key={s.rank_position}>
                              <TableCell className="font-bold text-stone-700 dark:text-zinc-300">
                                {RANK_MEDAL[s.rank_position] ?? `#${s.rank_position}`}
                              </TableCell>
                              <TableCell className="font-medium text-stone-900 dark:text-zinc-100">
                                {s.team_name}
                              </TableCell>
                              <TableCell className="text-stone-500 dark:text-zinc-400">
                                {s.school_name ?? '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="p-4 text-sm text-stone-400 dark:text-zinc-500">
                      Belum ada klasemen untuk turnamen ini.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
