'use client'

import { Fragment } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CaretDown,
  CaretUp,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
  WarningCircle,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { BRLobbyResults } from './BRLobbyResults'
import type { Standing, BRLobby, TeamMember } from '@/types'

export type SortKey = 'rank_position' | 'total_points' | 'total_kills' | 'total_placement_points'
export type SortDir = 'asc' | 'desc'

export interface TeamExtras {
  wwcdCount: number
  totalPenalties: number
  hasDnf: boolean
  hasDns: boolean
}

interface BRLeaderboardTableProps {
  sorted: Standing[]
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  expandedTeamId: string | null
  onToggleExpand: (teamId: string) => void
  teamExtras: Record<string, TeamExtras>
  teamMembers: Record<string, TeamMember[]>
  previousRanks: Record<string, number>
  qualLineIdx: number
  getTeamLobbyResults: (teamId: string) => { lobby: BRLobby; result: BRLobby['results'][0] }[]
}

function SortIndicator({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== column) return null
  return sortDir === 'asc' ? (
    <CaretUp size={12} weight="bold" className="inline ml-0.5" />
  ) : (
    <CaretDown size={12} weight="bold" className="inline ml-0.5" />
  )
}

export function BRLeaderboardTable({
  sorted,
  sortKey,
  sortDir,
  onSort,
  expandedTeamId,
  onToggleExpand,
  teamExtras,
  teamMembers,
  previousRanks,
  qualLineIdx,
  getTeamLobbyResults,
}: BRLeaderboardTableProps) {
  function getRankChange(teamId: string, currentRank: number): number | null {
    const prev = previousRanks[teamId]
    if (prev === undefined) return null
    return prev - currentRank
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-stone-200 hover:bg-transparent">
            <TableHead
              className="w-16 cursor-pointer text-stone-500 hover:text-stone-700"
              onClick={() => onSort('rank_position')}
            >
              # <SortIndicator column="rank_position" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead className="text-stone-500">Tim</TableHead>
            <TableHead
              className="text-right cursor-pointer text-stone-500 hover:text-stone-700"
              onClick={() => onSort('total_points')}
            >
              Total Poin <SortIndicator column="total_points" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead
              className="text-right cursor-pointer text-stone-500 hover:text-stone-700"
              onClick={() => onSort('total_kills')}
            >
              Kills <SortIndicator column="total_kills" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead
              className="text-right cursor-pointer text-stone-500 hover:text-stone-700"
              onClick={() => onSort('total_placement_points')}
            >
              Placement <SortIndicator column="total_placement_points" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead className="text-center text-stone-500 w-14">WWCD</TableHead>
            <TableHead className="text-right text-stone-500">Best</TableHead>
            <TableHead className="text-center text-stone-500 w-14">Move</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((standing, idx) => {
            const isExpanded = expandedTeamId === standing.team.id
            const lobbyResults = isExpanded ? getTeamLobbyResults(standing.team.id) : []
            const extras = teamExtras[standing.team.id]
            const rankChange = getRankChange(standing.team.id, standing.rank_position)
            const isBelowLine = qualLineIdx >= 0 && idx >= qualLineIdx
            const isQualLine = qualLineIdx >= 0 && idx === qualLineIdx
            const members = teamMembers[standing.team.id] ?? []

            return (
              <Fragment key={standing.team.id}>
                {/* Qualification separator */}
                {isQualLine && (
                  <TableRow className="border-0">
                    <TableCell colSpan={9} className="p-0">
                      <div className="relative flex items-center py-1 px-4">
                        <div className="flex-1 border-t border-dashed border-green-400/40" />
                        <span className="mx-3 text-[10px] font-medium text-green-500/60 uppercase tracking-wider">
                          Batas Kualifikasi
                        </span>
                        <div className="flex-1 border-t border-dashed border-green-400/40" />
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                <TableRow
                  className={cn(
                    'cursor-pointer border-stone-100 hover:bg-stone-50',
                    standing.rank_position <= 3 && 'bg-amber-50/30',
                    standing.is_eliminated && 'opacity-50',
                    isBelowLine && 'opacity-60'
                  )}
                  onClick={() => onToggleExpand(standing.team.id)}
                >
                  {/* Rank */}
                  <TableCell className="font-bold text-stone-700">
                    <div className="flex items-center gap-1.5">
                      {standing.rank_position <= 3 && (
                        <Trophy
                          size={14}
                          weight="fill"
                          className={cn(
                            standing.rank_position === 1 && 'text-amber-500',
                            standing.rank_position === 2 && 'text-stone-400',
                            standing.rank_position === 3 && 'text-amber-700'
                          )}
                        />
                      )}
                      {standing.rank_position}
                    </div>
                  </TableCell>

                  {/* Team name + badges */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-900">{standing.team.name}</span>
                      {extras?.hasDnf && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                          DNF
                        </span>
                      )}
                      {extras?.hasDns && (
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-500">
                          DNS
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Total points */}
                  <TableCell className="text-right font-bold text-porjar-red tabular-nums">
                    {standing.total_points}
                  </TableCell>

                  {/* Kills */}
                  <TableCell className="text-right text-stone-700 tabular-nums">
                    {standing.total_kills}
                  </TableCell>

                  {/* Placement */}
                  <TableCell className="text-right text-stone-700 tabular-nums">
                    {standing.total_placement_points}
                  </TableCell>

                  {/* WWCD count */}
                  <TableCell className="text-center">
                    {(extras?.wwcdCount ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-amber-500 text-sm">
                        <Trophy size={12} weight="fill" />
                        {extras?.wwcdCount}
                      </span>
                    ) : (
                      <span className="text-stone-300">-</span>
                    )}
                  </TableCell>

                  {/* Best */}
                  <TableCell className="text-right text-stone-500 tabular-nums">
                    {standing.best_placement ?? '-'}
                  </TableCell>

                  {/* Movement arrows */}
                  <TableCell className="text-center">
                    {rankChange === null ? (
                      <span className="text-[10px] font-medium text-blue-500">NEW</span>
                    ) : rankChange > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-green-500 text-xs">
                        <ArrowUp size={12} weight="bold" />
                        {rankChange}
                      </span>
                    ) : rankChange < 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-red-500 text-xs">
                        <ArrowDown size={12} weight="bold" />
                        {Math.abs(rankChange)}
                      </span>
                    ) : (
                      <Minus size={12} className="mx-auto text-stone-300" />
                    )}
                  </TableCell>

                  {/* Expand indicator */}
                  <TableCell className="text-center">
                    <CaretDown
                      size={16}
                      className={cn(
                        'text-stone-400 transition-transform duration-200',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </TableCell>
                </TableRow>

                {/* Expanded row: per-lobby breakdown + per-player stats */}
                <TableRow className="border-stone-100">
                  <TableCell colSpan={9} className="p-0">
                    <div
                      className={cn(
                        'grid transition-[grid-template-rows] duration-200 ease-in-out',
                        isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      )}
                    >
                      <div className="overflow-hidden">
                        {isExpanded && (
                          <BRLobbyResults
                            lobbyResults={lobbyResults}
                            members={members}
                            extras={extras}
                          />
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}
