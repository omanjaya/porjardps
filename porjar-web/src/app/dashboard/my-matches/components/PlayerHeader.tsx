'use client'

import { Sword, Users, GameController, Student } from '@phosphor-icons/react'
import type { TeamMember } from '@/types'

export interface MyTeamInfo {
  id: string
  name: string
  game_name: string
  game_slug: string
  school_name: string
  members: TeamMember[]
  logo_url: string | null
}

export function PlayerHeader({
  user,
  team,
}: {
  user: { full_name: string; tingkat?: string | null; needs_password_change?: boolean } | null
  team: MyTeamInfo | null
}) {
  return (
    <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-esi-red/10">
            <GameController size={24} weight="duotone" className="text-esi-red" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-esi-text truncate">{user?.full_name ?? 'Player'}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {user?.tingkat && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                  <Student size={12} />
                  {user.tingkat}
                </span>
              )}
              {team && (
                <span className="inline-flex items-center gap-1 rounded-full border border-esi-red/20 bg-esi-red/5 px-2 py-0.5 text-xs font-medium text-esi-red">
                  <Sword size={12} />
                  {team.game_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {team && (
          <div className="rounded-lg border border-esi-border bg-esi-bg p-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-esi-muted" />
              <span className="text-sm font-semibold text-esi-text">{team.name}</span>
            </div>
            <p className="mt-0.5 text-xs text-esi-muted">{team.school_name}</p>
            {team.members.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {team.members.map((m) => (
                  <span
                    key={m.id}
                    className="rounded-md bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-esi-muted border border-esi-border"
                  >
                    {m.full_name}
                    {m.role === 'captain' && ' (C)'}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
