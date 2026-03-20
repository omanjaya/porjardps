import { cn, mediaUrl } from '@/lib/utils'
import { Lightning, Trophy } from '@phosphor-icons/react'
import type { BracketMatch } from '@/types'

interface MatchScoreDisplayProps {
  match: BracketMatch
  seriesScore: { a: number; b: number }
  isLive: boolean
  isCompleted: boolean
}

export function MatchScoreDisplay({
  match,
  seriesScore,
  isLive,
  isCompleted,
}: MatchScoreDisplayProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
      {/* Teams */}
      <div className="flex items-center justify-between gap-3">
        {/* Team A */}
        <TeamDisplay
          team={match.team_a}
          isWinner={isCompleted && match.winner?.id === match.team_a?.id}
        />

        {/* VS / Score */}
        <div className="flex flex-col items-center gap-1">
          {isLive && (
            <div className="flex items-center gap-1 text-xs text-porjar-red mb-1">
              <Lightning size={12} weight="fill" className="animate-pulse" />
              <span className="font-bold uppercase tracking-wider">LIVE</span>
            </div>
          )}
          <div className="flex items-baseline gap-3">
            <span
              className={cn(
                'text-4xl font-black tabular-nums',
                isCompleted && match.winner?.id === match.team_a?.id
                  ? 'text-green-600'
                  : 'text-stone-800'
              )}
            >
              {seriesScore.a}
            </span>
            <span className="text-xl font-bold text-stone-300">:</span>
            <span
              className={cn(
                'text-4xl font-black tabular-nums',
                isCompleted && match.winner?.id === match.team_b?.id
                  ? 'text-green-600'
                  : 'text-stone-800'
              )}
            >
              {seriesScore.b}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">
            BO{match.best_of}
          </span>
        </div>

        {/* Team B */}
        <TeamDisplay
          team={match.team_b}
          isWinner={isCompleted && match.winner?.id === match.team_b?.id}
        />
      </div>

      {/* Winner banner */}
      {isCompleted && match.winner && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <Trophy size={16} weight="fill" className="text-green-600" />
          <span className="text-sm font-semibold text-green-600">
            {match.winner.name} menang!
          </span>
        </div>
      )}
    </div>
  )
}

function TeamDisplay({
  team,
  isWinner,
}: {
  team: BracketMatch['team_a']
  isWinner: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white border border-stone-200 overflow-hidden">
        {team?.logo_url ? (
          <img
            src={mediaUrl(team.logo_url)!}
            alt={team.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Trophy size={24} className="text-stone-400" />
        )}
      </div>
      <span
        className={cn(
          'text-sm font-semibold text-center truncate max-w-full',
          isWinner ? 'text-green-600' : 'text-stone-800'
        )}
        title={team?.name ?? 'TBD'}
      >
        {team?.name ?? 'TBD'}
      </span>
      {team?.seed != null && (
        <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
          Seed #{team.seed}
        </span>
      )}
    </div>
  )
}
