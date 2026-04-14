'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle, Clock, Circle, ChartBar } from '@phosphor-icons/react'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import type { Tournament, TournamentGroup, GroupMatch, GroupStanding } from '@/types'

interface SwissStatus {
  current_round: number
  max_rounds: number
  qualified_count: number
  eliminated_count: number
  active_count: number
  is_complete: boolean
}

export default function PublicSwissPage() {
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [swissGroup, setSwissGroup] = useState<TournamentGroup | null>(null)
  const [matches, setMatches] = useState<GroupMatch[]>([])
  const [standings, setStandings] = useState<GroupStanding[]>([])
  const [swissStatus, setSwissStatus] = useState<SwissStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [t, groups] = await Promise.all([
        api.get<Tournament>(`/tournaments/${params.id}`),
        api.get<TournamentGroup[]>(`/tournaments/${params.id}/groups`),
      ])
      setTournament(t)

      const sg = (groups ?? []).find(g => g.pairing_mode === 'swiss') ?? null
      setSwissGroup(sg)

      if (sg) {
        const [m, s, status] = await Promise.all([
          api.get<GroupMatch[]>(`/groups/${sg.id}/matches`).catch(() => [] as GroupMatch[]),
          api.get<GroupStanding[]>(`/groups/${sg.id}/standings`).catch(() => [] as GroupStanding[]),
          api.get<SwissStatus>(`/groups/${sg.id}/swiss/status`).catch(() => null),
        ])
        setMatches(m ?? [])
        setStandings(s ?? [])
        setSwissStatus(status)
      }
    } catch (err) {
      console.error('Gagal memuat data swiss:', err)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => { loadData() }, [loadData])

  useWebSocket({
    channels: [`tournament:${params.id}`],
    messageTypes: ['score_update', 'match_complete', 'standings_update', 'match_status', 'bracket_update'],
    onMessage: () => loadData(),
  })

  // Group matches by round
  const matchesByRound: Record<number, GroupMatch[]> = {}
  for (const m of matches) {
    if (!matchesByRound[m.round]) matchesByRound[m.round] = []
    matchesByRound[m.round].push(m)
  }
  const roundNumbers = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b)

  if (loading) {
    return (
      <>
        <Skeleton className="h-10 w-64 bg-stone-200 dark:bg-zinc-700" />
        <div className="mt-4 space-y-6">
          <Skeleton className="h-64 w-full bg-stone-200 dark:bg-zinc-700" />
          <Skeleton className="h-64 w-full bg-stone-200 dark:bg-zinc-700" />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Swiss System"
        description={tournament?.name}
      />

      {/* Swiss Status Summary */}
      {swissStatus && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="p-4 text-center">
            <p className="text-2xl font-black text-stone-900 dark:text-zinc-100">
              {swissStatus.current_round}<span className="text-sm font-normal text-stone-400 dark:text-zinc-500">/{swissStatus.max_rounds}</span>
            </p>
            <p className="text-xs text-stone-500 dark:text-zinc-400">Round</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-black text-green-600">{swissStatus.qualified_count}</p>
            <p className="text-xs text-stone-500 dark:text-zinc-400">Lolos</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-black text-red-500">{swissStatus.eliminated_count}</p>
            <p className="text-xs text-stone-500 dark:text-zinc-400">Gugur</p>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5">
              {swissStatus.is_complete ? (
                <CheckCircle size={18} weight="fill" className="text-green-500" />
              ) : (
                <Clock size={18} className="text-amber-500" />
              )}
              <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                {swissStatus.is_complete ? 'Selesai' : 'Berlangsung'}
              </p>
            </div>
            <p className="text-xs text-stone-500 dark:text-zinc-400">Status</p>
          </Card>
        </div>
      )}

      {!swissGroup ? (
        <Card>
          <EmptyState
            icon={ChartBar}
            title="Belum ada data Swiss System"
            description="Swiss System untuk turnamen ini belum dibuat."
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Standings Table */}
          {standings.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 px-6 py-4">
                <h3 className="text-lg font-semibold text-stone-900 dark:text-zinc-100">Klasemen</h3>
                <p className="text-sm text-stone-500 dark:text-zinc-400">
                  {standings.length} tim
                  {swissGroup.swiss_config && ` \u00b7 Win ${swissGroup.swiss_config.win_threshold}x = Lolos \u00b7 Lose ${swissGroup.swiss_config.loss_threshold}x = Gugur`}
                </p>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-stone-50 dark:bg-zinc-800/50">
                      <TableHead className="w-12 text-center">Pos</TableHead>
                      <TableHead>Tim</TableHead>
                      <TableHead className="text-center">MP</TableHead>
                      <TableHead className="text-center">W</TableHead>
                      <TableHead className="text-center">D</TableHead>
                      <TableHead className="text-center">L</TableHead>
                      <TableHead className="hidden sm:table-cell text-center">SM</TableHead>
                      <TableHead className="hidden sm:table-cell text-center">SK</TableHead>
                      <TableHead className="hidden sm:table-cell text-center">SS</TableHead>
                      <TableHead className="text-center">Pts</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((s) => {
                      const wt = swissGroup?.swiss_config?.win_threshold ?? 3
                      const lt = swissGroup?.swiss_config?.loss_threshold ?? 3
                      const qualified = s.wins >= wt
                      const eliminated = s.losses >= lt

                      return (
                        <TableRow
                          key={s.team_id}
                          className={cn(
                            qualified ? 'bg-green-50 dark:bg-green-950' : '',
                            eliminated ? 'bg-red-50 dark:bg-red-950/20' : '',
                          )}
                        >
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                                qualified
                                  ? 'bg-green-600 text-white'
                                  : eliminated
                                    ? 'bg-red-500 text-white'
                                    : 'font-medium',
                              )}
                            >
                              {s.rank_position}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{s.team?.name ?? '-'}</TableCell>
                          <TableCell className="text-center">{s.matches_played}</TableCell>
                          <TableCell className="text-center">{s.wins}</TableCell>
                          <TableCell className="text-center">{s.draws}</TableCell>
                          <TableCell className="text-center">{s.losses}</TableCell>
                          <TableCell className="hidden sm:table-cell text-center">{s.goals_for}</TableCell>
                          <TableCell className="hidden sm:table-cell text-center">{s.goals_against}</TableCell>
                          <TableCell className="hidden sm:table-cell text-center">
                            <span
                              className={cn(
                                s.goal_difference > 0 ? 'text-green-600 dark:text-green-400' : s.goal_difference < 0 ? 'text-red-600 dark:text-red-400' : '',
                              )}
                            >
                              {s.goal_difference > 0 ? '+' : ''}{s.goal_difference}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-bold">{s.points}</TableCell>
                          <TableCell className="text-center">
                            {qualified ? (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-[10px]">Lolos</Badge>
                            ) : eliminated ? (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[10px]">Gugur</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Aktif</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Matches by Round */}
          {roundNumbers.map((round) => {
            const roundMatches = matchesByRound[round]
            const liveMatches = roundMatches.filter(m => m.status === 'live')
            const completedMatches = roundMatches.filter(m => m.status === 'completed')
            const pendingMatches = roundMatches.filter(m => m.status === 'pending')
            const allDone = completedMatches.length === roundMatches.length

            return (
              <Card key={round} className="overflow-hidden">
                <div className="border-b border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900 dark:text-zinc-100">Round {round}</h3>
                    <p className="text-sm text-stone-500 dark:text-zinc-400">
                      {completedMatches.length}/{roundMatches.length} selesai
                    </p>
                  </div>
                  {allDone && <CheckCircle size={20} weight="fill" className="text-green-500" />}
                </div>

                <div className="p-6 space-y-4">
                  {/* Live Matches */}
                  {liveMatches.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        Sedang Berlangsung
                      </h4>
                      <div className="space-y-2">
                        {liveMatches.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3"
                          >
                            <span className="flex-1 text-right text-sm font-medium text-stone-700 dark:text-zinc-300">
                              {m.team_a?.name ?? '-'}
                            </span>
                            <div className="mx-4 flex items-center gap-2">
                              <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0 animate-pulse">LIVE</Badge>
                            </div>
                            <span className="flex-1 text-left text-sm font-medium text-stone-700 dark:text-zinc-300">
                              {m.team_b?.name ?? '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Matches */}
                  {completedMatches.length > 0 && (
                    <div>
                      {liveMatches.length > 0 && (
                        <h4 className="mb-3 text-sm font-medium text-stone-700 dark:text-zinc-300">Hasil Pertandingan</h4>
                      )}
                      <div className="space-y-2">
                        {completedMatches.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-zinc-700 px-4 py-3"
                          >
                            <span
                              className={`flex-1 text-right text-sm font-medium ${
                                m.score_a > m.score_b ? 'text-green-700 dark:text-green-400' : 'text-stone-600 dark:text-zinc-400'
                              }`}
                            >
                              {m.team_a?.name ?? '-'}
                            </span>
                            <div className="mx-4 flex items-center gap-2">
                              <span className="text-lg font-bold tabular-nums">{m.score_a}</span>
                              <span className="text-stone-400 dark:text-zinc-500">-</span>
                              <span className="text-lg font-bold tabular-nums">{m.score_b}</span>
                            </div>
                            <span
                              className={`flex-1 text-left text-sm font-medium ${
                                m.score_b > m.score_a ? 'text-green-700 dark:text-green-400' : 'text-stone-600 dark:text-zinc-400'
                              }`}
                            >
                              {m.team_b?.name ?? '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Matches */}
                  {pendingMatches.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-stone-700 dark:text-zinc-300">Pertandingan Mendatang</h4>
                      <div className="space-y-2">
                        {pendingMatches.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-zinc-700 px-4 py-3"
                          >
                            <span className="flex-1 text-right text-sm font-medium text-stone-600 dark:text-zinc-400">
                              {m.team_a?.name ?? '-'}
                            </span>
                            <div className="mx-4">
                              <Badge variant="secondary">vs</Badge>
                            </div>
                            <span className="flex-1 text-left text-sm font-medium text-stone-600 dark:text-zinc-400">
                              {m.team_b?.name ?? '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
