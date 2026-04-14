'use client'

import { GameController, Lightning, Users } from '@phosphor-icons/react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Tournament } from '@/types'

interface Props {
  tournament: Tournament
  liveCount: number
}

export function TournamentHeader({ tournament, liveCount }: Props) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30 border border-esi-red/20">
            <GameController size={20} className="text-esi-red" />
          </div>
          <div>
            <span className="text-sm font-semibold text-stone-900 dark:text-zinc-100 block">
              {tournament.game?.name ?? 'Game'}
            </span>
            <span className="text-xs text-stone-500 dark:text-zinc-400">
              {tournament.format?.replace(/_/g, ' ')} &middot; BO{tournament.best_of}
            </span>
          </div>
        </div>

        <div className="hidden sm:block h-8 w-px bg-stone-200 dark:bg-zinc-700" />

        <StatusBadge status={tournament.status} />

        <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400">
          <Users size={14} />
          <span>{tournament.team_count} tim</span>
        </div>

        {liveCount > 0 && (
          <>
            <div className="hidden sm:block h-8 w-px bg-stone-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1.5 text-xs text-esi-red">
              <Lightning size={14} weight="fill" className="animate-pulse" />
              <span className="font-semibold">{liveCount} match sedang berlangsung</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
