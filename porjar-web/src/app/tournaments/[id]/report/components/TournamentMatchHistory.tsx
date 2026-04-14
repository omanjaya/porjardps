import Link from 'next/link'
import { Sword, Target } from '@phosphor-icons/react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
import type { BracketMatch, BRLobby } from '@/types'
import { TeamLogo } from './TournamentInfoCards'

interface TournamentMatchHistoryProps {
  tournamentId: number | string
  isBR: boolean
  lobbies: BRLobby[]
  lobbyDays: number[]
  matches: BracketMatch[]
  completedMatches: BracketMatch[]
  matchesByRound: Record<number, BracketMatch[]>
  roundKeys: number[]
}

export function TournamentMatchHistory({
  tournamentId,
  isBR,
  lobbies,
  lobbyDays,
  matches,
  completedMatches,
  matchesByRound,
  roundKeys,
}: TournamentMatchHistoryProps) {
  if (isBR) {
    if (lobbies.length === 0) return null
    return (
      <div className="anim-section space-y-4">
        <div className="flex items-center gap-2">
          <Target size={18} weight="fill" className="text-esi-red" />
          <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100">Ringkasan Lobby</h2>
        </div>

        {lobbyDays.map((day) => {
          const dayLobbies = lobbies.filter((l) => l.day_number === day)
          const completedDayLobbies = dayLobbies.filter((l) => l.status === 'completed')
          return (
            <div
              key={day}
              className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
            >
              <div className="border-b border-stone-100 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 px-5 py-3">
                <span className="text-sm font-semibold text-stone-700 dark:text-zinc-300">Hari {day}</span>
                <span className="ml-2 text-xs text-stone-400 dark:text-zinc-500">
                  {completedDayLobbies.length}/{dayLobbies.length} lobby selesai
                </span>
              </div>
              <div className="divide-y divide-stone-50">
                {dayLobbies.map((lobby) => {
                  const topResults = (lobby.results ?? [])
                    .sort((a, b) => a.placement - b.placement)
                    .slice(0, 3)
                  const isLobbyDone = lobby.status === 'completed'
                  return (
                    <div key={lobby.id} className="px-5 py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-stone-700 dark:text-zinc-300">
                          {lobby.lobby_name}
                        </span>
                        <StatusBadge status={lobby.status} />
                      </div>
                      {isLobbyDone && topResults.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {topResults.map((r) => (
                            <div
                              key={r.team.id}
                              className="flex items-center gap-3 rounded-lg bg-stone-50 dark:bg-zinc-800/50 border border-stone-100 dark:border-zinc-700 px-3 py-2.5"
                            >
                              <span
                                className={cn(
                                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                  r.placement === 1 && 'bg-yellow-100 text-yellow-700',
                                  r.placement === 2 && 'bg-stone-200 text-stone-600 dark:text-zinc-400',
                                  r.placement === 3 && 'bg-orange-100 text-orange-700'
                                )}
                              >
                                {r.placement}
                              </span>
                              <TeamLogo team={r.team} size={7} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-stone-800 dark:text-zinc-200">
                                  {r.team.name}
                                </p>
                                <p className="text-[10px] text-stone-400 dark:text-zinc-500">
                                  {r.kills} kill · {r.total_points} pts
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : !isLobbyDone ? (
                        <p className="text-xs text-stone-400 dark:text-zinc-500 italic">Belum ada hasil</p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (completedMatches.length === 0) return null

  return (
    <div className="anim-section space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sword size={18} weight="fill" className="text-esi-red" />
          <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100">Hasil Pertandingan</h2>
        </div>
        <Link
          href={`/tournaments/${tournamentId}/bracket`}
          className="text-xs font-medium text-esi-red hover:underline"
        >
          Lihat Bracket →
        </Link>
      </div>

      {roundKeys.map((round) => {
        const roundMatches = matchesByRound[round]
        const maxRound = Math.max(...matches.map((m) => m.round))
        const roundLabel =
          round === maxRound
            ? 'Grand Final'
            : round === maxRound - 1
            ? 'Semifinal'
            : `Round ${round}`

        return (
          <div
            key={round}
            className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
          >
            <div className="border-b border-stone-100 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 px-5 py-3">
              <span className="text-sm font-semibold text-stone-700 dark:text-zinc-300">{roundLabel}</span>
            </div>
            <div className="divide-y divide-stone-50">
              {roundMatches.map((match) => {
                const aWon = match.winner?.id === match.team_a?.id
                const bWon = match.winner?.id === match.team_b?.id
                return (
                  <div key={match.id} className="flex items-center gap-0 px-5 py-3">
                    {/* Team A */}
                    <div
                      className={cn(
                        'flex flex-1 items-center gap-2.5',
                        aWon && 'font-semibold'
                      )}
                    >
                      {match.team_a ? (
                        <>
                          <TeamLogo team={match.team_a} size={8} />
                          <span
                            className={cn(
                              'truncate text-sm',
                              aWon ? 'text-stone-900 dark:text-zinc-100' : 'text-stone-400 dark:text-zinc-500'
                            )}
                          >
                            {match.team_a.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm italic text-stone-300 dark:text-zinc-600">TBD</span>
                      )}
                    </div>

                    {/* Score */}
                    <div className="flex shrink-0 items-center gap-1.5 px-3">
                      <span
                        className={cn(
                          'w-6 text-center text-base font-bold tabular-nums',
                          aWon ? 'text-esi-red' : 'text-stone-400 dark:text-zinc-500'
                        )}
                      >
                        {match.score_a}
                      </span>
                      <span className="text-xs font-medium text-stone-300 dark:text-zinc-600">–</span>
                      <span
                        className={cn(
                          'w-6 text-center text-base font-bold tabular-nums',
                          bWon ? 'text-esi-red' : 'text-stone-400 dark:text-zinc-500'
                        )}
                      >
                        {match.score_b}
                      </span>
                    </div>

                    {/* Team B */}
                    <div
                      className={cn(
                        'flex flex-1 items-center justify-end gap-2.5',
                        bWon && 'font-semibold'
                      )}
                    >
                      {match.team_b ? (
                        <>
                          <span
                            className={cn(
                              'truncate text-sm',
                              bWon ? 'text-stone-900 dark:text-zinc-100' : 'text-stone-400 dark:text-zinc-500'
                            )}
                          >
                            {match.team_b.name}
                          </span>
                          <TeamLogo team={match.team_b} size={8} />
                        </>
                      ) : (
                        <span className="text-sm italic text-stone-300 dark:text-zinc-600">TBD</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
