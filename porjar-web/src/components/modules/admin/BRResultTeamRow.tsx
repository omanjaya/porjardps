'use client'

import { Fragment } from 'react'
import { Input } from '@/components/ui/input'
import {
  TableCell,
  TableRow,
} from '@/components/ui/table'
import { CaretDown, Trophy } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { TeamSummary } from '@/types'
import { BRResultPlayerDetail } from './BRResultPlayerDetail'

interface PlayerInput {
  memberId: string
  name: string
  kills: number
  damage: number
  isMvp: boolean
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

interface PreviewData {
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

interface BRResultTeamRowProps {
  row: PreviewData
  teamInput: TeamInput
  isExpanded: boolean
  wwcdBonus: number
  teamsCount: number
  onToggleExpand: (teamId: string) => void
  onUpdateTeam: (teamId: string, field: keyof TeamInput, value: unknown) => void
  onUpdatePlayer: (teamId: string, playerIdx: number, field: keyof PlayerInput, value: unknown) => void
}

export function BRResultTeamRow({
  row,
  teamInput,
  isExpanded,
  wwcdBonus,
  teamsCount,
  onToggleExpand,
  onUpdateTeam,
  onUpdatePlayer,
}: BRResultTeamRowProps) {
  const { team } = row

  return (
    <Fragment>
      <TableRow
        className={cn(
          'border-stone-100 hover:bg-stone-50',
          row.isWwcd && 'bg-amber-50/50',
          row.status === 'dnf' && 'opacity-60',
          row.status === 'dns' && 'opacity-40'
        )}
      >
        {/* Expand toggle */}
        <TableCell className="px-2">
          {teamInput?.players.length > 0 && (
            <button
              onClick={() => onToggleExpand(team.id)}
              className="text-stone-400 hover:text-stone-600"
            >
              <CaretDown
                size={14}
                className={cn('transition-transform', isExpanded && 'rotate-180')}
              />
            </button>
          )}
        </TableCell>

        {/* Team name */}
        <TableCell>
          <div className="flex items-center gap-1.5">
            {row.isWwcd && (
              <Trophy size={14} weight="fill" className="text-amber-500 shrink-0" />
            )}
            <span className="text-sm font-medium text-stone-900">{team.name}</span>
          </div>
        </TableCell>

        {/* Placement */}
        <TableCell className="text-center">
          <select
            value={row.placement}
            onChange={(e) =>
              onUpdateTeam(team.id, 'placement', parseInt(e.target.value) || 0)
            }
            disabled={row.status === 'dns'}
            className="h-7 w-16 rounded border border-stone-300 bg-white text-center text-sm text-stone-900 mx-auto focus:border-porjar-red"
          >
            <option value={0}>-</option>
            {Array.from({ length: teamsCount }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                #{n}
              </option>
            ))}
          </select>
        </TableCell>

        {/* Kills */}
        <TableCell className="text-center">
          <Input
            type="number"
            min={0}
            value={row.kills || ''}
            onChange={(e) =>
              onUpdateTeam(team.id, 'kills', parseInt(e.target.value) || 0)
            }
            disabled={row.status === 'dns'}
            className="mx-auto w-16 text-center bg-white border-stone-300 text-stone-900 h-7 text-sm focus:border-porjar-red"
          />
        </TableCell>

        {/* Damage */}
        <TableCell className="text-center">
          <Input
            type="number"
            min={0}
            value={row.damage || ''}
            onChange={(e) =>
              onUpdateTeam(team.id, 'damage', parseInt(e.target.value) || 0)
            }
            disabled={row.status === 'dns'}
            className="mx-auto w-16 text-center bg-white border-stone-300 text-stone-900 h-7 text-sm focus:border-porjar-red"
          />
        </TableCell>

        {/* Status */}
        <TableCell className="text-center">
          <select
            value={row.status}
            onChange={(e) =>
              onUpdateTeam(
                team.id,
                'status',
                e.target.value as 'normal' | 'dnf' | 'dns'
              )
            }
            className="h-7 w-[72px] rounded border border-stone-300 bg-white text-center text-xs text-stone-900 focus:border-porjar-red"
          >
            <option value="normal">Normal</option>
            <option value="dnf">DNF</option>
            <option value="dns">DNS</option>
          </select>
        </TableCell>

        {/* Placement pts */}
        <TableCell className="text-right text-stone-500 tabular-nums text-sm">
          {row.placementPts}
        </TableCell>

        {/* Kill pts */}
        <TableCell className="text-right text-stone-500 tabular-nums text-sm">
          {row.killPts}
        </TableCell>

        {/* WWCD */}
        {wwcdBonus > 0 && (
          <TableCell className="text-center">
            {row.isWwcd && (
              <span className="text-xs font-bold text-amber-500">+{wwcdBonus}</span>
            )}
          </TableCell>
        )}

        {/* Penalty */}
        <TableCell className="text-right">
          <Input
            type="number"
            min={0}
            value={row.penalty || ''}
            onChange={(e) =>
              onUpdateTeam(team.id, 'penalty', parseInt(e.target.value) || 0)
            }
            className="mx-auto w-14 text-center bg-white border-stone-300 text-red-500 h-7 text-sm focus:border-porjar-red"
          />
        </TableCell>

        {/* Total */}
        <TableCell className="text-right font-bold text-porjar-red tabular-nums">
          {row.total}
        </TableCell>
      </TableRow>

      {/* Expanded: per-player input */}
      {isExpanded && teamInput?.players.length > 0 && (
        <TableRow className="border-stone-100">
          <TableCell colSpan={wwcdBonus > 0 ? 11 : 10} className="p-0">
            <BRResultPlayerDetail
              teamId={team.id}
              players={teamInput.players}
              penalty={teamInput.penalty}
              penaltyReason={teamInput.penaltyReason}
              onUpdatePlayer={onUpdatePlayer}
              onUpdateTeam={onUpdateTeam}
            />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}
