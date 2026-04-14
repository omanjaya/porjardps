import Link from 'next/link'
import { Trophy, Medal, Crown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { Standing } from '@/types'
import { TeamLogo } from './TournamentInfoCards'

interface TournamentStandingsTableProps {
  tournamentId: number | string
  standings: Standing[]
  top10: Standing[]
  isBR: boolean
}

export function TournamentStandingsTable({
  tournamentId,
  standings,
  top10,
  isBR,
}: TournamentStandingsTableProps) {
  if (top10.length === 0) return null

  return (
    <div className="anim-section rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-zinc-700 px-6 py-4">
        <div className="flex items-center gap-2">
          <Trophy size={18} weight="fill" className="text-esi-red" />
          <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100">Klasemen</h2>
        </div>
        <Link
          href={`/tournaments/${tournamentId}/standings`}
          className="text-xs font-medium text-esi-red hover:underline"
        >
          Lihat semua →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50">
              <th className="py-3 pl-6 pr-2 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 w-12">
                #
              </th>
              <th className="py-3 px-2 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                Tim
              </th>
              <th className="py-3 px-2 text-center text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                Main
              </th>
              <th className="py-3 px-2 text-center text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                W
              </th>
              <th className="py-3 px-2 text-center text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                L
              </th>
              <th className="py-3 px-2 text-right text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                Poin
              </th>
              {isBR && (
                <th className="py-3 pl-2 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                  Kills
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {top10.map((s) => {
              const isGold = s.rank_position === 1
              const isSilver = s.rank_position === 2
              const isBronze = s.rank_position === 3
              return (
                <tr
                  key={s.team.id}
                  className={cn(
                    'transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50',
                    isGold && 'bg-yellow-50/60',
                    isSilver && 'bg-stone-50 dark:bg-zinc-800/50',
                    isBronze && 'bg-orange-50/60',
                    s.is_eliminated && 'opacity-50'
                  )}
                >
                  <td className="py-3 pl-6 pr-2">
                    <div className="flex items-center gap-1.5">
                      {isGold && (
                        <Crown size={13} weight="fill" className="text-yellow-500" />
                      )}
                      {isSilver && (
                        <Medal size={13} weight="fill" className="text-stone-400 dark:text-zinc-500" />
                      )}
                      {isBronze && (
                        <Trophy size={13} weight="fill" className="text-orange-500" />
                      )}
                      <span
                        className={cn(
                          'font-bold tabular-nums',
                          isGold && 'text-yellow-700',
                          isSilver && 'text-stone-600 dark:text-zinc-400',
                          isBronze && 'text-orange-700',
                          !isGold && !isSilver && !isBronze && 'text-stone-500 dark:text-zinc-400'
                        )}
                      >
                        {s.rank_position}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2.5">
                      <TeamLogo team={s.team} size={8} />
                      <span className="font-medium text-stone-900 dark:text-zinc-100">{s.team.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center tabular-nums text-stone-500 dark:text-zinc-400">
                    {s.matches_played}
                  </td>
                  <td className="py-3 px-2 text-center tabular-nums font-medium text-green-600">
                    {s.wins}
                  </td>
                  <td className="py-3 px-2 text-center tabular-nums font-medium text-red-500">
                    {s.losses}
                  </td>
                  <td className="py-3 px-2 text-right tabular-nums font-bold text-esi-red">
                    {s.total_points}
                  </td>
                  {isBR && (
                    <td className="py-3 pl-2 pr-6 text-right tabular-nums text-stone-600 dark:text-zinc-400">
                      {s.total_kills}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {standings.length > 10 && (
        <div className="border-t border-stone-100 dark:border-zinc-700 px-6 py-3 text-center">
          <Link
            href={`/tournaments/${tournamentId}/standings`}
            className="text-xs font-medium text-esi-red hover:underline"
          >
            Lihat {standings.length - 10} tim lainnya →
          </Link>
        </div>
      )}
    </div>
  )
}
