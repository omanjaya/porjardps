'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { UsersThree } from '@phosphor-icons/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Tournament, TournamentGroup, GroupMatch, GroupStanding } from '@/types'

const FORMAT_NICE_LABELS: Record<string, string> = {
  single_elimination: 'Single Elimination',
  double_elimination: 'Double Elimination',
  round_robin: 'Round Robin',
  group_stage_playoff: 'Grup + Playoff',
  battle_royale_points: 'Battle Royale Points',
}

export default function PublicGroupsPage() {
  const params = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [groups, setGroups] = useState<TournamentGroup[]>([])
  const [groupMatches, setGroupMatches] = useState<Record<string, GroupMatch[]>>({})
  const [groupStandings, setGroupStandings] = useState<Record<string, GroupStanding[]>>({})
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [t, g] = await Promise.all([
        api.get<Tournament>(`/tournaments/${params.id}`),
        api.get<TournamentGroup[]>(`/tournaments/${params.id}/groups`),
      ])
      setTournament(t)
      setGroups(g ?? [])

      const matchesMap: Record<string, GroupMatch[]> = {}
      const standingsMap: Record<string, GroupStanding[]> = {}
      for (const group of g ?? []) {
        const [matches, standings] = await Promise.all([
          api.get<GroupMatch[]>(`/groups/${group.id}/matches`).catch(() => [] as GroupMatch[]),
          api.get<GroupStanding[]>(`/groups/${group.id}/standings`).catch(() => [] as GroupStanding[]),
        ])
        matchesMap[group.id] = matches ?? []
        standingsMap[group.id] = standings ?? []
      }
      setGroupMatches(matchesMap)
      setGroupStandings(standingsMap)
    } catch (err) {
      console.error('Gagal memuat data grup:', err)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useWebSocket({
    channels: [`tournament:${params.id}`],
    messageTypes: ['score_update', 'match_complete', 'standings_update', 'match_status', 'bracket_update'],
    onMessage: () => loadData(),
  })

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
        title="Fase Grup"
        description={tournament?.name}
      />

      {tournament?.format && (
        <div className="-mt-4 mb-6">
          <Badge variant="secondary" className="text-[10px] font-semibold">
            {FORMAT_NICE_LABELS[tournament.format] ?? tournament.format.replace(/_/g, ' ')}
          </Badge>
        </div>
      )}

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={UsersThree}
            title="Belum ada data fase grup"
            description="Fase grup untuk turnamen ini belum dibuat."
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => {
            const standings = groupStandings[group.id] ?? []
            const matches = groupMatches[group.id] ?? []
            const liveMatches = matches.filter((m) => m.status === 'live')
            const completedMatches = matches.filter((m) => m.status === 'completed')

            return (
              <Card key={group.id} className="overflow-hidden">
                <div className="border-b border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 px-6 py-4">
                  <h3 className="text-lg font-semibold text-stone-900 dark:text-zinc-100">{group.name}</h3>
                  <p className="text-sm text-stone-500 dark:text-zinc-400">
                    {standings.length} tim &middot; Top {group.advance_count} lolos
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Standings Table */}
                  {standings.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-zinc-700">
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {standings.map((s) => (
                            <TableRow
                              key={s.team_id}
                              className={
                                s.rank_position <= group.advance_count
                                  ? 'bg-green-50 dark:bg-green-950'
                                  : ''
                              }
                            >
                              <TableCell className="text-center">
                                <span
                                  className={
                                    s.rank_position <= group.advance_count
                                      ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white'
                                      : 'font-medium'
                                  }
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
                                  className={
                                    s.goal_difference > 0
                                      ? 'text-green-600 dark:text-green-400'
                                      : s.goal_difference < 0
                                        ? 'text-red-600 dark:text-red-400'
                                        : ''
                                  }
                                >
                                  {s.goal_difference > 0 ? '+' : ''}
                                  {s.goal_difference}
                                </span>
                              </TableCell>
                              <TableCell className="text-center font-bold">{s.points}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

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

                  {/* Match Results */}
                  {completedMatches.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-stone-700 dark:text-zinc-300">Hasil Pertandingan</h4>
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
                  {matches.filter((m) => m.status !== 'completed' && m.status !== 'live').length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-stone-700 dark:text-zinc-300">Pertandingan Mendatang</h4>
                      <div className="space-y-2">
                        {matches
                          .filter((m) => m.status !== 'completed' && m.status !== 'live')
                          .map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-zinc-700 px-4 py-3"
                            >
                              <span className="flex-1 text-right text-sm font-medium text-stone-600 dark:text-zinc-400">
                                {m.team_a?.name ?? '-'}
                              </span>
                              <div className="mx-4">
                                <Badge variant="secondary">R{m.round}</Badge>
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
