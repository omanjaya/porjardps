'use client'

import { Trophy, WarningCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { BRLobby, TeamMember } from '@/types'
import type { TeamExtras } from './BRLeaderboardTable'

interface BRLobbyResultsProps {
  lobbyResults: { lobby: BRLobby; result: BRLobby['results'][0] }[]
  members: TeamMember[]
  extras: TeamExtras | undefined
}

export function BRLobbyResults({ lobbyResults, members, extras }: BRLobbyResultsProps) {
  return (
    <div className="bg-porjar-bg px-6 py-3 space-y-4">
      {/* Per-lobby results */}
      {lobbyResults.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Detail Per Lobby
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {lobbyResults.map(({ lobby, result }) => (
              <div
                key={lobby.id}
                className={cn(
                  'rounded-lg border border-stone-200 bg-white px-3 py-2',
                  result.placement === 1 && 'border-amber-200 bg-amber-50/50'
                )}
              >
                <p className="text-xs font-medium text-stone-500">
                  {lobby.lobby_name}
                </p>
                <div className="mt-1 flex items-baseline gap-3 text-sm">
                  <span className="text-stone-900">
                    #{result.placement}
                  </span>
                  <span className="text-stone-500">
                    {result.kills}K
                  </span>
                  <span className="font-bold text-porjar-red">
                    {result.total_points}pts
                  </span>
                  {result.placement === 1 && (
                    <Trophy
                      size={12}
                      weight="fill"
                      className="text-amber-500"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-player stats */}
      {members.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Statistik Pemain
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {members.map((member) => (
              <div
                key={member.id}
                className="rounded-lg border border-stone-200 bg-white px-3 py-2"
              >
                <p className="text-xs font-medium text-stone-700 truncate">
                  {member.in_game_name || member.full_name}
                </p>
                <p className="text-[10px] text-stone-400 capitalize">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Penalties summary */}
      {(extras?.totalPenalties ?? 0) > 0 && (
        <div className="flex items-center gap-2 text-xs text-red-500">
          <WarningCircle size={14} weight="fill" />
          Total penalty: -{extras?.totalPenalties} poin
        </div>
      )}
    </div>
  )
}
