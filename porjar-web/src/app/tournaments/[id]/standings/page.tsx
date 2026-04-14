'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { PageHeader } from '@/components/shared/PageHeader'
import { BRLeaderboard } from '@/components/modules/battle-royale/BRLeaderboard'
import { DailyStandings } from '@/components/modules/battle-royale/DailyStandings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, CheckCircle, XCircle, ChartBar } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { downloadCSV } from '@/lib/csv'
import { ExportButton } from '@/components/shared/ExportButton'
import type { Tournament, Standing, BRLobby, TeamSummary } from '@/types'

export default function StandingsPage() {
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [lobbies, setLobbies] = useState<BRLobby[]>([])
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      // Fetch all data in parallel to avoid waterfall
      const [t, s, l, tm] = await Promise.all([
        api.get<Tournament>(`/tournaments/${params.id}`),
        api.get<Standing[]>(`/tournaments/${params.id}/standings`),
        api.get<BRLobby[]>(`/tournaments/${params.id}/lobbies`).catch(() => [] as BRLobby[]),
        api.get<TeamSummary[]>(`/tournaments/${params.id}/teams`).catch(() => [] as TeamSummary[]),
      ])
      setTournament(t)
      setStandings(s ?? [])

      if (t.format === 'battle_royale_points') {
        setLobbies(l ?? [])
        setTeams(tm ?? [])
      }
    } catch (err) {
      console.error('Gagal memuat standings:', err)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useWebSocket({
    channels: [`tournament:${params.id}`],
    messageTypes: ['score_update', 'match_complete', 'standings_update', 'br_result_update'],
    onMessage: () => loadData(),
  })

  // Get unique day numbers from lobbies
  const dayNumbers = useMemo(
    () => [...new Set(lobbies.map((l) => l.day_number))].sort((a, b) => a - b),
    [lobbies]
  )

  // Memoize sorted standings to avoid re-sorting on every render
  const sortedStandings = useMemo(
    () => [...standings].sort((a, b) => a.rank_position - b.rank_position),
    [standings]
  )

  // Find qualification line position in overall standings
  const qualLineAfter = useMemo(() => {
    const threshold = tournament?.qualification_threshold ?? null
    if (threshold == null || threshold <= 0) return -1
    let line = -1
    for (let i = 0; i < sortedStandings.length; i++) {
      if (sortedStandings[i].total_points >= threshold) {
        line = i
      }
    }
    return line
  }, [sortedStandings, tournament?.qualification_threshold])

  if (loading) {
    return (
      <>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 bg-stone-100 dark:bg-zinc-800" />
          <Skeleton className="h-96 w-full bg-stone-100 dark:bg-zinc-800" />
        </div>
      </>
    )
  }

  if (!tournament) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold text-stone-600 dark:text-zinc-400">Turnamen tidak ditemukan</p>
          <p className="mt-1 text-sm text-stone-400 dark:text-zinc-500">Turnamen mungkin sudah dihapus atau URL salah.</p>
        </div>
      </>
    )
  }

  const isBR = tournament.format === 'battle_royale_points'

  const qualificationThreshold = tournament.qualification_threshold ?? null

  function handleExportCSV() {
    const data = sortedStandings.map((s) => ({
      rank: s.rank_position,
      team: s.team.name,
      matches_played: s.matches_played,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      total_points: s.total_points,
      total_kills: s.total_kills,
      total_placement_points: s.total_placement_points,
      best_placement: s.best_placement,
      avg_placement: s.avg_placement,
      eliminated: s.is_eliminated ? 'Ya' : 'Tidak',
    }))

    const columns = isBR
      ? [
          { key: 'rank', header: 'Ranking' },
          { key: 'team', header: 'Tim' },
          { key: 'total_points', header: 'Total Poin' },
          { key: 'total_kills', header: 'Total Kill' },
          { key: 'total_placement_points', header: 'Poin Placement' },
          { key: 'best_placement', header: 'Best Placement' },
          { key: 'avg_placement', header: 'Avg Placement' },
        ]
      : [
          { key: 'rank', header: 'Ranking' },
          { key: 'team', header: 'Tim' },
          { key: 'matches_played', header: 'Main' },
          { key: 'wins', header: 'Menang' },
          { key: 'losses', header: 'Kalah' },
          { key: 'draws', header: 'Seri' },
          { key: 'total_points', header: 'Poin' },
        ]

    downloadCSV(data, `klasemen-${tournament!.name.replace(/\s+/g, '-').toLowerCase()}.csv`, columns)
  }

  return (
    <>
      <PageHeader
        title="Klasemen"
        description={tournament.name}
        breadcrumbs={[
          { label: 'Turnamen', href: '/tournaments' },
          { label: tournament.name, href: `/tournaments/${tournament.id}` },
          { label: 'Klasemen' },
        ]}
        actions={
          standings.length > 0 && (
            <ExportButton
              options={[
                { label: 'Export CSV', type: 'csv', onExport: handleExportCSV },
              ]}
            />
          )
        }
      />

      <div className="mb-4">
        <Link href={`/tournaments/${params.id}/report`} className="inline-flex items-center gap-1.5 text-sm font-medium text-esi-red hover:underline">
          <ChartBar size={14} />
          Lihat Laporan
        </Link>
      </div>

      {isBR ? (
        <Tabs defaultValue="overall">
          <TabsList className="bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 overflow-x-auto scrollbar-hide h-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <TabsTrigger value="overall" className="text-stone-600 dark:text-zinc-400 data-active:bg-esi-red data-active:text-white">
              Keseluruhan
            </TabsTrigger>
            {dayNumbers.map((day) => (
              <TabsTrigger
                key={`day-${day}`}
                value={`day-${day}`}
                className="text-stone-600 dark:text-zinc-400 data-active:bg-esi-red data-active:text-white"
              >
                Hari {day}
              </TabsTrigger>
            ))}
            {lobbies.map((lobby) => (
              <TabsTrigger
                key={lobby.id}
                value={lobby.id}
                className="text-stone-600 dark:text-zinc-400 data-active:bg-esi-red data-active:text-white"
              >
                {lobby.lobby_name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overall standings with qualification visual */}
          <TabsContent value="overall" className="mt-4">
            {qualificationThreshold != null && qualificationThreshold > 0 && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 px-4 py-2.5">
                <CheckCircle size={16} weight="fill" className="text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Batas kualifikasi: <strong>{qualificationThreshold} poin</strong>
                </span>
              </div>
            )}

            <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-stone-200 dark:border-zinc-700 bg-esi-red/5 hover:bg-esi-red/5">
                    <TableHead className="w-16 text-stone-600 dark:text-zinc-400 font-semibold">#</TableHead>
                    <TableHead className="text-stone-600 dark:text-zinc-400 font-semibold">Tim</TableHead>
                    <TableHead className="text-right text-stone-600 dark:text-zinc-400 font-semibold">Total Poin</TableHead>
                    <TableHead className="text-right text-stone-600 dark:text-zinc-400 font-semibold">Kills</TableHead>
                    <TableHead className="hidden sm:table-cell text-right text-stone-600 dark:text-zinc-400 font-semibold">Placement</TableHead>
                    <TableHead className="hidden sm:table-cell text-right text-stone-600 dark:text-zinc-400 font-semibold">Best</TableHead>
                    {qualificationThreshold != null && (
                      <TableHead className="text-center text-stone-600 dark:text-zinc-400 font-semibold">Status</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStandings.map((s, idx) => {
                      const isAboveThreshold =
                        qualificationThreshold != null && s.total_points >= qualificationThreshold
                      const showQualLine = idx === qualLineAfter && qualificationThreshold != null

                      return (
                        <>
                          <TableRow
                            key={s.team.id}
                            className={cn(
                              'border-stone-100 dark:border-zinc-800 hover:bg-stone-50 dark:bg-zinc-800/50',
                              s.is_eliminated && 'opacity-50',
                              isAboveThreshold && qualificationThreshold != null && 'bg-green-50/50 dark:bg-green-950/30',
                              !isAboveThreshold && qualificationThreshold != null && 'bg-red-50 dark:bg-red-950/30'
                            )}
                          >
                            <TableCell className="font-bold text-stone-700 dark:text-zinc-300">
                              <div className="flex items-center gap-1.5">
                                {s.rank_position <= 3 && (
                                  <Trophy
                                    size={14}
                                    weight="fill"
                                    className={cn(
                                      s.rank_position === 1 && 'text-amber-500',
                                      s.rank_position === 2 && 'text-stone-400 dark:text-zinc-500',
                                      s.rank_position === 3 && 'text-amber-700'
                                    )}
                                  />
                                )}
                                {s.rank_position}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-stone-900 dark:text-zinc-100">{s.team.name}</span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-esi-red tabular-nums">
                              {s.total_points}
                            </TableCell>
                            <TableCell className="text-right text-stone-700 dark:text-zinc-300 tabular-nums">
                              {s.total_kills}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right text-stone-700 dark:text-zinc-300 tabular-nums">
                              {s.total_placement_points}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right text-stone-500 dark:text-zinc-400 tabular-nums">
                              {s.best_placement ?? '-'}
                            </TableCell>
                            {qualificationThreshold != null && (
                              <TableCell className="text-center">
                                {isAboveThreshold ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                                    <CheckCircle size={12} weight="fill" />
                                    Lolos
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                                    <XCircle size={12} weight="fill" />
                                    Tersingkir
                                  </span>
                                )}
                              </TableCell>
                            )}
                          </TableRow>

                          {/* Qualification line */}
                          {showQualLine && (
                            <TableRow key={`qual-line-${idx}`} className="border-0">
                              <TableCell colSpan={qualificationThreshold != null ? 7 : 6} className="p-0">
                                <div className="relative flex items-center py-1">
                                  <div className="flex-1 border-t-2 border-dashed border-esi-red/50" />
                                  <span className="mx-3 text-[10px] font-semibold uppercase tracking-widest text-esi-red">
                                    Batas Kualifikasi ({qualificationThreshold} pts)
                                  </span>
                                  <div className="flex-1 border-t-2 border-dashed border-esi-red/50" />
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                </TableBody>
              </Table>
              </div>
            </div>
          </TabsContent>

          {/* Day-specific standings */}
          {dayNumbers.map((day) => (
            <TabsContent key={`day-${day}`} value={`day-${day}`} className="mt-4">
              <DailyStandings
                tournamentId={params.id}
                dayNumber={day}
                qualificationThreshold={qualificationThreshold}
                teams={teams}
              />
            </TabsContent>
          ))}

          {/* Per-lobby breakdown (kept from original) */}
          {lobbies.map((lobby) => {
            const lobbyStandings = (lobby.results ?? [])
              .sort((a, b) => a.placement - b.placement)
              .map((r, i) => ({
                rank_position: i + 1,
                team: r.team,
                matches_played: 1,
                wins: r.placement === 1 ? 1 : 0,
                losses: r.placement === 1 ? 0 : 1,
                draws: 0,
                total_points: r.total_points,
                total_kills: r.kills,
                total_placement_points: r.placement_points,
                best_placement: r.placement,
                avg_placement: r.placement,
                is_eliminated: false,
                wwcd_count: r.placement === 1 ? 1 : 0,
              }))
            return (
              <TabsContent key={lobby.id} value={lobby.id} className="mt-4">
                <BRLeaderboard standings={lobbyStandings} lobbies={[lobby]} tournamentId={params.id} />
              </TabsContent>
            )
          })}
        </Tabs>
      ) : (
        /* Bracket W/L table */
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200 dark:border-zinc-700 bg-esi-red/5 hover:bg-esi-red/5">
                <TableHead className="w-16 text-stone-600 dark:text-zinc-400 font-semibold">#</TableHead>
                <TableHead className="text-stone-600 dark:text-zinc-400 font-semibold">Tim</TableHead>
                <TableHead className="text-center text-stone-600 dark:text-zinc-400 font-semibold">Main</TableHead>
                <TableHead className="text-center text-stone-600 dark:text-zinc-400 font-semibold">Menang</TableHead>
                <TableHead className="text-center text-stone-600 dark:text-zinc-400 font-semibold">Kalah</TableHead>
                <TableHead className="text-center text-stone-600 dark:text-zinc-400 font-semibold">Seri</TableHead>
                <TableHead className="text-right text-stone-600 dark:text-zinc-400 font-semibold">Poin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStandings.map((s) => (
                  <TableRow
                    key={s.team.id}
                    className={cn(
                      'border-stone-100 dark:border-zinc-800 hover:bg-stone-50 dark:bg-zinc-800/50',
                      s.is_eliminated && 'opacity-50'
                    )}
                  >
                    <TableCell className="font-bold text-stone-700 dark:text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        {s.rank_position <= 3 && (
                          <Trophy
                            size={14}
                            weight="fill"
                            className={cn(
                              s.rank_position === 1 && 'text-amber-500',
                              s.rank_position === 2 && 'text-stone-400 dark:text-zinc-500',
                              s.rank_position === 3 && 'text-amber-700'
                            )}
                          />
                        )}
                        {s.rank_position}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-stone-900 dark:text-zinc-100">{s.team.name}</span>
                    </TableCell>
                    <TableCell className="text-center text-stone-500 dark:text-zinc-400 tabular-nums">
                      {s.matches_played}
                    </TableCell>
                    <TableCell className="text-center text-green-600 dark:text-green-400 tabular-nums">
                      {s.wins}
                    </TableCell>
                    <TableCell className="text-center text-red-600 dark:text-red-400 tabular-nums">
                      {s.losses}
                    </TableCell>
                    <TableCell className="text-center text-stone-500 dark:text-zinc-400 tabular-nums">
                      {s.draws}
                    </TableCell>
                    <TableCell className="text-right font-bold text-esi-red tabular-nums">
                      {s.total_points}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          </div>
        </div>
      )}
    </>
  )
}
