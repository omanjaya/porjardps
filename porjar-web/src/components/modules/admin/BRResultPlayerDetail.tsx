'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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

interface BRResultPlayerDetailProps {
  teamId: string
  players: PlayerInput[]
  penalty: number
  penaltyReason: string
  onUpdatePlayer: (teamId: string, playerIdx: number, field: keyof PlayerInput, value: unknown) => void
  onUpdateTeam: (teamId: string, field: keyof TeamInput, value: unknown) => void
}

export function BRResultPlayerDetail({
  teamId,
  players,
  penalty,
  penaltyReason,
  onUpdatePlayer,
  onUpdateTeam,
}: BRResultPlayerDetailProps) {
  return (
    <div className="bg-esi-bg px-6 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
        Detail Pemain
      </p>
      <div className="space-y-1">
        {players.map((player, idx) => (
          <div
            key={player.memberId || idx}
            className="flex items-center gap-3 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
          >
            <span className="min-w-[100px] text-xs font-medium text-stone-700 truncate">
              {player.name}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-stone-400">K:</span>
              <Input
                type="number"
                min={0}
                value={player.kills || ''}
                onChange={(e) =>
                  onUpdatePlayer(
                    teamId,
                    idx,
                    'kills',
                    e.target.value === '' ? 0 : parseInt(e.target.value)
                  )
                }
                className="w-12 h-6 text-center bg-transparent border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 text-xs px-1 focus:border-esi-red"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-stone-400">D:</span>
              <Input
                type="number"
                min={0}
                value={player.damage || ''}
                onChange={(e) =>
                  onUpdatePlayer(
                    teamId,
                    idx,
                    'damage',
                    e.target.value === '' ? 0 : parseInt(e.target.value)
                  )
                }
                className="w-14 h-6 text-center bg-transparent border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 text-xs px-1 focus:border-esi-red"
              />
            </div>
            <button
              onClick={() =>
                onUpdatePlayer(teamId, idx, 'isMvp', !player.isMvp)
              }
              className={cn(
                'rounded px-2 py-0.5 text-[10px] font-medium border transition-colors',
                player.isMvp
                  ? 'border-amber-300 bg-amber-50 text-amber-600'
                  : 'border-stone-200 dark:border-zinc-700 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-300'
              )}
            >
              MVP
            </button>
          </div>
        ))}
      </div>

      {/* Penalty reason */}
      {(penalty > 0 || penaltyReason) && (
        <div className="mt-2">
          <Input
            placeholder="Alasan penalty..."
            value={penaltyReason}
            onChange={(e) =>
              onUpdateTeam(teamId, 'penaltyReason', e.target.value)
            }
            className="bg-transparent border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 text-xs h-7 focus:border-esi-red"
          />
        </div>
      )}
    </div>
  )
}
