'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Trophy, Export } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { BRLeaderboardTable } from './BRLeaderboardTable'
import type { SortKey, SortDir, TeamExtras } from './BRLeaderboardTable'
import type { Standing, BRLobby, TeamMember } from '@/types'

interface BRLeaderboardProps {
  standings: Standing[]
  lobbies: BRLobby[]
  qualificationThreshold?: number
  teamMembers?: Record<string, TeamMember[]>
  previousRanks?: Record<string, number>
}

type DayFilter = 'all' | number

export function BRLeaderboard({
  standings,
  lobbies,
  qualificationThreshold = 0,
  teamMembers = {},
  previousRanks = {},
}: BRLeaderboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank_position')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const [dayFilter, setDayFilter] = useState<DayFilter>('all')

  // Get unique days
  const days = useMemo(() => {
    const daySet = new Set(lobbies.map((l) => l.day_number))
    return Array.from(daySet).sort((a, b) => a - b)
  }, [lobbies])

  // Filter lobbies by day
  const filteredLobbies = useMemo(() => {
    if (dayFilter === 'all') return lobbies
    return lobbies.filter((l) => l.day_number === dayFilter)
  }, [lobbies, dayFilter])

  // Compute extra stats per team
  const teamExtras = useMemo(() => {
    const extras: Record<string, TeamExtras> = {}
    for (const standing of standings) {
      const teamId = standing.team.id
      let wwcdCount = 0
      let totalPenalties = 0
      let hasDnf = false
      let hasDns = false

      for (const lobby of filteredLobbies) {
        if (lobby.status !== 'completed') continue
        const result = (lobby.results ?? []).find((r) => r.team.id === teamId)
        if (result) {
          if (result.placement === 1) wwcdCount++
        }
      }

      extras[teamId] = { wwcdCount, totalPenalties, hasDnf, hasDns }
    }
    return extras
  }, [standings, filteredLobbies])

  const sorted = useMemo(() => {
    return [...standings].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [standings, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'rank_position' ? 'asc' : 'desc')
    }
  }

  function getTeamLobbyResults(teamId: string) {
    return filteredLobbies
      .filter((l) => l.status === 'completed')
      .map((lobby) => {
        const result = (lobby.results ?? []).find((r) => r.team.id === teamId)
        return result ? { lobby, result } : null
      })
      .filter(Boolean) as { lobby: BRLobby; result: BRLobby['results'][0] }[]
  }

  // Export CSV
  const handleExportCSV = useCallback(() => {
    const headers = [
      'Rank',
      'Team',
      'Total Points',
      'Kills',
      'Placement Points',
      'Best Placement',
      'WWCD Count',
      'Matches Played',
    ]

    const rows = sorted.map((s) => {
      const extras = teamExtras[s.team.id]
      return [
        s.rank_position,
        `"${s.team.name}"`,
        s.total_points,
        s.total_kills,
        s.total_placement_points,
        s.best_placement ?? '-',
        extras?.wwcdCount ?? 0,
        s.matches_played,
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'br-leaderboard.csv'
    link.click()
    URL.revokeObjectURL(url)
  }, [sorted, teamExtras])

  // Find qualification line index
  const qualLineIdx = useMemo(() => {
    if (qualificationThreshold <= 0) return -1
    const idx = sorted.findIndex((s) => s.total_points < qualificationThreshold)
    return idx === -1 ? sorted.length : idx
  }, [sorted, qualificationThreshold])

  return (
    <div className="space-y-4">
      {/* Controls: Day filter tabs + Export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1">
          <button
            onClick={() => setDayFilter('all')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              dayFilter === 'all'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            )}
          >
            Semua
          </button>
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setDayFilter(day)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                dayFilter === day
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              )}
            >
              Day {day}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={handleExportCSV}
          className="border-stone-300 text-stone-600 h-8 text-xs"
        >
          <Export size={14} className="mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Qualification threshold indicator */}
      {qualificationThreshold > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-600">
          <Trophy size={14} weight="fill" />
          Qualification threshold: {qualificationThreshold} poin
        </div>
      )}

      {/* Leaderboard table */}
      <BRLeaderboardTable
        sorted={sorted}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        expandedTeamId={expandedTeamId}
        onToggleExpand={(teamId) =>
          setExpandedTeamId(expandedTeamId === teamId ? null : teamId)
        }
        teamExtras={teamExtras}
        teamMembers={teamMembers}
        previousRanks={previousRanks}
        qualLineIdx={qualLineIdx}
        getTeamLobbyResults={getTeamLobbyResults}
      />
    </div>
  )
}
