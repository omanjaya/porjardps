'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Warning, Eye } from '@phosphor-icons/react'
import { calculatePoints } from '@/constants/br-presets'
import type { BRLobby, TeamSummary, TeamMember } from '@/types'
import { BRResultTeamRow } from './BRResultTeamRow'

interface BRResultInputProps {
  lobby: BRLobby
  teams: TeamSummary[]
  teamMembers?: Record<string, TeamMember[]>
  pointRules?: {
    placements: Record<number, number>
    killPointValue: number
    wwcdBonus: number
  }
  onSubmit: (results: TeamResult[]) => Promise<void>
}

export interface TeamResult {
  team_id: string
  placement: number
  kills: number
  damage: number
  status: 'normal' | 'dnf' | 'dns'
  players: PlayerResult[]
  penalty: number
  penalty_reason: string
}

interface PlayerResult {
  member_id: string
  name: string
  kills: number
  damage: number
  is_mvp: boolean
}

// Default placement points
const defaultPlacements: Record<number, number> = {
  1: 15, 2: 12, 3: 10, 4: 8, 5: 6, 6: 4, 7: 2, 8: 1,
}

interface TeamInput {
  placement: number
  kills: number
  damage: number
  status: 'normal' | 'dnf' | 'dns'
  penalty: number
  penaltyReason: string
  players: PlayerInput[]
}

interface PlayerInput {
  memberId: string
  name: string
  kills: number
  damage: number
  isMvp: boolean
}

export function BRResultInput({
  lobby,
  teams,
  teamMembers = {},
  pointRules,
  onSubmit,
}: BRResultInputProps) {
  const placements = pointRules?.placements ?? defaultPlacements
  const killPointValue = pointRules?.killPointValue ?? 1
  const wwcdBonus = pointRules?.wwcdBonus ?? 0

  const [results, setResults] = useState<Record<string, TeamInput>>(() => {
    const init: Record<string, TeamInput> = {}
    for (const team of teams) {
      const existing = (lobby.results ?? []).find((r) => r.team.id === team.id)
      const members = teamMembers[team.id] ?? []
      init[team.id] = {
        placement: existing?.placement ?? 0,
        kills: existing?.kills ?? 0,
        damage: 0,
        status: 'normal',
        penalty: 0,
        penaltyReason: '',
        players: members.map((m) => ({
          memberId: m.id,
          name: m.in_game_name || m.full_name,
          kills: 0,
          damage: 0,
          isMvp: false,
        })),
      }
    }
    return init
  })

  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showCalcPreview, setShowCalcPreview] = useState(false)

  function updateTeam(teamId: string, field: keyof TeamInput, value: unknown) {
    setResults((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [field]: value },
    }))
  }

  function updatePlayer(
    teamId: string,
    playerIdx: number,
    field: keyof PlayerInput,
    value: unknown
  ) {
    setResults((prev) => {
      const team = { ...prev[teamId] }
      const players = [...team.players]
      players[playerIdx] = { ...players[playerIdx], [field]: value }

      // If setting MVP, unset others
      if (field === 'isMvp' && value === true) {
        players.forEach((p, i) => {
          if (i !== playerIdx) p.isMvp = false
        })
      }

      team.players = players
      return { ...prev, [teamId]: team }
    })
  }

  // Computed previews sorted by placement
  const previews = useMemo(() => {
    return teams
      .map((team) => {
        const r = results[team.id]
        if (!r) return null
        const calc = calculatePoints(r.placement, r.kills, placements, killPointValue, wwcdBonus)
        const total = calc.total - r.penalty
        return {
          team,
          ...r,
          placementPts: calc.placementPts,
          killPts: calc.killPts,
          wwcd: calc.wwcd,
          totalBeforePenalty: calc.total,
          total: Math.max(0, total),
          isWwcd: r.placement === 1,
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (!a || !b) return 0
        if (a.placement === 0 && b.placement === 0) return 0
        if (a.placement === 0) return 1
        if (b.placement === 0) return -1
        return a.placement - b.placement
      }) as NonNullable<PreviewRow>[]
  }, [teams, results, placements, killPointValue, wwcdBonus])

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = []
    const usedPlacements = new Set<number>()

    for (const team of teams) {
      const r = results[team.id]
      if (!r) continue
      if (r.placement > 0) {
        if (usedPlacements.has(r.placement)) {
          errors.push(`Placement #${r.placement} digunakan lebih dari satu tim`)
        }
        usedPlacements.add(r.placement)
      }
    }

    const teamsWithoutPlacement = teams.filter(
      (t) => (results[t.id]?.placement ?? 0) === 0 && results[t.id]?.status === 'normal'
    )
    if (teamsWithoutPlacement.length > 0 && teamsWithoutPlacement.length < teams.length) {
      errors.push(`${teamsWithoutPlacement.length} tim belum memiliki placement`)
    }

    return errors
  }, [teams, results])

  async function handleSubmit() {
    if (validationErrors.length > 0) return
    setSubmitting(true)
    try {
      const payload: TeamResult[] = teams.map((team) => {
        const r = results[team.id]
        return {
          team_id: team.id,
          placement: r?.placement ?? 0,
          kills: r?.kills ?? 0,
          damage: r?.damage ?? 0,
          status: r?.status ?? 'normal',
          penalty: r?.penalty ?? 0,
          penalty_reason: r?.penaltyReason ?? '',
          players: (r?.players ?? []).map((p) => ({
            member_id: p.memberId,
            name: p.name,
            kills: p.kills,
            damage: p.damage,
            is_mvp: p.isMvp,
          })),
        }
      })
      await onSubmit(payload)
    } finally {
      setSubmitting(false)
    }
  }

  function handleToggleExpand(teamId: string) {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId)
  }

  return (
    <div className="space-y-4">
      {/* Lobby header */}
      <div className="rounded-xl bg-porjar-bg px-4 py-2.5">
        <p className="text-sm font-medium text-stone-700">
          {lobby.lobby_name} &mdash; Day {lobby.day_number}
        </p>
        <p className="text-xs text-stone-400 mt-0.5">
          Kill: {killPointValue}pt | WWCD Bonus: {wwcdBonus}pt
        </p>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          {validationErrors.map((err, i) => (
            <p key={i} className="flex items-center gap-1.5 text-xs text-red-600">
              <Warning size={12} weight="fill" />
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Result input table */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-stone-200 hover:bg-transparent">
              <TableHead className="text-stone-500 w-8" />
              <TableHead className="text-stone-500">Tim</TableHead>
              <TableHead className="text-center text-stone-500 w-20">Posisi</TableHead>
              <TableHead className="text-center text-stone-500 w-20">Kills</TableHead>
              <TableHead className="text-center text-stone-500 w-20">Damage</TableHead>
              <TableHead className="text-center text-stone-500 w-20">Status</TableHead>
              <TableHead className="text-right text-stone-500 w-16">Pts</TableHead>
              <TableHead className="text-right text-stone-500 w-16">Kill</TableHead>
              {wwcdBonus > 0 && (
                <TableHead className="text-center text-stone-500 w-14">WWCD</TableHead>
              )}
              <TableHead className="text-right text-stone-500 w-16">Penalty</TableHead>
              <TableHead className="text-right text-stone-500 w-20">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previews.map((row) => {
              if (!row) return null
              const teamInput = results[row.team.id]
              return (
                <BRResultTeamRow
                  key={row.team.id}
                  row={row}
                  teamInput={teamInput}
                  isExpanded={expandedTeamId === row.team.id}
                  wwcdBonus={wwcdBonus}
                  teamsCount={teams.length}
                  onToggleExpand={handleToggleExpand}
                  onUpdateTeam={updateTeam}
                  onUpdatePlayer={updatePlayer}
                />
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Preview Kalkulasi button */}
      <div className="rounded-xl border border-stone-200 bg-porjar-bg p-3">
        <button
          onClick={() => setShowCalcPreview(!showCalcPreview)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-stone-700">
            <Eye size={16} />
            Preview Kalkulasi
          </span>
          <span className="text-xs text-stone-400">
            {showCalcPreview ? 'Sembunyikan' : 'Tampilkan'}
          </span>
        </button>
        {showCalcPreview && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="px-2 py-1 text-left text-stone-500">Tim</th>
                  <th className="px-2 py-1 text-right text-stone-500">Place</th>
                  <th className="px-2 py-1 text-right text-stone-500">Place Pts</th>
                  <th className="px-2 py-1 text-right text-stone-500">Kill Pts</th>
                  {wwcdBonus > 0 && (
                    <th className="px-2 py-1 text-right text-stone-500">WWCD</th>
                  )}
                  <th className="px-2 py-1 text-right text-red-500">Penalty</th>
                  <th className="px-2 py-1 text-right text-stone-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {previews.map((row) =>
                  row ? (
                    <tr key={row.team.id} className="border-b border-stone-100">
                      <td className="px-2 py-1 text-stone-700">{row.team.name}</td>
                      <td className="px-2 py-1 text-right text-stone-500">
                        {row.placement > 0 ? `#${row.placement}` : '-'}
                      </td>
                      <td className="px-2 py-1 text-right text-stone-500">{row.placementPts}</td>
                      <td className="px-2 py-1 text-right text-stone-500">{row.killPts}</td>
                      {wwcdBonus > 0 && (
                        <td className="px-2 py-1 text-right text-amber-500">{row.wwcd}</td>
                      )}
                      <td className="px-2 py-1 text-right text-red-500">
                        {row.penalty > 0 ? `-${row.penalty}` : '-'}
                      </td>
                      <td className="px-2 py-1 text-right font-bold text-porjar-red">{row.total}</td>
                    </tr>
                  ) : null
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={submitting || validationErrors.length > 0}
        className="w-full bg-porjar-red hover:bg-porjar-red-dark text-white"
      >
        {submitting ? 'Menyimpan...' : 'Simpan Hasil Lobby'}
      </Button>
    </div>
  )
}

// Helper type for preview calculation
type PreviewRow = {
  team: TeamSummary
  placement: number
  kills: number
  damage: number
  status: 'normal' | 'dnf' | 'dns'
  penalty: number
  penaltyReason: string
  players: PlayerInput[]
  placementPts: number
  killPts: number
  wwcd: number
  totalBeforePenalty: number
  total: number
  isWwcd: boolean
}
