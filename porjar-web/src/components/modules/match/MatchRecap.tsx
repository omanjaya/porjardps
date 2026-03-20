'use client'

import { cn } from '@/lib/utils'
import { Trophy, Timer, User, Crown, Sword } from '@phosphor-icons/react'
import { ShareButton } from '@/components/shared/ShareButton'
import type { BracketMatch } from '@/types'

interface MatchRecapProps {
  match: BracketMatch
}

export function MatchRecap({ match }: MatchRecapProps) {
  const winner = match.winner
  const loser =
    winner?.id === match.team_a?.id ? match.team_b : match.team_a
  const winnerScore = winner?.id === match.team_a?.id ? match.score_a : match.score_b
  const loserScore = winner?.id === match.team_a?.id ? match.score_b : match.score_a

  const matchUrl = typeof window !== 'undefined' ? window.location.href : `/matches/${match.id}`

  return (
    <div className="space-y-6">
      {/* Winner banner */}
      <div className="relative overflow-hidden rounded-xl border border-green-200 bg-gradient-to-br from-green-50 via-white to-white p-8 text-center shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-50/50 via-transparent to-transparent" />
        <div className="relative z-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-1.5">
            <Crown size={16} weight="fill" className="text-amber-500" />
            <span className="text-sm font-bold uppercase tracking-wider text-green-600">
              MENANG
            </span>
          </div>
          <h2 className="mt-3 text-3xl font-black text-stone-900">
            {winner?.name ?? 'TBD'}
          </h2>
          {loser && (
            <p className="mt-1 text-sm text-stone-500">
              mengalahkan {loser.name}
            </p>
          )}
        </div>
      </div>

      {/* Score display */}
      <div className="flex items-center justify-center gap-6 py-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium text-stone-500">{match.team_a?.name ?? 'TBD'}</span>
          <span
            className={cn(
              'text-5xl font-black tabular-nums',
              match.score_a > match.score_b ? 'text-green-500' : 'text-stone-400'
            )}
          >
            {match.score_a}
          </span>
        </div>

        <span className="text-2xl font-bold text-stone-300">-</span>

        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium text-stone-500">{match.team_b?.name ?? 'TBD'}</span>
          <span
            className={cn(
              'text-5xl font-black tabular-nums',
              match.score_b > match.score_a ? 'text-green-500' : 'text-stone-400'
            )}
          >
            {match.score_b}
          </span>
        </div>
      </div>

      {/* Game-by-game timeline */}
      {match.games && match.games.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
            Rekap Per Game
          </h3>
          <div className="space-y-2">
            {match.games.map((game) => {
              const gameWinnerIsA = game.score_a > game.score_b
              const gameWinnerName = gameWinnerIsA
                ? match.team_a?.name
                : match.team_b?.name

              return (
                <div
                  key={game.game_number}
                  className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm"
                >
                  {/* Game header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-xs font-bold text-stone-500">
                        {game.game_number}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Trophy size={12} weight="fill" className="text-amber-500" />
                          <span className="text-sm font-semibold text-stone-900">
                            {gameWinnerName ?? 'TBD'}
                          </span>
                        </div>
                        {game.map_name && (
                          <span className="text-[11px] text-stone-400">{game.map_name}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Score */}
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-lg font-bold tabular-nums',
                            game.score_a > game.score_b ? 'text-green-500' : 'text-stone-400'
                          )}
                        >
                          {game.score_a}
                        </span>
                        <span className="text-xs text-stone-300">-</span>
                        <span
                          className={cn(
                            'text-lg font-bold tabular-nums',
                            game.score_b > game.score_a ? 'text-green-500' : 'text-stone-400'
                          )}
                        >
                          {game.score_b}
                        </span>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs text-stone-400">
                        {game.duration_minutes && (
                          <div className="flex items-center gap-1">
                            <Timer size={12} />
                            <span>{game.duration_minutes}m</span>
                          </div>
                        )}
                        {game.mvp && (
                          <div className="flex items-center gap-1">
                            <User size={12} />
                            <span className="text-amber-500">{game.mvp}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hero bans */}
                  {game.hero_bans && (
                    <div className="border-t border-stone-100 px-4 py-2 flex items-center gap-4">
                      <Sword size={12} className="text-stone-400 flex-shrink-0" />
                      <div className="flex flex-1 items-center gap-6 text-[11px]">
                        <div>
                          <span className="text-stone-400">{match.team_a?.name} bans: </span>
                          <span className="text-red-500/80">
                            {game.hero_bans.team_a.join(', ') || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-400">{match.team_b?.name} bans: </span>
                          <span className="text-red-500/80">
                            {game.hero_bans.team_b.join(', ') || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Share section */}
      <div className="flex items-center justify-center pt-2">
        <ShareButton
          url={matchUrl}
          title={`${match.team_a?.name ?? 'TBD'} vs ${match.team_b?.name ?? 'TBD'}`}
          description={`Hasil: ${match.score_a}-${match.score_b}. ${winner?.name ?? ''} MENANG!`}
        />
      </div>
    </div>
  )
}
