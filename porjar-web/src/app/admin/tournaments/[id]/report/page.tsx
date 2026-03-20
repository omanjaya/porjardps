'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Printer,
  DownloadSimple,
  ShareNetwork,
  Trophy,
  UsersThree,
  GameController,
} from '@phosphor-icons/react'
import { ReportStatsCards } from './ReportStatsCards'
import { ReportMatchHistory } from './ReportMatchHistory'
import { ReportTopPlayers } from './ReportTopPlayers'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface TournamentReport {
  generated_at: string
  tournament: TournamentInfo
  teams: ReportTeam[]
  matches: ReportMatch[]
  lobbies: ReportLobby[]
  standings: ReportStanding[]
  top_players: TopPlayersSection
  statistics: ReportStatistics
}

interface TournamentInfo {
  id: string
  name: string
  game_name: string
  game_slug: string
  format: string
  stage: string
  best_of: number
  status: string
  max_teams: number | null
  start_date: string | null
  end_date: string | null
  registration_start: string | null
  registration_end: string | null
}

interface ReportTeam {
  id: string
  name: string
  seed: number | null
  logo_url: string | null
  status: string
  school: string | null
}

interface ReportMatch {
  id: string
  round: number
  match_number: number
  team_a_name: string | null
  team_b_name: string | null
  winner_name: string | null
  score_a: number | null
  score_b: number | null
  status: string
  completed_at: string | null
  bracket_position: string | null
}

interface ReportLobby {
  id: string
  lobby_name: string
  lobby_number: number
  day_number: number
  status: string
  results: ReportLobbyResult[]
}

interface ReportLobbyResult {
  team_name: string
  placement: number
  kills: number
  placement_points: number
  kill_points: number
  total_points: number
}

interface ReportStanding {
  rank_position: number | null
  team_name: string
  matches_played: number
  wins: number
  losses: number
  draws: number
  total_points: number
  total_kills: number
  total_placement_points: number
  best_placement: number | null
  avg_placement: number | null
  is_eliminated: boolean
}

interface TopPlayersSection {
  most_mvps: PlayerStat[]
  most_kills: PlayerStat[]
}

interface PlayerStat {
  player_name: string
  team_name: string
  value: number
}

interface ReportStatistics {
  total_teams: number
  total_matches: number
  completed_matches: number
  total_lobbies: number
  completed_lobbies: number
  total_games_played: number
  avg_duration_mins: number
}

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: 'Single Elimination',
  double_elimination: 'Double Elimination',
  round_robin: 'Round Robin',
  swiss: 'Swiss',
  battle_royale_points: 'Battle Royale Points',
  group_stage_playoff: 'Group Stage + Playoff',
}

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Akan Datang',
  registration: 'Pendaftaran',
  ongoing: 'Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function TournamentReportPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const params = useParams<{ id: string }>()
  const [report, setReport] = useState<TournamentReport | null>(null)
  const [loading, setLoading] = useState(true)

  const loadReport = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const r = await api.get<TournamentReport>(`/admin/tournaments/${params.id}/report`)
      if (r) {
        r.standings = r.standings ?? []
        r.matches = r.matches ?? []
        r.lobbies = r.lobbies ?? []
        r.teams = r.teams ?? []
        r.top_players = r.top_players ?? { most_mvps: [], most_kills: [] }
        r.top_players.most_mvps = r.top_players.most_mvps ?? []
        r.top_players.most_kills = r.top_players.most_kills ?? []
      }
      setReport(r)
    } catch {
      toast.error('Gagal memuat laporan turnamen')
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

  async function handleDownloadJSON() {
    if (!report) return
    const data = JSON.stringify(report, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-${report.tournament.name.replace(/\s+/g, '-').toLowerCase()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleShare() {
    if (!report) return
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link laporan disalin ke clipboard')
    } catch {
      toast.error('Gagal menyalin link')
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 bg-slate-800" />
        <Skeleton className="mt-4 h-12 w-full bg-slate-800" />
        <Skeleton className="mt-4 h-96 w-full bg-slate-800" />
      </AdminLayout>
    )
  }

  if (!report) {
    return (
      <AdminLayout>
        <div className="py-16 text-center text-slate-400">Laporan tidak tersedia</div>
      </AdminLayout>
    )
  }

  const t = report.tournament

  return (
    <AdminLayout>
      {/* Print-only styles */}
      <style>{`
        @media print {
          nav, aside, header, button, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-container {
            max-width: 100% !important;
            padding: 0 !important;
            color: black !important;
          }
          .print-container * {
            color: black !important;
            border-color: #ccc !important;
            background: white !important;
          }
          .print-section { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print">
        <PageHeader
          title="Laporan Turnamen"
          description={t.name}
          breadcrumbs={[
            { label: 'Turnamen', href: '/admin/tournaments' },
            { label: t.name, href: `/admin/tournaments/${params.id}` },
            { label: 'Laporan' },
          ]}
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleShare}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ShareNetwork className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadJSON}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <DownloadSimple className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
              <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          }
        />
      </div>

      <div className="print-container space-y-8">
        {/* Tournament Header */}
        <div className="print-section rounded-xl border border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-50">{t.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <GameController className="h-4 w-4" />
                  {t.game_name}
                </span>
                <Badge variant="outline" className="border-slate-600 text-slate-300">
                  {FORMAT_LABELS[t.format] || t.format}
                </Badge>
                <Badge
                  className={
                    t.status === 'completed'
                      ? 'bg-green-900/50 text-green-400'
                      : t.status === 'ongoing'
                        ? 'bg-blue-900/50 text-blue-400'
                        : 'bg-slate-700 text-slate-300'
                  }
                >
                  {STATUS_LABELS[t.status] || t.status}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                {t.start_date && (
                  <span>Mulai: {formatDate(t.start_date)}</span>
                )}
                {t.end_date && (
                  <span>Selesai: {formatDate(t.end_date)}</span>
                )}
                {t.best_of > 1 && <span>Best of {t.best_of}</span>}
                {t.max_teams && <span>Maks {t.max_teams} tim</span>}
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              Laporan dibuat: {formatDateTime(report.generated_at)}
            </div>
          </div>
        </div>

        {/* Statistics Summary */}
        <ReportStatsCards statistics={report.statistics} />

        {/* Final Standings */}
        {report.standings.length > 0 && (
          <div className="print-section">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-200">
              <Trophy className="h-5 w-5" />
              Klasemen Akhir
            </h3>
            <div className="overflow-hidden rounded-lg border border-slate-700">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="w-16 text-slate-400">#</TableHead>
                    <TableHead className="text-slate-400">Tim</TableHead>
                    <TableHead className="text-center text-slate-400">Main</TableHead>
                    <TableHead className="text-center text-slate-400">M</TableHead>
                    <TableHead className="text-center text-slate-400">K</TableHead>
                    <TableHead className="text-center text-slate-400">S</TableHead>
                    <TableHead className="text-center text-slate-400">Poin</TableHead>
                    {report.standings.some((s) => s.total_kills > 0) && (
                      <TableHead className="text-center text-slate-400">Kills</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.standings.map((s, i) => (
                    <TableRow key={i} className="border-slate-700 hover:bg-slate-800/50">
                      <TableCell className="font-bold text-slate-300">
                        {s.rank_position ?? i + 1}
                      </TableCell>
                      <TableCell className="font-medium text-slate-200">
                        {s.team_name}
                        {s.is_eliminated && (
                          <Badge className="ml-2 bg-red-900/50 text-xs text-red-400">
                            Eliminasi
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-slate-300">
                        {s.matches_played}
                      </TableCell>
                      <TableCell className="text-center text-green-400">{s.wins}</TableCell>
                      <TableCell className="text-center text-red-400">{s.losses}</TableCell>
                      <TableCell className="text-center text-slate-400">{s.draws}</TableCell>
                      <TableCell className="text-center font-bold text-slate-200">
                        {s.total_points}
                      </TableCell>
                      {report.standings.some((st) => st.total_kills > 0) && (
                        <TableCell className="text-center text-slate-300">
                          {s.total_kills}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          </div>
        )}

        {/* Match Results */}
        <ReportMatchHistory matches={report.matches} />

        {/* Lobby Results (Battle Royale) */}
        {report.lobbies.length > 0 && (
          <div className="print-section">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-200">
              <GameController className="h-5 w-5" />
              Hasil Lobby
            </h3>
            {report.lobbies.map((lobby) => (
              <div key={lobby.id} className="mb-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-400">
                  {lobby.lobby_name} (Hari {lobby.day_number})
                  <Badge
                    className={`ml-2 ${
                      lobby.status === 'completed'
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {lobby.status}
                  </Badge>
                </h4>
                {lobby.results.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-slate-700">
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-transparent">
                          <TableHead className="w-16 text-slate-400">#</TableHead>
                          <TableHead className="text-slate-400">Tim</TableHead>
                          <TableHead className="text-center text-slate-400">Kills</TableHead>
                          <TableHead className="text-center text-slate-400">Placement Pts</TableHead>
                          <TableHead className="text-center text-slate-400">Kill Pts</TableHead>
                          <TableHead className="text-center text-slate-400">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lobby.results
                          .sort((a, b) => a.placement - b.placement)
                          .map((r, i) => (
                            <TableRow key={i} className="border-slate-700 hover:bg-slate-800/50">
                              <TableCell className="font-bold text-slate-300">
                                {r.placement}
                              </TableCell>
                              <TableCell className="text-slate-200">{r.team_name}</TableCell>
                              <TableCell className="text-center text-slate-300">
                                {r.kills}
                              </TableCell>
                              <TableCell className="text-center text-slate-300">
                                {r.placement_points}
                              </TableCell>
                              <TableCell className="text-center text-slate-300">
                                {r.kill_points}
                              </TableCell>
                              <TableCell className="text-center font-bold text-slate-200">
                                {r.total_points}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Top Players */}
        <ReportTopPlayers topPlayers={report.top_players} />

        {/* Team List */}
        <div className="print-section">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-200">
            <UsersThree className="h-5 w-5" />
            Daftar Tim ({report.teams.length})
          </h3>
          <div className="overflow-hidden rounded-lg border border-slate-700">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="w-16 text-slate-400">Seed</TableHead>
                  <TableHead className="text-slate-400">Tim</TableHead>
                  <TableHead className="text-slate-400">Sekolah</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.teams.map((team) => (
                  <TableRow key={team.id} className="border-slate-700 hover:bg-slate-800/50">
                    <TableCell className="text-slate-400">{team.seed ?? '-'}</TableCell>
                    <TableCell className="font-medium text-slate-200">{team.name}</TableCell>
                    <TableCell className="text-slate-400">{team.school || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          team.status === 'approved'
                            ? 'border-green-700 text-green-400'
                            : team.status === 'pending'
                              ? 'border-yellow-700 text-yellow-400'
                              : 'border-slate-600 text-slate-400'
                        }`}
                      >
                        {team.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
