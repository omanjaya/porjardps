'use client'

import { ListBullets } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { Standing } from '@/types'

interface Props {
  standings: Standing[]
  teamId: string | null
}

export function StandingsView({ standings, teamId }: Props) {
  if (standings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-20 shadow-sm">
        <ListBullets size={48} className="text-stone-300 dark:text-zinc-600" />
        <div className="text-center">
          <p className="text-stone-600 dark:text-zinc-400 font-medium">Standings belum tersedia</p>
          <p className="text-sm text-stone-400 dark:text-zinc-500 mt-1">
            Data standings akan muncul setelah pertandingan dimulai.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                Tim
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 w-16">
                M
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 w-16">
                W
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 w-16">
                L
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 w-16">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => {
              const isMyTeam = s.team.id === teamId
              return (
                <tr
                  key={s.team.id}
                  className={cn(
                    'border-b border-stone-100 dark:border-zinc-800 last:border-0 transition-colors',
                    isMyTeam
                      ? 'bg-esi-red/5 border-l-2 border-l-esi-red'
                      : 'hover:bg-stone-50 dark:hover:bg-zinc-800/50'
                  )}
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                        s.rank_position <= 3
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          : 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400'
                      )}
                    >
                      {s.rank_position}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'font-medium',
                        isMyTeam ? 'text-esi-red font-bold' : 'text-stone-900 dark:text-zinc-100'
                      )}
                    >
                      {s.team.name}
                      {isMyTeam && (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase text-esi-red/70">
                          (kamu)
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-stone-600 dark:text-zinc-400">
                    {s.matches_played}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-green-600">
                    {s.wins}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-red-500">
                    {s.losses}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-center font-semibold text-stone-700 dark:text-zinc-300">
                    {s.total_points}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
